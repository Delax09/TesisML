import os
import numpy as np
import pandas as pd
import torch
import joblib

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2

try:
    import tensorflow as tf
    import joblib
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False

class MLEngine:
    DIAS_MEMORIA_IA = 90
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

    def __init__(self, version="v1", model=None, scaler=None):
        self.version = version
        self.model = model
        self.scaler = scaler
        
        # Detector automático de Hardware (NVIDIA CUDA o Procesador)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        if self.model is None or self.scaler is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            # Cambiamos la extensión a .pth
            model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.pth")
            scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                
                # Instanciar arquitectura
                if self.version == "v1":
                    self.model = ModeloLSTM_v1(len(self.FEATURES)).to(self.device)
                else:
                    self.model = ModeloBidireccional_v2(len(self.FEATURES)).to(self.device)
                
                # Cargar pesos
                self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
                self.model.eval() # Congelar Dropout para predicciones
            else:
                if self.version != "dummy":
                    print(f"⚠️ Archivos para el modelo {self.version} no encontrados en .pth")

    def calcular_indicadores(self, df):
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

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None:
            return None

        data = df_ind[self.FEATURES].values
        scaled_data = self.scaler.transform(data)
        
        x_test = np.array([scaled_data[-self.DIAS_MEMORIA_IA:, :]])
        
        # Predicción usando PyTorch
        x_test_tensor = torch.tensor(x_test, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            pred_tensor = self.model(x_test_tensor)
            prediccion_escalada = pred_tensor.cpu().numpy()
        
        dummy_array = np.zeros((1, len(self.FEATURES)))
        dummy_array[0, 0] = prediccion_escalada[0][0]
        pred_real = self.scaler.inverse_transform(dummy_array)[0, 0]
        
        precio_actual = df_ind.iloc[-1]['Close']
        var_pct = ((pred_real - precio_actual) / precio_actual) * 100
        
        score = 0
        if var_pct > 1.0: score += 1
        elif var_pct < -1.0: score -= 1
            
        rsi_actual = df_ind.iloc[-1]['RSI']
        if rsi_actual < 40: score += 1 
        elif rsi_actual > 60: score -= 1 
            
        if score >= 1: recomendacion = "ALCISTA"
        elif score <= -1: recomendacion = "BAJISTA"
        else: recomendacion = "MANTENER"
            
        return {
            "prediccion": float(pred_real),
            "variacion": float(var_pct),
            "score": float(score),
            "recomendacion": recomendacion,
            "modelo": self.version,              
            "features": df_ind.iloc[-1].to_dict() 
        }