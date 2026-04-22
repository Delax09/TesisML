import os
import joblib
import numpy as np
import pandas as pd
import torch
import logging

# --- APAGAR WARNINGS DE TENSORFLOW ---
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# 🛑 PARCHE CRÍTICO PARA EL SERVIDOR WEB (PYTHON 3.13) 🛑
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3
from app.ml.core.technical_indicators import TechnicalIndicators # Asumiendo que moviste los indicadores aquí

logger = logging.getLogger(__name__)

class MLEngine:
    """Motor de Inferencia de Inteligencia Artificial para Mercado de Valores"""
    
    DIAS_MEMORIA_IA = 30
    DIAS_PREDICCION = 5
    
    # Umbrales calibrados
    UMBRAL_ALCISTA = 0.62  
    UMBRAL_BAJISTA = 0.38  

    FEATURES = [
        'Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50',
        'BB_Upper', 'BB_Lower', 'LogReturn', 'Volatilidad_10d', 'Momentum',
        'ROC', 'MFI', 'Stochastic_K', 'Stochastic_D', 'Williams_R',
        'OBV', 'CMF', 'TRIX', 'Force_Index', 'ADX', 'CCI',
        'Aroon_Up', 'Aroon_Down', 'Ultimate_Oscillator',
        'Keltner_Channel', 'VWAP', 'Z_Score', 'Ichimoku_Upper', 'Ichimoku_Lower', 
    ]

    def __init__(self, version="v1"):
        # Normalizar versión: "vv3" → "v3", "vv1" → "v1", etc.
        self.version = version.lstrip('v') if version.startswith('vv') else version
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.scaler = None
        self._inicializar_recursos()

    def _inicializar_recursos(self):
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "models", f"modelo_acciones_{self.version}.pth")
        
        scaler_nombre = "scaler_cnn.pkl" if self.version == "v3" else "scaler.pkl"
        scaler_path = os.path.join(base_dir, "models", scaler_nombre)
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)

            
            if self.version == "v1":
                self.model = ModeloLSTM_v1(num_features = len(self.FEATURES)).to(self.device)
            elif self.version == "v2":
                self.model = ModeloBidireccional_v2(num_features =len(self.FEATURES)).to(self.device)
            elif self.version == "v3":
                self.model = ModeloCNN_v3(num_features =len(self.FEATURES)).to(self.device)
                
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
            self.model.eval() 
        else:
            if self.version != "dummy":
                print(f"⚠️ Archivos para el modelo {self.version} no encontrados en: {model_path}")

    def _preparar_tensor(self, df_ind):
        scaled_data = self.scaler.transform(df_ind[self.FEATURES].values)
        if self.version == "v3" or self.version == "vv3":
            tensor = torch.tensor(scaled_data[-self.DIAS_MEMORIA_IA:], dtype=torch.float32).unsqueeze(0).transpose(1, 2).to(self.device)
        else:
            tensor = torch.tensor(scaled_data[-self.DIAS_MEMORIA_IA:], dtype=torch.float32).unsqueeze(0).to(self.device)
        return tensor

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None: 
            return None
        
        # Validar que el DataFrame tenga datos suficientes
        if df_ind is None or df_ind.empty or len(df_ind) < self.DIAS_MEMORIA_IA:
            logger.warning(f"❌ DataFrame insuficiente: {len(df_ind) if df_ind is not None else 0} filas")
            return None
        
        # Validar que todas las features requeridas existan
        missing_features = [f for f in self.FEATURES if f not in df_ind.columns]
        if missing_features:
            logger.warning(f"❌ Features faltantes: {missing_features}")
            return None
        
        x_test_tensor = self._preparar_tensor(df_ind)
        precio_actual = df_ind.iloc[-1]['Close']
        
        # Validar precio actual
        if pd.isna(precio_actual) or precio_actual <= 0:
            logger.warning(f"❌ Precio actual inválido: {precio_actual}")
            return None
        
        try:
            with torch.no_grad():
                pred_reg_tensor, pred_clf_tensor = self.model(x_test_tensor)
                prediccion_cruda = pred_reg_tensor.cpu().numpy()[0][0]
                probabilidad_alcista = torch.sigmoid(pred_clf_tensor).cpu().numpy()[0][0]
                
            # Validar predicción cruda
            if pd.isna(prediccion_cruda) or np.isinf(prediccion_cruda):
                logger.warning(f"❌ Predicción cruda inválida: {prediccion_cruda}")
                return None
                
            pred_real = precio_actual * np.exp(prediccion_cruda)
            var_pct = ((pred_real - precio_actual) / precio_actual) * 100
            
            # Validar predicción real
            if pd.isna(pred_real) or pred_real <= 0:
                logger.warning(f"❌ Predicción real inválida: {pred_real}")
                return None
            
            if probabilidad_alcista > self.UMBRAL_ALCISTA: 
                recomendacion = "ALCISTA"; score = 1
            elif probabilidad_alcista < self.UMBRAL_BAJISTA: 
                recomendacion = "BAJISTA"; score = -1
            else: 
                recomendacion = "MANTENER"; score = 0

            ultima_fila = df_ind.iloc[-1]
            features_dict = {
                "Close": float(ultima_fila.get("Close", 0)),
                "Volume": float(ultima_fila.get("Volume", 0)),
                "ATR": float(ultima_fila.get("ATR", 0)),
                "EMA20": float(ultima_fila.get("EMA20", 0)),
                "EMA50": float(ultima_fila.get("EMA50", 0)),
                "RSI": float(ultima_fila.get("RSI", 0)),
                "MACD": float(ultima_fila.get("MACD", 0)),
                "BB_Upper": float(ultima_fila.get("BB_Upper", 0)),
                "BB_Lower": float(ultima_fila.get("BB_Lower", 0)),
                "Volatilidad": float(ultima_fila.get("Volatilidad_10d", 0)),
                "ProbAlcista": float(probabilidad_alcista * 100),
            }

            return {
                "prediccion": float(pred_real),
                "variacion": float(var_pct),
                "confianza": float(probabilidad_alcista * 100 if score == 1 else (1 - probabilidad_alcista) * 100),
                "recomendacion": recomendacion,
                "score": score,
                "features": features_dict
            }
        except Exception as e:
            logger.error(f"❌ Error en predicción: {e}", exc_info=True)
            return None

    @staticmethod
    def calcular_indicadores(df: pd.DataFrame) -> pd.DataFrame:
        df_clean = df.copy()
        
        # Validar que Close y Volume existan y sean válidos
        if 'Close' not in df_clean.columns or 'Volume' not in df_clean.columns:
            logger.error("❌ Columnas Close o Volume faltantes")
            return None
        
        if df_clean['Close'].isna().all() or (df_clean['Close'] <= 0).all():
            logger.error("❌ Todos los valores de Close son inválidos")
            return None
        
        # Indicadores Tendenciales
        df_clean['EMA20'] = df_clean['Close'].ewm(span=20, adjust=False).mean()
        df_clean['EMA50'] = df_clean['Close'].ewm(span=50, adjust=False).mean()
        df_clean['MACD'] = df_clean['Close'].ewm(span=12, adjust=False).mean() - df_clean['Close'].ewm(span=26, adjust=False).mean()
        df_clean['LogReturn'] = np.log(df_clean['Close'] / df_clean['Close'].shift(1)).replace([np.inf, -np.inf], 0)
        df_clean['Momentum'] = df_clean['Close'] - df_clean['Close'].shift(10)
        df_clean['ROC'] = ((df_clean['Close'] - df_clean['Close'].shift(10)) / df_clean['Close'].shift(10).clip(lower=0.001)) * 100
        df_clean['TRIX'] = df_clean['Close'].ewm(span=15).mean().ewm(span=15).mean().ewm(span=15).mean().pct_change().replace([np.inf, -np.inf], 0)
        
        # Volatilidad
        df_clean['Volatilidad_10d'] = df_clean['LogReturn'].rolling(window=10).std().fillna(0)
        df_clean['ATR'] = np.maximum(df_clean['High'] - df_clean['Low'], 
                                     np.maximum(abs(df_clean['High'] - df_clean['Close'].shift(1)), 
                                               abs(df_clean['Low'] - df_clean['Close'].shift(1)))).rolling(window=14).mean()
        
        rolling_std = df_clean['Close'].rolling(window=20).std().clip(lower=0.001)
        df_clean['BB_Upper'] = df_clean['EMA20'] + 2 * rolling_std
        df_clean['BB_Lower'] = df_clean['EMA20'] - 2 * rolling_std
        df_clean['Keltner_Channel'] = df_clean['EMA20'] + 1.5 * df_clean['ATR'].fillna(0)
        df_clean['Z_Score'] = ((df_clean['Close'] - df_clean['Close'].rolling(window=20).mean()) / rolling_std).replace([np.inf, -np.inf], 0)
        
        # Osciladores - RSI mejorado
        delta = df_clean['Close'].diff()
        gain = delta.clip(lower=0).rolling(window=14).mean()
        loss = (-delta.clip(upper=0)).rolling(window=14).mean()
        rs = (gain / loss.clip(lower=0.001)).replace([np.inf, -np.inf], 1)
        df_clean['RSI'] = 100 - (100 / (1 + rs))
        
        # Stochastic mejorado
        low_min = df_clean['Low'].rolling(window=14).min()
        high_max = df_clean['High'].rolling(window=14).max()
        denominator = (high_max - low_min).clip(lower=0.001)
        df_clean['Stochastic_K'] = 100 * ((df_clean['Close'] - low_min) / denominator)
        df_clean['Stochastic_D'] = df_clean['Stochastic_K'].rolling(window=3).mean()
        
        df_clean['Williams_R'] = -100 * ((high_max - df_clean['Close']) / denominator)
        df_clean['CCI'] = ((df_clean['Close'] - df_clean['Close'].rolling(window=20).mean()) / 
                           (0.015 * df_clean['Close'].rolling(window=20).std().clip(lower=0.001))).replace([np.inf, -np.inf], 0)
        
        # Volumen
        typical_price = (df_clean['High'] + df_clean['Low'] + df_clean['Close']) / 3
        money_flow = typical_price * df_clean['Volume']
        positive_mf = money_flow.where(df_clean['Close'].diff() > 0, 0)
        negative_mf = money_flow.where(df_clean['Close'].diff() <= 0, 0)
        
        mf_sum = positive_mf.rolling(window=14).sum() + negative_mf.rolling(window=14).sum()
        df_clean['MFI'] = 100 - (100 / (1 + (positive_mf.rolling(window=14).sum() / 
                                             negative_mf.rolling(window=14).sum().clip(lower=0.001))))
        
        df_clean['OBV'] = (np.sign(df_clean['Close'].diff()) * df_clean['Volume']).fillna(0).cumsum()
        
        money_flow_volume = (((df_clean['Close'] - df_clean['Low']) - 
                             (df_clean['High'] - df_clean['Close'])) / 
                            (df_clean['High'] - df_clean['Low']).clip(lower=0.001) * 
                            df_clean['Volume']).replace([np.inf, -np.inf], 0)
        df_clean['CMF'] = money_flow_volume.rolling(window=20).sum() / df_clean['Volume'].rolling(window=20).sum().clip(lower=1)
        
        df_clean['Force_Index'] = df_clean['Close'].diff() * df_clean['Volume']
        df_clean['VWAP'] = (df_clean['Volume'] * typical_price).cumsum() / df_clean['Volume'].cumsum()
        
        # Direccionalidad (Aroon y ADX simplificado)
        df_clean['Aroon_Up'] = 100 * df_clean['High'].rolling(window=25).apply(lambda x: x.argmax() if len(x) > 0 else 0, raw=False) / 25
        df_clean['Aroon_Down'] = 100 * df_clean['Low'].rolling(window=25).apply(lambda x: x.argmin() if len(x) > 0 else 0, raw=False) / 25
        df_clean['ADX'] = df_clean['ATR'].rolling(window=14).mean()
        
        # Ichimoku
        df_clean['Ichimoku_Upper'] = (df_clean['High'].rolling(window=9).max() + 
                                    df_clean['Low'].rolling(window=9).min()) / 2
        df_clean['Ichimoku_Lower'] = (df_clean['High'].rolling(window=26).max() + 
                                    df_clean['Low'].rolling(window=26).min()) / 2
        
        # Ultimate Oscillator (Simplificado)
        df_clean['Ultimate_Oscillator'] = (((df_clean['Close'] - df_clean['Low']) / 
                                           (df_clean['High'] - df_clean['Low']).clip(lower=0.001)) * 100).replace([np.inf, -np.inf], 0)
        
        # Llenar NaN y reemplazar infinitos
        df_clean = df_clean.replace([np.inf, -np.inf], 0).ffill().bfill().fillna(0)
        
        # Validar que no haya NaN en features críticas
        critical_features = ['Close', 'Volume', 'EMA20', 'RSI', 'MACD', 'ATR']
        for feat in critical_features:
            if feat in df_clean.columns and df_clean[feat].isna().all():
                logger.warning(f"⚠️ Feature {feat} quedó con todos NaN")
                
        return df_clean