import os
import numpy as np
import pandas as pd
import joblib
import logging

import torch

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3

class MLEngine:
    """Motor de Inferencia de Inteligencia Artificial para Mercado de Valores"""
    
    DIAS_MEMORIA_IA = 25 # Memoria reducida para evitar ruido y adivinanzas a largo plazo
    FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50', 'BB_Upper', 'BB_Lower']  # ❌ REMOVIDO: 'Beta'

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

    @classmethod
    def _obtener_cache_path(cls):
        """Ya no se usa - Beta removido"""
        return None

    @classmethod
    def _cargar_cache(cls):
        """Ya no se usa - Beta removido"""
        return None

    @classmethod
    def _guardar_cache(cls, market_returns):
        """Ya no se usa - Beta removido"""
        pass

    @classmethod
    def _descargar_sp500_con_timeout(cls, timeout_segundos=10):
        """Ya no se usa - Beta removido"""
        return None

    @classmethod
    def inicializar_mercado(cls):
        """Ya no se descarga mercado - Beta removido por performance"""
        print("🚀 Inicialización de mercado omitida (Beta removido)")
        cls._market_returns = None  # No se usa más

    def _inicializar_recursos(self):
        """Carga el Scaler y los pesos de la red neuronal (.pth) desde el disco duro"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.pth")
        scaler_path = os.path.join(base_dir, "models", "scaler.pkl")
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
            
            # Instanciar la arquitectura correcta según la versión
            if self.version == "v1":
                self.model = ModeloLSTM_v1(len(self.FEATURES)).to(self.device)
            elif self.version == "v2":
                self.model = ModeloBidireccional_v2(len(self.FEATURES)).to(self.device)
            elif self.version == "v3":
                self.model = ModeloCNN_v3(len(self.FEATURES)).to(self.device)
                
            # Cargar los pesos entrenados
            try:
                state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
                # Manejar pesos guardados con torch.compile (tienen prefijo _orig_mod)
                if any(key.startswith('_orig_mod.') for key in state_dict.keys()):
                    state_dict = {k.replace('_orig_mod.', ''): v for k, v in state_dict.items()}
                self.model.load_state_dict(state_dict)
                self.model.eval() # Activar modo inferencia (congela Dropouts)
                print(f"✅ Modelo {self.version} cargado exitosamente")
            except Exception as e:
                print(f"❌ Error cargando modelo {self.version}: {e}")
                self.model = None
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
        
        # BANDAS DE BOLLINGER
        sma20 = close.rolling(window=20).mean()
        std20 = close.rolling(window=20).std()
        df['BB_Upper'] = sma20 + (std20 * 2)
        df['BB_Lower'] = sma20 - (std20 * 2)

        # ❌ BETA REMOVIDO - Era muy pesado y tardado
        # Ahora solo usamos indicadores técnicos locales
        
        return df.dropna()

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None:
            return None

        x_test_tensor = self._preparar_tensor(df_ind)
        
        with torch.no_grad():
            # ¡Lógica unificada! Los 3 modelos (v1, v2 y v3) hacen exactamente lo mismo
            pred_reg_tensor, pred_clf_tensor = self.model(x_test_tensor)
            prediccion_cruda = pred_reg_tensor.cpu().numpy()[0][0]
            
            # Para v1 y v2 (LSTM): aplicar sigmoid a logits
            # Para v3 (CNN): ya devuelve probabilidades
            if self.version in ['v1', 'v2']:
                probabilidad_alcista = torch.sigmoid(pred_clf_tensor).cpu().numpy()[0][0]
            else:  # v3
                probabilidad_alcista = pred_clf_tensor.cpu().numpy()[0][0]
            
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