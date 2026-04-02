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
from app.services.metrica_service import MetricaService

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA

from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2

# --- CONFIGURACIÓN PARA PYTHON 3.13 ---
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()
# --------------------------------------

DIAS_MEMORIA_IA = 90
FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

MAPA_ARQUITECTURAS = {
    "v1": obtener_modelo_v1,
    "v2": obtener_modelo_v2
}

def calcular_indicadores(df):
    close = df['Close']
    high = df['High']
    low = df['Low']
    
    delta = close.diff()
    ganancia = delta.where(delta > 0, 0).ewm(com=13, adjust=False).mean()
    perdida = -delta.where(delta < 0, 0).ewm(com=13, adjust=False).mean()
    rs = ganancia / perdida
    df['RSI'] = 100 - (100 / (1 + rs))
    
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    
    prev_close = close.shift(1)
    tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
    df['ATR'] = tr.rolling(window=14).mean()
    
    df['EMA20'] = close.ewm(span=20, adjust=False).mean()
    df['EMA50'] = close.ewm(span=50, adjust=False).mean()
    
    return df.dropna()

def obtener_datos_por_empresa(db, id_empresa):
    precios = db.query(PrecioHistorico).filter(
        PrecioHistorico.IdEmpresa == id_empresa
    ).order_by(PrecioHistorico.Fecha.asc()).all()

    if len(precios) < DIAS_MEMORIA_IA + 50:
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
    return df

def procesar_una_empresa(id_empresa):
    db_thread = SessionLocal()
    try:
        df_empresa = obtener_datos_por_empresa(db_thread, id_empresa)
        if df_empresa is not None:
            return calcular_indicadores(df_empresa)
        return None
    except Exception:
        return None
    finally:
        db_thread.close()

def entrenar_y_guardar(id_modelo_especifico: int = None):
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

    print(f"⚡ Procesando en paralelo {len(ids_empresas)} empresas...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        resultados = list(tqdm(executor.map(procesar_una_empresa, ids_empresas), total=len(ids_empresas), desc="Extrayendo Datos"))

    lista_dfs = [df for df in resultados if df is not None]
    if not lista_dfs:
        return

    print("⚖️ Ajustando el Scaler global...")
    df_global = pd.concat(lista_dfs)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(df_global[FEATURES].values)
    
    print("🧩 Construyendo secuencias...")
    x_train_global, y_train_global = [], []
    for df in lista_dfs:
        scaled_data = scaler.transform(df[FEATURES].values)
        for i in range(DIAS_MEMORIA_IA, len(scaled_data)):
            x_train_global.append(scaled_data[i-DIAS_MEMORIA_IA:i, :])
            y_train_global.append(scaled_data[i, 0])
            
    x_train = np.array(x_train_global)
    y_train = np.array(y_train_global)
    
    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    # --- CONFIGURACIÓN PYTORCH ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n💻 EJECUTANDO EN: {device.type.upper()}")

    x_tensor = torch.tensor(x_train, dtype=torch.float32)
    y_tensor = torch.tensor(y_train, dtype=torch.float32).view(-1, 1)
    
    dataset = TensorDataset(x_tensor, y_tensor)
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando {modelo_db.Nombre} (v{modelo_db.Version}) en PyTorch...")
        
        funcion_arquitectura = MAPA_ARQUITECTURAS.get(modelo_db.Version)
        if not funcion_arquitectura:
            continue

        model = funcion_arquitectura(x_train.shape[1], x_train.shape[2]).to(device)
        criterion_huber = nn.HuberLoss(delta=1.0)
        criterion_mae = nn.L1Loss() 
        optimizer = optim.Adam(model.parameters(), lr=0.0005)
        
        mejor_val_loss = float('inf')
        paciencia_actual = 0
        paciencia_max = 5
        mejores_pesos = None
        
        historial = {'loss': [], 'mae': [], 'val_loss': [], 'val_mae': []}
        epochs = 25 #Epocas 

        for epoch in range(epochs):
            model.train()
            train_loss, train_mae = 0.0, 0.0
            
            # --- NUEVA BARRA DE PROGRESO ---
            # leave=False hace que la barra desaparezca al llegar al 100% para no ensuciar la consola
            loop_entrenamiento = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, unit="batch")
            
            for x_batch, y_batch in loop_entrenamiento:
                x_batch, y_batch = x_batch.to(device), y_batch.to(device)
                optimizer.zero_grad()
                
                pred = model(x_batch)
                loss = criterion_huber(pred, y_batch)
                mae = criterion_mae(pred, y_batch)
                
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                train_mae += mae.item()
                
                # Actualiza los números a la derecha de la barra en tiempo real
                loop_entrenamiento.set_postfix(loss=f"{loss.item():.4f}", mae=f"{mae.item():.4f}")
                
            train_loss /= len(train_loader)
            train_mae /= len(train_loader)
            
            # Validación
            model.eval()
            val_loss, val_mae = 0.0, 0.0
            with torch.no_grad():
                for x_val, y_val in val_loader:
                    x_val, y_val = x_val.to(device), y_val.to(device)
                    pred = model(x_val)
                    val_loss += criterion_huber(pred, y_val).item()
                    val_mae += criterion_mae(pred, y_val).item()
                    
            val_loss /= len(val_loader)
            val_mae /= len(val_loader)
            
            historial['loss'].append(train_loss)
            historial['mae'].append(train_mae)
            historial['val_loss'].append(val_loss)
            historial['val_mae'].append(val_mae)
            
            # Imprime el resumen clásico de la época una vez que la barra desaparece
            print(f"Epoch [{epoch+1}/{epochs}] - loss: {train_loss:.4f} - mae: {train_mae:.4f} - val_loss: {val_loss:.4f} - val_mae: {val_mae:.4f}")
            
            if val_loss < mejor_val_loss:
                mejor_val_loss = val_loss
                paciencia_actual = 0
                mejores_pesos = copy.deepcopy(model.state_dict())
            else:
                paciencia_actual += 1
                if paciencia_actual >= paciencia_max:
                    print(f"⏹️ EarlyStopping en la época {epoch+1}")
                    break
        
        model.load_state_dict(mejores_pesos)
        model.eval()
        
        split_idx = int(len(x_train) * 0.9)
        x_val_final = torch.tensor(x_train[split_idx:], dtype=torch.float32).to(device)
        y_val_real = y_train[split_idx:]
        
        with torch.no_grad():
            y_val_pred = model(x_val_final).cpu().numpy()

        direccion_real = (np.diff(y_val_real.flatten()) > 0).astype(int)
        direccion_pred = (np.diff(y_val_pred.flatten()) > 0).astype(int)

        acc = accuracy_score(direccion_real, direccion_pred)
        prec = precision_score(direccion_real, direccion_pred, zero_division=0)
        rec = recall_score(direccion_real, direccion_pred, zero_division=0)
        f1 = f1_score(direccion_real, direccion_pred, zero_division=0)

        mejor_idx = np.argmin(historial['val_loss'])
        metricas = {
            'loss': historial['loss'][mejor_idx],
            'mae': historial['mae'][mejor_idx],
            'val_loss': historial['val_loss'][mejor_idx],
            'val_mae': historial['val_mae'][mejor_idx],
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1
        }

        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ {modelo_db.Nombre} (.pth) guardado.")

    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("✅ Entrenamiento masivo PyTorch completado!")

if __name__ == "__main__":
    entrenar_y_guardar()