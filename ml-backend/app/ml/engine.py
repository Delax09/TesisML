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
    
    DIAS_MEMORIA_IA = 30 #VARIABLE GLOBAL: Dias de memoria que la IA utiliza 
    DIAS_PREDICCION = 5 #VARIABLE GLOBAL: Días a predecir hacia el futuro
    FEATURES = [
        # Originales
        'Close', 'Volume', 'RSI', 'MACD', 'ATR', 'EMA20', 'EMA50',
        'BB_Upper', 'BB_Lower', 'LogReturn', 'EMA20_diff', 'EMA50_diff', 'BB_pct',
        
        # Volumen y Flujo
        'VWAP', 'OBV', 'Volume_SMA', 'Volume_Ratio',
        
        # Acción del Precio Cruda
        'Body_Size', 'Wick_Upper', 'Wick_Lower', 'High_Low_Range',
        
        # Fuerza y Tendencia Alternativas
        'ADX', 'Stoch_K', 'Stoch_D',
        
        # Variables Temporales (Estacionalidad)
        'DayOfWeek', 'HourOfDay', 'Is_Month_End',
        
        # Rezagos y Ventanas Históricas
        'LogReturn_Lag1', 'LogReturn_Lag2', 'LogReturn_Lag3', 'Hist_Volatility_20'
    ]

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

    def _desescalar_prediccion(self, prediccion_cruda, precio_actual):
        return float(precio_actual * np.exp(prediccion_cruda))

    @staticmethod
    #Aqui se agregan las nueva FEATURES, SIMPRE AL FINAL
    def calcular_indicadores(df):
        df = df.copy() 
        
        close = df['Close']
        high = df['High']
        low = df['Low']
        volume = df['Volume']
        
        # ---------------------------------------------------------
        # 1. TENDENCIA Y MOMENTUM (Originales)
        # ---------------------------------------------------------
        delta = close.diff()
        ganancia = delta.where(delta > 0, 0).ewm(com=13, adjust=False).mean()
        perdida = -delta.where(delta < 0, 0).ewm(com=13, adjust=False).mean()
        rs = ganancia / perdida
        df['RSI'] = 100 - (100 / (1 + rs))
        
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        df['MACD'] = ema12 - ema26
        
        df['EMA20'] = close.ewm(span=20, adjust=False).mean()
        df['EMA50'] = close.ewm(span=50, adjust=False).mean()
        df['EMA20_diff'] = (close / df['EMA20'].replace(0, 1)) - 1
        df['EMA50_diff'] = (close / df['EMA50'].replace(0, 1)) - 1
        
        # ---------------------------------------------------------
        # 2. VOLATILIDAD
        # ---------------------------------------------------------
        prev_close = close.shift(1)
        tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
        df['ATR'] = tr.rolling(window=14).mean()
        
        sma20 = close.rolling(window=20).mean()
        std20 = close.rolling(window=20).std()
        df['BB_Upper'] = sma20 + (std20 * 2)
        df['BB_Lower'] = sma20 - (std20 * 2)
        df['BB_pct'] = (close - sma20) / std20.replace(0, 1) # Evita división por cero
        
        df['LogReturn'] = np.log(close / prev_close)
        df['Hist_Volatility_20'] = df['LogReturn'].rolling(window=20).std() * np.sqrt(252)

        # ---------------------------------------------------------
        # 3. VOLUMEN Y FLUJO INSTITUCIONAL
        # ---------------------------------------------------------
        # VWAP (Aproximación basada en precio típico diario)
        precio_tipico = (high + low + close) / 3
        df['VWAP'] = (precio_tipico * volume).rolling(window=14).sum() / volume.rolling(window=14).sum().replace(0, 1)
        
        # OBV (On-Balance Volume)
        df['OBV'] = (np.sign(delta) * volume).fillna(0).cumsum()
        
        # Volumen Relativo
        df['Volume_SMA'] = volume.rolling(window=20).mean()
        df['Volume_Ratio'] = volume / df['Volume_SMA'].replace(0, 1)

        # ---------------------------------------------------------
        # 4. PRICE ACTION (Acción del Precio Cruda - Velas Japonesas)
        # ---------------------------------------------------------
        # Asumimos que la base de datos tiene Open, si no, usamos el Close de ayer como Open
        apertura = df.get('Open', prev_close.fillna(close)) 
        
        df['Body_Size'] = abs(close - apertura)
        df['Wick_Upper'] = high - np.maximum(close, apertura)
        df['Wick_Lower'] = np.minimum(close, apertura) - low
        df['High_Low_Range'] = high - low

        # ---------------------------------------------------------
        # 5. FUERZA Y TENDENCIA ALTERNATIVAS
        # ---------------------------------------------------------
        # ADX Simulado (Average Directional Index) - Aproximación simplificada
        up_move = high - high.shift(1)
        down_move = low.shift(1) - low
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
        
        plus_di = 100 * (pd.Series(plus_dm).ewm(alpha=1/14, adjust=False).mean() / df['ATR'].replace(0,1))
        minus_di = 100 * (pd.Series(minus_dm).ewm(alpha=1/14, adjust=False).mean() / df['ATR'].replace(0,1))
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di).replace(0, 1)
        df['ADX'] = pd.Series(dx).ewm(alpha=1/14, adjust=False).mean().values

        # Oscilador Estocástico
        low14 = low.rolling(window=14).min()
        high14 = high.rolling(window=14).max()
        df['Stoch_K'] = 100 * ((close - low14) / (high14 - low14).replace(0, 1))
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()

        # ---------------------------------------------------------
        # 6. VARIABLES TEMPORALES Y ESTACIONALIDAD
        # ---------------------------------------------------------
        # Si el índice es DateTime, extraemos datos. Si no, intentamos convertir la columna Fecha.
        if not isinstance(df.index, pd.DatetimeIndex):
            if 'Fecha' in df.columns:
                fechas = pd.to_datetime(df['Fecha'])
            else:
                fechas = pd.Series(pd.Timestamp.now(), index=df.index) # Fallback de seguridad
        else:
            fechas = df.index

        df['DayOfWeek'] = fechas.dayofweek # 0=Lunes, 6=Domingo
        df['HourOfDay'] = fechas.hour      # Útil si usas datos Intradía
        df['Is_Month_End'] = fechas.is_month_end.astype(int) # Fenómeno "Window Dressing"

        # ---------------------------------------------------------
        # 7. REZAGOS (Memoria a Corto Plazo)
        # ---------------------------------------------------------
        df['LogReturn_Lag1'] = df['LogReturn'].shift(1)
        df['LogReturn_Lag2'] = df['LogReturn'].shift(2)
        df['LogReturn_Lag3'] = df['LogReturn'].shift(3)

        # ---------------------------------------------------------
        # LIMPIEZA FINAL
        # ---------------------------------------------------------
        # Reemplazamos infinitos generados por divisiones extrañas por NaN, y luego borramos los NaN
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        return df.dropna()

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None: return None

        x_test_tensor = self._preparar_tensor(df_ind)
        
        precio_actual = df_ind.iloc[-1]['Close']
        with torch.no_grad():
            pred_reg_tensor, pred_clf_tensor = self.model(x_test_tensor)
            prediccion_cruda = pred_reg_tensor.cpu().numpy()[0][0]
            
            #APLICAMOS LA SIGMOIDE MANUALMENTE PARA OBTENER PORCENTAJE
            probabilidad_alcista = torch.sigmoid(pred_clf_tensor).cpu().numpy()[0][0]
            
            if probabilidad_alcista > 0.65: 
                recomendacion = "ALCISTA"; score = 1
            elif probabilidad_alcista < 0.35: 
                recomendacion = "BAJISTA"; score = -1
            else: 
                recomendacion = "MANTENER"; score = 0
        
        pred_real = self._desescalar_prediccion(prediccion_cruda, precio_actual)
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