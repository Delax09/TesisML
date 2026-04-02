import os
import numpy as np
import pandas as pd

try:
    import tensorflow as tf
    import joblib
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False

# --- CONFIGURACIÓN DE GPU (Opcional, previene errores de VRAM si usas gráfica) ---
"""gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    except RuntimeError as e:
        print(f"⚠️ Error configurando GPU en Engine: {e}")"""
# ---------------------------------------------------------------------------------

class MLEngine:
    DIAS_MEMORIA_IA = 90
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

    def __init__(self, version="v1", model=None, scaler=None):
            """
            Constructor optimizado: Si recibe el modelo y el scaler, los usa directamente.
            Si no, los carga desde el disco (útil para scripts de entrenamiento).
            """
            self.version = version
            self.model = model
            self.scaler = scaler

            if not IA_AVAILABLE:
                return
            
            # Solo cargar si no se pasaron como parámetros
            if self.model is None or self.scaler is None:
                base_dir = os.path.dirname(os.path.abspath(__file__))
                model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.keras")
                scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
                
                if os.path.exists(model_path) and os.path.exists(scaler_path):
                    self.model = tf.keras.models.load_model(model_path)
                    self.scaler = joblib.load(scaler_path)
                else:
                    print(f"⚠️ Archivos para el modelo {self.version} no encontrados.")

    def calcular_indicadores(self, df):
        """
        Calcula los indicadores técnicos. Debe ser una copia exacta de la función
        en entrenamiento.py para que la IA reciba los datos como aprendió a leerlos.
        """
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

    def predecir(self, df_ind):
        """
        Toma el DataFrame con indicadores, escala los datos, hace la predicción,
        desescala el resultado y calcula el Score de recomendación.
        """
        if self.model is None or self.scaler is None:
            return None

        # 1. Preparar la secuencia de entrada (últimos 90 días)
        data = df_ind[self.FEATURES].values
        scaled_data = self.scaler.transform(data)
        
        x_test = []
        x_test.append(scaled_data[-self.DIAS_MEMORIA_IA:, :])
        x_test = np.array(x_test)
        
        # 2. Inferencia (Predicción de la IA)
        prediccion_escalada = self.model.predict(x_test, verbose=0)
        
        # 3. Desescalado para obtener el precio real en moneda
        dummy_array = np.zeros((1, len(self.FEATURES)))
        dummy_array[0, 0] = prediccion_escalada[0][0]
        pred_real = self.scaler.inverse_transform(dummy_array)[0, 0]
        
        # 4. Lógica de Negocio (Variación y Score)
        precio_actual = df_ind.iloc[-1]['Close']
        var_pct = ((pred_real - precio_actual) / precio_actual) * 100
        
        score = 0
        
        # Regla 1: Tendencia del precio predicho
        if var_pct > 1.0: 
            score += 1
        elif var_pct < -1.0: 
            score -= 1
            
        # Regla 2: Indicador de fuerza relativa (RSI)
        rsi_actual = df_ind.iloc[-1]['RSI']
        if rsi_actual < 40: 
            score += 1 # Sobrevendido (buen momento para comprar)
        elif rsi_actual > 60: 
            score -= 1 # Sobrecomprado (riesgo de caída)
            
        # Veredicto final
        if score >= 1: 
            recomendacion = "ALCISTA"
        elif score <= -1: 
            recomendacion = "BAJISTA"
        else: 
            recomendacion = "MANTENER"
            
        # Retornamos el empaquetado completo listo para ser guardado en la Base de Datos
        return {
            "prediccion": float(pred_real),
            "variacion": float(var_pct),
            "score": float(score),
            "recomendacion": recomendacion,
            "modelo": self.version,              # Etiqueta de la versión usada
            "features": df_ind.iloc[-1].to_dict() # Fotografía de los indicadores de hoy
        }