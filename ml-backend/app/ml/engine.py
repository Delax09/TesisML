import os
import numpy as np
import pandas as pd
import joblib

# 🛑 PARCHE CRÍTICO PARA EL SERVIDOR WEB (PYTHON 3.13) 🛑
import torch
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()
# --------------------------------------------------------

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3

class MLEngine:
    """Motor de Inferencia de Inteligencia Artificial para Mercado de Valores"""
    
    DIAS_MEMORIA_IA = 25 
    DIAS_PREDICCION = 5 # 👈 VARIABLE GLOBAL: Días a predecir hacia el futuro
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50', 'BB_Upper', 'BB_Lower']

    def __init__(self, version="v1", model=None, scaler=None):
        self.version = version
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.scaler = scaler
        self.model = model
        
        if self.model is None or self.scaler is None:
            self._inicializar_recursos()

    def _inicializar_recursos(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.pth")
        scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
            
            if self.version == "v1":
                self.model = ModeloLSTM_v1(len(self.FEATURES)).to(self.device)
            elif self.version == "v2":
                self.model = ModeloBidireccional_v2(len(self.FEATURES)).to(self.device)
            elif self.version == "v3":
                self.model = ModeloCNN_v3(len(self.FEATURES)).to(self.device)
                
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
            self.model.eval() 
        else:
            if self.version != "dummy":
                print(f"⚠️ Archivos para el modelo {self.version} no encontrados en .pth")

    def _preparar_tensor(self, df_ind):
        data = df_ind[self.FEATURES].values
        scaled_data = self.scaler.transform(data)
        x_test = np.array([scaled_data[-self.DIAS_MEMORIA_IA:, :]])
        return torch.tensor(x_test, dtype=torch.float32).to(self.device)

    def _desescalar_prediccion(self, prediccion_cruda):
        dummy_array = np.zeros((1, len(self.FEATURES)))
        dummy_array[0, 0] = prediccion_cruda
        return self.scaler.inverse_transform(dummy_array)[0, 0]

    @staticmethod
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
        
        sma20 = close.rolling(window=20).mean()
        std20 = close.rolling(window=20).std()
        df['BB_Upper'] = sma20 + (std20 * 2)
        df['BB_Lower'] = sma20 - (std20 * 2)
        
        return df.dropna()

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None: return None

        x_test_tensor = self._preparar_tensor(df_ind)
        
        with torch.no_grad():
            pred_reg_tensor, pred_clf_tensor = self.model(x_test_tensor)
            prediccion_cruda = pred_reg_tensor.cpu().numpy()[0][0]
            
            # 👈 APLICAMOS LA SIGMOIDE MANUALMENTE PARA OBTENER PORCENTAJE
            probabilidad_alcista = torch.sigmoid(pred_clf_tensor).cpu().numpy()[0][0]
            
            if probabilidad_alcista > 0.65: 
                recomendacion = "ALCISTA"; score = 1
            elif probabilidad_alcista < 0.35: 
                recomendacion = "BAJISTA"; score = -1
            else: 
                recomendacion = "MANTENER"; score = 0
        
        pred_real = self._desescalar_prediccion(prediccion_cruda)
        precio_actual = df_ind.iloc[-1]['Close']
        var_pct = ((pred_real - precio_actual) / precio_actual) * 100
            
        return {
            "prediccion": float(pred_real),
            "variacion": float(var_pct),
            "score": float(score),
            "recomendacion": recomendacion,
            "prob_alcista": float(probabilidad_alcista),
            "modelo": self.version,              
            "features": df_ind.iloc[-1].to_dict() 
        }