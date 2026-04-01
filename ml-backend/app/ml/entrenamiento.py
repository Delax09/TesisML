import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.losses import Huber
from tensorflow.keras.callbacks import EarlyStopping
from tqdm.keras import TqdmCallback # <-- NUEVO: Barra de progreso elegante para Keras
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

# Importamos las arquitecturas separadas físicamente
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2

DIAS_MEMORIA_IA = 90
FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

# Diccionario que conecta el texto de la BD con la función de Python
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
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)
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

    if not ids_empresas:
        print("❌ Error: No hay empresas activas.")
        return
        
    if not modelos_activos:
        print("⚠️ No hay modelos de IA activos en la base de datos. Abortando.")
        return

    print(f"⚡ Procesando en paralelo {len(ids_empresas)} empresas...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        resultados = list(tqdm(executor.map(procesar_una_empresa, ids_empresas), total=len(ids_empresas), desc="Extrayendo Datos"))

    lista_dfs = [df for df in resultados if df is not None]

    if not lista_dfs:
        print("❌ Error: Ninguna empresa tenía datos suficientes.")
        return

    print("⚖️ Ajustando el Scaler global...")
    df_global = pd.concat(lista_dfs)
    data_global = df_global[FEATURES].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(data_global)
    
    print("🧩 Construyendo secuencias de entrenamiento...")
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

    # Entrenamiento Dinámico basado en la Base de Datos
    for modelo_db in modelos_activos:
        print(f"\n🚀 Iniciando entrenamiento de {modelo_db.Nombre} (Versión {modelo_db.Version})...")
        
        funcion_arquitectura = MAPA_ARQUITECTURAS.get(modelo_db.Version)
        if not funcion_arquitectura:
            print(f"⚠️ No hay archivo de arquitectura físico para la versión {modelo_db.Version}. Saltando...")
            continue

        model = funcion_arquitectura(x_train.shape[1], x_train.shape[2])
        
        model.compile(
            optimizer=Adam(learning_rate=0.0005), 
            loss=Huber(delta=1.0), 
            metrics=['mae']
        )
        
        early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
        # Añadimos la barra visual a los callbacks
        
        historial = model.fit(
            x_train, y_train, 
            epochs=25, 
            batch_size=64, 
            verbose=0,
            validation_split=0.1, 
            callbacks=[early_stopping]
        )
        
        #-------METRICAS DE EVALUACION -------
        split_idx = int(len(x_train) * 0.9)
        x_val = x_train[split_idx:]
        y_val_real = y_train[split_idx:]

        y_val_pred = model.predict(x_val, verbose=0)

        if len(y_val_pred.shape) == 3:
            print("⚠️ Aviso: El modelo retornó secuencias 3D. Aplanando automáticamente...")
            y_val_pred = y_val_pred[:, -1, 0]
        
        direccion_real = (np.diff(y_val_real.flatten()) > 0).astype(int)
        direccion_pred = (np.diff(y_val_pred.flatten()) > 0).astype(int)

        acc = accuracy_score(direccion_real, direccion_pred)
        prec = precision_score(direccion_real, direccion_pred, zero_division=0)
        rec = recall_score(direccion_real, direccion_pred, zero_division=0)
        f1 = f1_score(direccion_real, direccion_pred, zero_division=0)

        metricas_finales = {
            'loss': historial.history['loss'][-1],
            'mae': historial.history['mae'][-1],
            'val_loss': historial.history['val_loss'][-1],
            'val_mae': historial.history['val_mae'][-1],
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1
        }

        # Conectamos localmente a la BD para no perder la sesión durante entrenamientos largos
        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas_finales)
        finally:
            db_local.close()

        ruta_modelo = os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.keras')
        model.save(ruta_modelo)
        print(f"✅ Modelo {modelo_db.Nombre} guardado exitosamente.")

    # Guardar scaler global
    ruta_scaler = os.path.join(ruta_modelos, 'scaler.pkl')
    joblib.dump(scaler, ruta_scaler)
    print("✅ ¡Entrenamiento masivo completado con éxito!")

if __name__ == "__main__":
    entrenar_y_guardar()