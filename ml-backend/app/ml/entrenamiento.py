import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import copy
from sklearn.preprocessing import MinMaxScaler
import joblib
import os
import concurrent.futures
from tqdm import tqdm
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# --- CONFIGURACIÓN PARA PYTHON 3.13 ---
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()
# --------------------------------------

from app.services.metrica_service import MetricaService
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA

# 🔗 ENLACE CON EL ENGINE: Reutilizamos variables y funciones para evitar duplicación
from app.ml.engine import MLEngine
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2

MAPA_ARQUITECTURAS = {
    "v1": obtener_modelo_v1,
    "v2": obtener_modelo_v2
}

class EarlyStopping:
    def __init__(self, paciencia=5, delta=0):
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.mejor_loss = None
        self.detener = False
        self.mejores_pesos = None

    def __call__(self, val_loss, modelo):
        if self.mejor_loss is None:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
        elif val_loss > self.mejor_loss - self.delta:
            self.contador += 1
            if self.contador >= self.paciencia:
                self.detener = True
        else:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0

# =====================================================================
# --- FUNCIONES MODULARES ---
# =====================================================================

def extraer_y_procesar_empresa(id_empresa):
    """Obtiene los precios de la BD y calcula los indicadores usando MLEngine"""
    db_thread = SessionLocal()
    try:
        precios = db_thread.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(precios) < MLEngine.DIAS_MEMORIA_IA + 50:
            return None

        datos_formateados = [{
            'Fecha': p.Fecha,
            'Close': float(p.PrecioCierre),
            'Volume': int(p.Volumen),
            'High': float(p.PrecioCierre),
            'Low': float(p.PrecioCierre)
        } for p in precios]
            
        df = pd.DataFrame(datos_formateados)
        df.set_index('Fecha', inplace=True)
        
        # Delegamos las matemáticas de los indicadores al motor web
        return MLEngine.calcular_indicadores(df)
    except Exception:
        return None
    finally:
        db_thread.close()

def preparar_datos_masivos(lista_dfs):
    """Junta todos los dataframes, aplica el Scaler y construye los tensores"""
    df_global = pd.concat(lista_dfs)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(df_global[MLEngine.FEATURES].values)
    
    x_train_global, y_train_global = [], []
    for df in lista_dfs:
        scaled_data = scaler.transform(df[MLEngine.FEATURES].values)
        for i in range(MLEngine.DIAS_MEMORIA_IA, len(scaled_data)):
            x_train_global.append(scaled_data[i-MLEngine.DIAS_MEMORIA_IA:i, :])
            y_train_global.append(scaled_data[i, 0])
            
    return np.array(x_train_global), np.array(y_train_global), scaler

def crear_dataloaders(x_train, y_train):
    """Crea los lotes de datos de PyTorch (Train/Val) y reserva RAM para la GPU"""
    x_tensor = torch.tensor(x_train, dtype=torch.float32)
    y_tensor = torch.tensor(y_train, dtype=torch.float32).view(-1, 1)
    
    split_idx = int(0.9 * len(x_tensor))
    train_dataset = TensorDataset(x_tensor[:split_idx], y_tensor[:split_idx])
    val_dataset = TensorDataset(x_tensor[split_idx:], y_tensor[split_idx:])
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True, pin_memory=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=128, shuffle=False, pin_memory=True)
    
    return train_loader, val_loader, x_tensor, y_tensor, split_idx

def ejecutar_entrenamiento_pytorch(model, train_loader, val_loader, device, epochs=25):
    """Ejecuta el bucle de optimización matemática de la red neuronal"""
    criterion_huber = nn.HuberLoss(delta=1.0)
    criterion_mae = nn.L1Loss() 
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    early_stopping = EarlyStopping(paciencia=5, delta=0.0)
    
    historial = {'loss': [], 'mae': [], 'val_loss': [], 'val_mae': []}

    for epoch in range(epochs):
        model.train()
        train_loss, train_mae = 0.0, 0.0
        loop_entrenamiento = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, unit="batch")
        
        for x_batch, y_batch in loop_entrenamiento:
            x_batch, y_batch = x_batch.to(device, non_blocking=True), y_batch.to(device, non_blocking=True)
            optimizer.zero_grad()
            
            pred = model(x_batch)
            loss = criterion_huber(pred, y_batch)
            mae = criterion_mae(pred, y_batch)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            train_mae += mae.item()
            loop_entrenamiento.set_postfix(loss=f"{loss.item():.4f}", mae=f"{mae.item():.4f}")
            
        train_loss /= len(train_loader)
        train_mae /= len(train_loader)
        
        # Validación
        model.eval()
        val_loss, val_mae = 0.0, 0.0
        with torch.no_grad():
            for x_val, y_val in val_loader:
                x_val, y_val = x_val.to(device, non_blocking=True), y_val.to(device, non_blocking=True)
                pred = model(x_val)
                val_loss += criterion_huber(pred, y_val).item()
                val_mae += criterion_mae(pred, y_val).item()
                
        val_loss /= len(val_loader)
        val_mae /= len(val_loader)
        
        historial['loss'].append(train_loss)
        historial['mae'].append(train_mae)
        historial['val_loss'].append(val_loss)
        historial['val_mae'].append(val_mae)
        
        print(f"Epoch [{epoch+1}/{epochs}] - loss: {train_loss:.4f} - mae: {train_mae:.4f} - val_loss: {val_loss:.4f} - val_mae: {val_mae:.4f}")
        
        early_stopping(val_loss, model)
        if early_stopping.detener:
            print(f"⏹️ EarlyStopping accionado: El modelo dejó de aprender en la época {epoch+1}")
            break
            
    return historial, early_stopping.mejores_pesos

def calcular_metricas_clasificacion(model, x_tensor, y_train, split_idx, historial, device):
    """Convierte las proyecciones en vectores binarios para evaluar Precision y F1-Score"""
    x_val_final = x_tensor[split_idx:]
    y_val_real = y_train[split_idx:]
    
    y_val_pred_list = []
    lote_evaluacion = 128 
    
    with torch.no_grad():
        for i in range(0, len(x_val_final), lote_evaluacion):
            x_batch = x_val_final[i:i+lote_evaluacion].to(device)
            pred = model(x_batch).cpu().numpy()
            y_val_pred_list.append(pred)

    y_val_pred = np.vstack(y_val_pred_list)

    direccion_real = (np.diff(y_val_real.flatten()) > 0).astype(int)
    direccion_pred = (np.diff(y_val_pred.flatten()) > 0).astype(int)

    acc = accuracy_score(direccion_real, direccion_pred)
    prec = precision_score(direccion_real, direccion_pred, zero_division=0)
    rec = recall_score(direccion_real, direccion_pred, zero_division=0)
    f1 = f1_score(direccion_real, direccion_pred, zero_division=0)

    mejor_idx = np.argmin(historial['val_loss'])
    return {
        'loss': float(historial['loss'][mejor_idx]),
        'mae': float(historial['mae'][mejor_idx]),
        'val_loss': float(historial['val_loss'][mejor_idx]),
        'val_mae': float(historial['val_mae'][mejor_idx]),
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1)
    }

# =====================================================================
# --- ORQUESTADOR PRINCIPAL ---
# =====================================================================

def entrenar_y_guardar(id_modelo_especifico: int = None):
    """Orquestador que coordina el flujo de trabajo de Machine Learning"""
    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        query_modelos = db.query(ModeloIA).filter(ModeloIA.Activo==True)
        if id_modelo_especifico: 
            query_modelos = query_modelos.filter(ModeloIA.IdModelo == id_modelo_especifico)
        modelos_activos = query_modelos.all()
    finally:
        db.close()

    if not ids_empresas or not modelos_activos:
        print("⚠️ Faltan empresas o modelos activos.")
        return

    # 1. Extracción y Limpieza Multihilo
    print(f"⚡ Procesando en paralelo {len(ids_empresas)} empresas...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        resultados = list(tqdm(executor.map(extraer_y_procesar_empresa, ids_empresas), total=len(ids_empresas), desc="Extrayendo Datos"))

    lista_dfs = [df for df in resultados if df is not None]
    if not lista_dfs: return

    # 2. Transformación y Construcción de Lotes
    print("⚖️ Ajustando Scaler y construyendo secuencias...")
    x_train, y_train, scaler = preparar_datos_masivos(lista_dfs)
    train_loader, val_loader, x_tensor, y_tensor, split_idx = crear_dataloaders(x_train, y_train)

    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n💻 ACELERADOR DE HARDWARE: {device.type.upper()}")

    # 3. Entrenamiento Cíclico de Modelos Activos
    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando {modelo_db.Nombre} (v{modelo_db.Version}) en PyTorch...")
        funcion_arquitectura = MAPA_ARQUITECTURAS.get(modelo_db.Version)
        if not funcion_arquitectura: continue

        model = funcion_arquitectura(x_train.shape[1], x_train.shape[2]).to(device)
        
        historial, mejores_pesos = ejecutar_entrenamiento_pytorch(model, train_loader, val_loader, device)
        
        # 4. Evaluación de Métricas de Negocio
        model.load_state_dict(mejores_pesos)
        model.eval()
        metricas = calcular_metricas_clasificacion(model, x_tensor, y_train, split_idx, historial, device)

        # 5. Persistencia
        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ {modelo_db.Nombre} (.pth) guardado.")

    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("✅ ¡Entrenamiento masivo completado con éxito!")

if __name__ == "__main__":
    entrenar_y_guardar()