import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Input
from tensorflow.keras.optimizers import Adam
import joblib
import os
import json
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico

DIAS_MEMORIA_IA = 60
FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

def calcular_indicadores(df):
    close = df['Close']
    high = df['High']
    low = df['Low']
    
    # RSI
    delta = close.diff()
    ganancia = delta.where(delta > 0, 0).ewm(com=13, adjust=False).mean()
    perdida = -delta.where(delta < 0, 0).ewm(com=13, adjust=False).mean()
    rs = ganancia / perdida
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    
    # ATR (Usamos High y Low simulados si la BD no los tiene)
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)
    df['ATR'] = tr.rolling(window=14).mean()
    
    # EMAs
    df['EMA20'] = close.ewm(span=20, adjust=False).mean()
    df['EMA50'] = close.ewm(span=50, adjust=False).mean()
    
    return df.dropna()

def obtener_datos_por_empresa(db, empresa):
    """Extrae los precios históricos de UNA empresa en específico."""
    precios = db.query(PrecioHistorico).filter(
        PrecioHistorico.IdEmpresa == empresa.IdEmpresa
    ).order_by(PrecioHistorico.Fecha.asc()).all()

    if len(precios) < DIAS_MEMORIA_IA + 50:
        return None # Ignoramos la empresa si no tiene suficiente historia

    datos_formateados = []
    for p in precios:
        datos_formateados.append({
            'Fecha': p.Fecha,
            'Close': float(p.PrecioCierre),
            'Volume': int(p.Volumen),
            'High': float(p.PrecioCierre),
            'Low': float(p.PrecioCierre)
        })
        
    df = pd.DataFrame(datos_formateados)
    df.set_index('Fecha', inplace=True)
    return df

def entrenar_y_guardar():
    db = SessionLocal()
    lista_dfs = []
    
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"📥 Buscando datos para {len(empresas)} empresas activas...")
        
        # 1. Recolectar y calcular indicadores POR SEPARADO
        for empresa in empresas:
            df_empresa = obtener_datos_por_empresa(db, empresa)
            if df_empresa is not None:
                df_empresa = calcular_indicadores(df_empresa)
                lista_dfs.append(df_empresa)
            else:
                print(f"⚠️ Saltando {empresa.Ticket}: No tiene suficientes datos históricos.")
                
    finally:
        db.close()

    if not lista_dfs:
        print("❌ Error: No se encontraron datos suficientes en ninguna empresa.")
        return

    # 2. Escalar variables usando el conocimiento de TODAS las empresas combinadas
    print("⚖️ Ajustando el Scaler global...")
    df_global = pd.concat(lista_dfs)
    data_global = df_global[FEATURES].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(data_global) # El scaler ahora conoce el min y max absoluto de todo el mercado
    
    # 3. Construir Bloques LSTM (respetando los límites de cada empresa)
    print("🧩 Construyendo secuencias de entrenamiento...")
    x_train_global, y_train_global = [], []
    
    for df in lista_dfs:
        # Transformamos los datos de esta empresa específica
        scaled_data = scaler.transform(df[FEATURES].values)
        
        for i in range(DIAS_MEMORIA_IA, len(scaled_data)):
            x_train_global.append(scaled_data[i-DIAS_MEMORIA_IA:i, :])
            y_train_global.append(scaled_data[i, 0]) # Predice 'Close'
            
    x_train = np.array(x_train_global)
    y_train = np.array(y_train_global)
    
    print(f"📊 Total de secuencias generadas: {len(x_train)}")
    
    # 4. Entrenar el Modelo LSTM
    print("🧠 Entrenando red neuronal LSTM masiva...")
    model = Sequential([
        Input(shape=(x_train.shape[1], x_train.shape[2])),
        LSTM(64, return_sequences=False), # Aumentamos las neuronas porque hay más datos
        Dense(32, activation='relu'),
        Dense(1)
    ])
    
    model.compile(optimizer=Adam(0.001), loss='mse')
    
    # Usamos batch_size=64 porque ahora tenemos muchos más datos que antes
    model.fit(x_train, y_train, epochs=20, batch_size=64, verbose=1, validation_split=0.1)
    
    # 5. Guardar modelo y scaler
    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)
    
    ruta_modelo = os.path.join(ruta_modelos, 'modelo_acciones.keras')
    model.save(ruta_modelo)
    
    ruta_scaler = os.path.join(ruta_modelos, 'scaler.pkl')
    joblib.dump(scaler, ruta_scaler)
    
    print(f"✅ ¡Éxito! Modelo LSTM guardado en: {ruta_modelo}")
    print(f"✅ ¡Éxito! Scaler guardado en: {ruta_scaler}")

def guardar_metricas(y_true, y_pred): 
    metricas = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average='weighted', zero_division=0),
        "recall": recall_score(y_true, y_pred, average='weighted', zero_division=0),
        "f1-score": f1_score(y_true, y_pred, average='weighted', zero_division=0)
        #Añadir matriz de confunsion
    }
    with open("app/ml/models/metricas.json", "w") as f:
        json.dump(metricas, f)
    
    print("Metricas de evaluación credad")


if __name__ == "__main__":
    entrenar_y_guardar()