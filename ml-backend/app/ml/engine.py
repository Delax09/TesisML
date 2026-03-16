import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
import os
from app.models.precio_historico import PrecioHistorico

class MLEngine:
    DIAS_MEMORIA_IA = 60
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "models", "modelo_acciones.keras")
        scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
        
        self.model = None
        self.scaler = None
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.model = tf.keras.models.load_model(model_path)
            self.scaler = joblib.load(scaler_path)
        else:
            print("⚠️ Modelos no encontrados. Ejecuta app/ml/entrenamiento.py primero.")

    def calcular_indicadores(self, df):
        # Hacemos una copia para no alterar el original
        df = df.copy()
        
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
        
        # ATR 
        prev_close = close.shift(1)
        tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
        df['ATR'] = tr.rolling(window=14).mean()
        
        # EMAs
        df['EMA20'] = close.ewm(span=20, adjust=False).mean()
        df['EMA50'] = close.ewm(span=50, adjust=False).mean()
        
        return df.dropna()

    def analizar_empresa(self, db, id_empresa):
        """
        MÉTODO PUENTE: Conecta la base de datos con la lógica de predicción.
        """
        query = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(query) < 80:
            return None

        df = pd.DataFrame([
            {
                'Date': p.Fecha,
                'Close': float(p.PrecioCierre),
                'Volume': int(p.Volumen),
                'High': float(p.PrecioCierre) * 1.01,
                'Low': float(p.PrecioCierre) * 0.99  
            } for p in query
        ])
        df.set_index('Date', inplace=True)
        
        # Calculamos indicadores ANTES de predecir
        df_ind = self.calcular_indicadores(df)
        
        if len(df_ind) < self.DIAS_MEMORIA_IA:
            return None

        resultado_ia = self.predecir(df_ind)
        
        if not resultado_ia:
            return None

        return {
            "PrediccionIA": resultado_ia["prediccion"],
            "RSI": float(resultado_ia["features"]["RSI"]),
            "Score": resultado_ia["score"],
            "Recomendacion": resultado_ia["recomendacion"]
        }

    def predecir(self, df_ind):
        """
        Recibe un DataFrame con los indicadores ya calculados.
        """
        if self.model is None or self.scaler is None:
            raise Exception("El motor de IA no tiene un modelo cargado.")

        # 2. Tomar exactamente el último bloque de 60 días
        data = df_ind[self.FEATURES].values[-self.DIAS_MEMORIA_IA:]
        
        # 3. Escalar
        scaled_data = self.scaler.transform(data)
        X_pred = scaled_data.reshape(1, self.DIAS_MEMORIA_IA, len(self.FEATURES))
        
        # 4. Inferencia (La IA nos devuelve un número entre 0 y 1)
        pred_scaled = self.model.predict(X_pred, verbose=0)
        
        # 5. Desescalado MATEMÁTICAMENTE CORRECTO
        # Creamos un array ficticio (dummy) con ceros del tamaño de nuestras FEATURES (7 columnas)
        # porque el scaler espera 7 columnas para desescalar.
        dummy_array = np.zeros((1, len(self.FEATURES)))
        # Ponemos la predicción de la IA en la primera columna (Close), que es la que nos importa
        dummy_array[0, 0] = pred_scaled[0][0]
        # Desescalamos toda la matriz y extraemos el valor real de la columna 'Close'
        pred_real = self.scaler.inverse_transform(dummy_array)[0, 0]
        
        # 6. Cálculo de lógica de negocio
        precio_actual = df_ind['Close'].iloc[-1]
        var_pct = ((pred_real - precio_actual) / precio_actual) * 100
        
        rsi_actual = df_ind['RSI'].iloc[-1]
        score = 0
        if abs(var_pct) > 1.5: score += 2 if var_pct > 0 else -2
        if rsi_actual < 35: score += 2
        if rsi_actual > 70: score -= 2

        recomendacion = "ALCISTA" if score >= 2 else "BAJISTA" if score <= -2 else "Sin señal"
        
        return {
            "prediccion": float(pred_real),
            "variacion": float(var_pct),
            "score": float(score),
            "recomendacion": recomendacion,
            "features": df_ind.iloc[-1] 
        }