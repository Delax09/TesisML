import numpy as np
import pandas as pd
import yfinance as yf
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Dropout, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import os
import warnings
import logging
import gc


"""def conectar_base_datos():
    # Datos para la conexion del servidor SQL
    servidor = 'VictusFabian'
    base_datos = "AnalisisAcciones"
    usuario = ''
    password = ''
    # Conexion
    connection_bd = f"mssql+pyodbc://{usuario}:{password}@{servidor}/{base_datos}?driver=ODBC+Driver+17+for+SQL+Server"
    engine = create_engine(connection_bd)
    con = engine.connect()
    return con"""


# 1. CONFIGURACIÓN
# -----------------------------------------------------------------------------
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
logging.getLogger('tensorflow').setLevel(logging.ERROR)
warnings.filterwarnings("ignore")

DIAS_MEMORIA_IA = 60
PORTAFOLIO = [
    'MSFT', 'AAPL', 'TSLA', 'AMZN', 'GOOGL', 'NVDA', 'META', 'NFLX', 'INTC', 'AMD', 'KO',
    'JPM', 'V', 'JNJ', 'UNH', 'PG', 'WMT', 'XOM', 'CAT', 'DIS', 'SPY'
]

NOMBRES = {
    'MSFT': 'Microsoft', 
    'AAPL': 'Apple', 
    'TSLA': 'Tesla', 
    'AMZN': 'Amazon',
    'GOOGL': 'Google', 
    'NVDA': 'NVIDIA', 
    'META': 'Meta', 
    'NFLX': 'Netflix',
    'INTC': 'Intel', 
    'AMD': 'AMD', 
    'KO': 'Coca-Cola',
    'JPM': 'JPMorgan', 
    'V': 'Visa', 
    'JNJ': 'Johnson & Johnson', 
    'UNH': 'UnitedHealth', 
    'PG': 'Procter & Gamble', 
    'WMT': 'Walmart', 
    'XOM': 'Exxon Mobil', 
    'CAT': 'Caterpillar', 
    'DIS': 'Disney', 
    'SPY': 'S&P 500 ETF (SPY)'
}

# 2. OPTIMIZACIÓN: CÁLCULO VECTORIZADO DE INDICADORES
# -----------------------------------------------------------------------------
def CalcularIndicadoresMasivos(datos):
    """Calcula RSI y SMA para todo el dataframe multi-index de una sola vez."""
    close = datos.xs('Close', level=1, axis=1)
    
    # RSI Vectorizado
    delta = close.diff()
    ganancia = delta.where(delta > 0, 0).ewm(com=13, adjust=False).mean()
    perdida = -delta.where(delta < 0, 0).ewm(com=13, adjust=False).mean()
    rs = ganancia / perdida
    rsi = 100 - (100 / (1 + rs))
    
    # SMA 200 Vectorizado
    sma200 = close.rolling(window=200).mean()
    rsi_signal = rsi.rolling(window=14).mean()
    
    return rsi, rsi_signal, sma200

# 3. OPTIMIZACIÓN: FUNDAMENTALES EN PARALELO (I/O BOUND)
# -----------------------------------------------------------------------------
def ObtenerPE(ticker):
    """Hilos para evitar que la red bloquee el entrenamiento."""
    try:
        info = yf.Ticker(ticker).info
        return ticker, info.get('trailingPE', 999) or 999
    except:
        return ticker, 999

# 4. MOTOR IA (MULTIVARIANTE)
# -----------------------------------------------------------------------------
def EntrenarPredecir(df_ticker):
    """Entrena la IA usando datos pre-calculados."""
    try:
        with tf.device('/CPU:0'):
            # Usamos Close, Volume y el RSI que ya viene calculado
            features = ['Close', 'Volume', 'RSI']
            data = df_ticker[features].values
            
            if len(data) < DIAS_MEMORIA_IA + 20: return None, None

            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_data = scaler.fit_transform(data)

            x_train, y_train = [], []
            for i in range(DIAS_MEMORIA_IA, len(scaled_data)):
                x_train.append(scaled_data[i-DIAS_MEMORIA_IA:i, :])
                y_train.append(scaled_data[i, 0])

            x_train, y_train = np.array(x_train), np.array(y_train)

            # Reducimos complejidad para ganar velocidad sin perder mucha precisión
            model = Sequential([
                Input(shape=(x_train.shape[1], x_train.shape[2])),
                LSTM(32, return_sequences=False), # Una sola capa potente es más rápida
                Dropout(0.1),
                Dense(16),
                Dense(1)
            ])

            model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
            # EarlyStopping agresivo para ahorrar tiempo
            monitor = EarlyStopping(monitor='loss', patience=3, restore_best_weights=True)
            
            model.fit(x_train, y_train, batch_size=64, epochs=30, callbacks=[monitor], verbose=0)

            ultimo_bloque = scaled_data[-DIAS_MEMORIA_IA:].reshape(1, DIAS_MEMORIA_IA, 3)
            pred_scaled = model.predict(ultimo_bloque, verbose=0)
            
            # Inversión rápida
            pred_final = pred_scaled[0,0] * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
            
            precio_hoy = df_ticker['Close'].iloc[-1]
            var_pct = ((pred_final - precio_hoy) / precio_hoy) * 100
            
            tf.keras.backend.clear_session()
            gc.collect()
            return var_pct, precio_hoy
    except:
        return None, None

# 5. TAREA PARA EL WORKER
# -----------------------------------------------------------------------------
def TareaWorker(ticker, df_ticker, pe):
    res_ia, precio = EntrenarPredecir(df_ticker)
    if res_ia is None: return None
    
    hoy = df_ticker.iloc[-1]
    ayer = df_ticker.iloc[-2]
    
    # Diagnóstico técnico rápido (ya calculado)
    rsi = hoy['RSI']
    diag = "NEUTRAL"
    if rsi > 70: diag = "VENTA"
    elif rsi < 35: diag = "COMPRA"
    
    # Veredicto
    score = 0
    if var_ia := res_ia:
        if var_ia > 1.5: score += 2
        if var_ia < -1.5: score -= 2
    if rsi < 35: score += 2
    if pe > 100: score -= 2

    return {
        'Ticker': NOMBRES.get(ticker, ticker),
        'Precio': round(precio, 2),
        'RSI': round(rsi, 1),
        'IA': f"{res_ia:+.2f}%",
        'Técnico': diag,
        'RECOMENDACIÓN': "COMPRA" if score >= 2 else "VENTA" if score <= -2 else "NEUTRAL",
        'Score': score
    }

# 6. EJECUCIÓN MAESTRA
# -----------------------------------------------------------------------------
def Prediccion():
    print("INICIANDO SCANNER")
    
    # 1. Paralelismo de Red: Descarga e Info simultáneos
    with ThreadPoolExecutor() as threads:
        print("Descargando datos y fundamentales...")
        f_datos = threads.submit(yf.download, PORTAFOLIO, period='3y', interval='1d', group_by='ticker', progress=False, auto_adjust=True)
        f_pe = {ticker: threads.submit(ObtenerPE, ticker) for ticker in PORTAFOLIO}
        
        datos = f_datos.result()
        pe_dict = {f.result()[0]: f.result()[1] for f in f_pe.values()}

    # 2. Vectorización: Calculamos indicadores para todos de una vez
    print("Calculando indicadores vectorizados...")
    rsi_all, rsi_sig_all, sma_all = CalcularIndicadoresMasivos(datos)

    # 3. Paralelismo de CPU: Procesamiento de IA
    print(f"Entrenando modelos en paralelo (2 workers)...")
    informe = []
    with ProcessPoolExecutor(max_workers=2) as executor:
        tareas = []
        for ticker in PORTAFOLIO:
            df_t = datos[ticker].copy().dropna()
            # Añadimos indicadores ya calculados
            df_t['RSI'] = rsi_all[ticker]
            df_t['RSI_Signal'] = rsi_sig_all[ticker]
            df_t['SMA_200'] = sma_all[ticker]
            df_t = df_t.dropna()
            
            tareas.append(executor.submit(TareaWorker, ticker, df_t, pe_dict[ticker]))
        
        for f in tareas:
            res = f.result()
            if res: informe.append(res)

    # Mostrar Resultados
    df = pd.DataFrame(informe).sort_values(by='Score', ascending=False)
    print("Informe Final:")
    print("\n" + "="*100)
    print(df.drop(columns=['Score']).to_string(index=False))

if __name__ == "__main__":
    Prediccion()