import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
import joblib
import os
import json
import concurrent.futures
from tqdm import tqdm
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico

DIAS_MEMORIA_IA = 90
FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

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

def entrenar_y_guardar():
    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]
    finally:
        db.close()

    if not ids_empresas:
        print("❌ Error: No hay empresas activas.")
        return

    print(f"⚡ Procesando en paralelo {len(ids_empresas)} empresas...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        resultados = list(tqdm(executor.map(procesar_una_empresa, ids_empresas), total=len(ids_empresas), desc="Procesando Datos"))

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
    
    print(f"📊 Total de secuencias generadas: {len(x_train)}")
    
    print("🧠 Entrenando red neuronal LSTM masiva...")
    model = Sequential([
        Input(shape=(x_train.shape[1], x_train.shape[2])),
        LSTM(64, return_sequences=False),
        Dense(32, activation='relu'),
        Dense(1)
    ])
    
    model.compile(optimizer=Adam(0.001), loss='mse')
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience = 5,
        restore_best_weights=True
    )
    model.fit(x_train, 
            y_train, 
            epochs=100, 
            batch_size=64, 
            verbose=1, 
            validation_split=0.1, 
            callbacks=[early_stopping])
    
    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)
    
    ruta_modelo = os.path.join(ruta_modelos, 'modelo_acciones.keras')
    model.save(ruta_modelo)
    
    ruta_scaler = os.path.join(ruta_modelos, 'scaler.pkl')
    joblib.dump(scaler, ruta_scaler)
    
    print(f"✅ Modelo guardado en: {ruta_modelo}")
    print(f"✅ Scaler guardado en: {ruta_scaler}")

def guardar_metricas(y_true, y_pred): 
    metricas = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average='weighted', zero_division=0),
        "recall": recall_score(y_true, y_pred, average='weighted', zero_division=0),
        "f1-score": f1_score(y_true, y_pred, average='weighted', zero_division=0)
    }
    
    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)
    
    with open(os.path.join(ruta_modelos, "metricas.json"), "w") as f:
        json.dump(metricas, f)
    
    print("✅ Métricas de evaluación creadas")

if __name__ == "__main__":
    entrenar_y_guardar()