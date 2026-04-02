import os
import numpy as np
import pandas as pd
import torch
import joblib

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2

class MLEngine:
    """Motor de Inferencia de Inteligencia Artificial para Mercado de Valores"""
    
    DIAS_MEMORIA_IA = 90
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50']

    def __init__(self, version="v1", model=None, scaler=None):
        self.version = version
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.scaler = scaler
        self.model = model
        
        # Si no se pasan en memoria, los cargamos desde el disco duro
        if self.model is None or self.scaler is None:
            self._inicializar_recursos()

    # ==========================================
    # MÉTODOS PRIVADOS (Lógica interna)
    # ==========================================

    def _inicializar_recursos(self):
        """Carga el Scaler y los pesos de la red neuronal (.pth) desde el disco duro"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.pth")
        scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
            
            # Instanciar la arquitectura correcta
            if self.version == "v1":
                self.model = ModeloLSTM_v1(len(self.FEATURES)).to(self.device)
            else:
                self.model = ModeloBidireccional_v2(len(self.FEATURES)).to(self.device)
            
            # Cargar los pesos entrenados
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
            self.model.eval() # Activar modo inferencia (congela Dropouts)
        else:
            if self.version != "dummy":
                print(f"⚠️ Archivos para el modelo {self.version} no encontrados en .pth")

    def _preparar_tensor(self, df_ind):
        """Transforma el DataFrame al formato tensorial escalado que espera PyTorch"""
        data = df_ind[self.FEATURES].values
        scaled_data = self.scaler.transform(data)
        x_test = np.array([scaled_data[-self.DIAS_MEMORIA_IA:, :]])
        return torch.tensor(x_test, dtype=torch.float32).to(self.device)

    def _desescalar_prediccion(self, prediccion_cruda):
        """Convierte la salida de la IA (rango 0-1) al precio real del mercado"""
        dummy_array = np.zeros((1, len(self.FEATURES)))
        dummy_array[0, 0] = prediccion_cruda
        return self.scaler.inverse_transform(dummy_array)[0, 0]

    def _generar_analisis_negocio(self, precio_actual, pred_real, rsi_actual):
        """Aplica las reglas financieras para determinar el Score y la Recomendación"""
        var_pct = ((pred_real - precio_actual) / precio_actual) * 100
        
        score = 0
        if var_pct > 1.0: score += 1
        elif var_pct < -1.0: score -= 1
            
        if rsi_actual < 40: score += 1 
        elif rsi_actual > 60: score -= 1 
            
        if score >= 1: recomendacion = "ALCISTA"
        elif score <= -1: recomendacion = "BAJISTA"
        else: recomendacion = "MANTENER"

        return float(var_pct), float(score), recomendacion

    # ==========================================
    # MÉTODOS PÚBLICOS (API de la clase)
    # ==========================================

    @staticmethod
    def calcular_indicadores(df):
        """Calcula los indicadores técnicos matemáticos requeridos como features"""
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
        """
        Orquesta el flujo completo: preprocesamiento, inferencia y análisis de negocio.
        Retorna el diccionario con la predicción final.
        """
        if self.model is None or self.scaler is None:
            return None

        # 1. Preparación de datos
        x_test_tensor = self._preparar_tensor(df_ind)
        
        # 2. Inferencia pura en la GPU/CPU
        with torch.no_grad():
            pred_tensor = self.model(x_test_tensor)
            prediccion_cruda = pred_tensor.cpu().numpy()[0][0]
        
        # 3. Post-procesamiento matemático
        pred_real = self._desescalar_prediccion(prediccion_cruda)
        
        # 4. Evaluación de reglas de negocio
        precio_actual = df_ind.iloc[-1]['Close']
        rsi_actual = df_ind.iloc[-1]['RSI']
        var_pct, score, recomendacion = self._generar_analisis_negocio(precio_actual, pred_real, rsi_actual)
            
        # 5. Formateo de respuesta
        return {
            "prediccion": float(pred_real),
            "variacion": var_pct,
            "score": score,
            "recomendacion": recomendacion,
            "modelo": self.version,              
            "features": df_ind.iloc[-1].to_dict() 
        }