import os
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch

import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3
from app.ml.arquitectura.v4_lstm_cnn import ModeloLSTMCNN_v4

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"   # app/ml/models


class MLEngine:
    """Motor de inferencia. Todas las constantes de configuración viven aquí."""

    DIAS_MEMORIA_IA = 90        # largo de la ventana de entrada
    DIAS_PREDICCION = 21        # horizonte del objetivo
    WARMUP = 60                 # filas iniciales descartadas (indicadores aún incompletos)
    REG_SCALE = 0.1             # el objetivo de regresión se entrena como log_ret / REG_SCALE
    CLIP_SCALER = 10.0          # recorte de valores escalados (igual en train e inferencia)

    BALANCE_METHOD = 'undersample'   # 'undersample', 'oversample' o 'none'
    STRIDE_TRAIN = 5                 # paso entre ventanas de entrenamiento
    ZONA_MUERTA = 0.25               # descarta en train |ret| < 0.25 * vol esperada a 21 días
    FECHA_VAL = '2023-01-01'         # inicio de validación
    FECHA_TEST = '2024-07-01'        # inicio de test (no se toca hasta el final)
    SEED = 42

    # Valores por defecto; se sobrescriben con los del metadata del modelo
    UMBRAL_ALCISTA = 0.55
    UMBRAL_BAJISTA = 0.45

    # Solo features relativas / estacionarias: significan lo mismo para BTC que para Ford
    FEATURES = [
        'LogReturn', 'Ret_5', 'Ret_21',
        'Dist_SMA20', 'Dist_EMA50',
        'ATR_pct', 'MACD_pct', 'BB_pctB', 'Z_Score',
        'RSI', 'CMF', 'Volatilidad_10d', 'Vol_z',
    ]

    @classmethod
    def configuracion(cls) -> dict:
        """Se guarda en el metadata para verificar compatibilidad al cargar."""
        return {
            "features": list(cls.FEATURES),
            "dias_memoria": cls.DIAS_MEMORIA_IA,
            "dias_prediccion": cls.DIAS_PREDICCION,
            "warmup": cls.WARMUP,
            "reg_scale": cls.REG_SCALE,
            "clip_scaler": cls.CLIP_SCALER,
            "balance_method": cls.BALANCE_METHOD,
            "stride_train": cls.STRIDE_TRAIN,
            "zona_muerta": cls.ZONA_MUERTA,
            "fecha_val": cls.FECHA_VAL,
            "fecha_test": cls.FECHA_TEST,
            "seed": cls.SEED,
        }

    def __init__(self, version="v1"):
        self.version = version.lstrip('v') if version.startswith('vv') else version
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.scaler = None
        self.metadata = {}
        self._inicializar_recursos()

    def _construir_modelo(self):
        n = len(self.FEATURES)
        if self.version == "v1":
            return ModeloLSTM_v1(num_features=n)
        if self.version == "v2":
            return ModeloBidireccional_v2(num_features=n)
        if self.version == "v3":
            return ModeloCNN_v3(num_features=n, dias_pasados=self.DIAS_MEMORIA_IA)
        if self.version == "v4":
            return ModeloLSTMCNN_v4(num_features=n, dias_pasados=self.DIAS_MEMORIA_IA)
        raise ValueError(f"Versión de modelo desconocida: {self.version}")

    def _inicializar_recursos(self):
        model_path = MODELS_DIR / f"modelo_acciones_{self.version}.pth"
        scaler_path = MODELS_DIR / f"scaler_{self.version}.pkl"
        meta_path = MODELS_DIR / f"metadata_{self.version}.json"

        faltantes = [p.name for p in (model_path, scaler_path, meta_path) if not p.exists()]
        if faltantes:
            if self.version != "dummy":
                logger.warning(f"⚠️ Modelo {self.version}: faltan archivos {faltantes}. Reentrena con el pipeline nuevo.")
            return

        self.metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        cfg = self.metadata.get("configuracion", {})
        if cfg.get("features") != self.FEATURES or cfg.get("dias_memoria") != self.DIAS_MEMORIA_IA:
            raise RuntimeError(
                f"El modelo {self.version} se entrenó con otra configuración "
                f"(features/dias_memoria distintos). Reentrénalo."
            )

        self.scaler = joblib.load(scaler_path)
        self.model = self._construir_modelo().to(self.device)
        estado = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(estado, strict=True)   # falla fuerte si la arquitectura no coincide
        self.model.eval()

        metricas = self.metadata.get("metricas", {})
        self.UMBRAL_ALCISTA = float(metricas.get("umbral_alcista", self.UMBRAL_ALCISTA))
        self.UMBRAL_BAJISTA = float(metricas.get("umbral_bajista", self.UMBRAL_BAJISTA))
        if self.UMBRAL_BAJISTA >= self.UMBRAL_ALCISTA:
            logger.warning("⚠️ Umbrales incoherentes en metadata; usando 0.45 / 0.55")
            self.UMBRAL_BAJISTA, self.UMBRAL_ALCISTA = 0.45, 0.55
        logger.info(f"✅ Modelo {self.version} cargado (umbrales {self.UMBRAL_BAJISTA:.3f} / {self.UMBRAL_ALCISTA:.3f})")

    def _preparar_tensor(self, df_ind):
        ventana = df_ind[self.FEATURES].values[-self.DIAS_MEMORIA_IA:]
        escalado = np.clip(self.scaler.transform(ventana), -self.CLIP_SCALER, self.CLIP_SCALER)
        return torch.tensor(escalado, dtype=torch.float32).unsqueeze(0).to(self.device)

    def predecir(self, df_ind):
        if self.model is None or self.scaler is None:
            return None
        if df_ind is None or df_ind.empty or len(df_ind) < self.DIAS_MEMORIA_IA:
            logger.warning(f"❌ DataFrame insuficiente: {0 if df_ind is None else len(df_ind)} filas")
            return None
        faltantes = [f for f in self.FEATURES if f not in df_ind.columns]
        if faltantes:
            logger.warning(f"❌ Features faltantes: {faltantes}")
            return None

        precio_actual = df_ind.iloc[-1]['Close']
        if pd.isna(precio_actual) or precio_actual <= 0:
            logger.warning(f"❌ Precio actual inválido: {precio_actual}")
            return None

        try:
            with torch.no_grad():
                p_reg, logits = self.model(self._preparar_tensor(df_ind))
                log_ret = float(p_reg.cpu().numpy()[0][0]) * self.REG_SCALE
                prob = float(torch.sigmoid(logits).cpu().numpy()[0][0])

            if not np.isfinite(log_ret):
                logger.warning(f"❌ Predicción inválida: {log_ret}")
                return None

            pred_real = precio_actual * np.exp(log_ret)
            var_pct = (pred_real / precio_actual - 1) * 100

            if prob >= self.UMBRAL_ALCISTA:
                recomendacion, score = "ALCISTA", 1
            elif prob <= self.UMBRAL_BAJISTA:
                recomendacion, score = "BAJISTA", -1
            else:
                recomendacion, score = "MANTENER", 0

            u = df_ind.iloc[-1]
            features_dict = {
                "Close": float(u.get("Close", 0)),
                "Volume": float(u.get("Volume", 0)),
                "ATR": float(u.get("ATR", 0)),
                "EMA20": float(u.get("EMA20", 0)),
                "EMA50": float(u.get("EMA50", 0)),
                "RSI": float(u.get("RSI", 0)),
                "MACD": float(u.get("MACD", 0)),
                "BB_Upper": float(u.get("BB_Upper", 0)),
                "BB_Lower": float(u.get("BB_Lower", 0)),
                "Volatilidad": float(u.get("Volatilidad_10d", 0)),
                "NewsSentiment": float(u.get("NewsSentiment", 0.5)),
                "ProbAlcista": prob * 100,
            }
            return {
                "prediccion": float(pred_real),
                "variacion": float(var_pct),
                "confianza": prob * 100 if score >= 0 else (1 - prob) * 100,
                "recomendacion": recomendacion,
                "score": score,
                "features": features_dict,
            }
        except Exception as e:
            logger.error(f"❌ Error en predicción: {e}", exc_info=True)
            return None

    @staticmethod
    def _agregar_feature_sentimiento(df, empresa_id=None, ticker=None, db=None):
        """Promedio del sentimiento de los últimos 7 días (0.5 = neutral). Hoy NO es feature del modelo."""
        df['NewsSentiment'] = 0.5
        if empresa_id is None or not isinstance(df.index, pd.DatetimeIndex):
            return df

        cerrar_sesion = db is None
        try:
            from app.models.noticia_sentimiento import NoticiaSentimiento
            from app.db.sessions import SessionLocal
            if db is None:
                db = SessionLocal()
            rows = db.query(NoticiaSentimiento.FechaPublicacion, NoticiaSentimiento.Sentimiento)\
                     .filter(NoticiaSentimiento.IdEmpresa == empresa_id).all()
            if rows:
                s = pd.DataFrame(rows, columns=['fecha', 'score'])
                s['fecha'] = pd.to_datetime(s['fecha']).dt.tz_localize(None).dt.normalize()
                diario = s.groupby('fecha')['score'].mean()
                fechas = df.index.normalize()
                rango = pd.date_range(min(diario.index.min(), fechas.min()), fechas.max(), freq='D')
                ventana = diario.reindex(rango).rolling('8D', min_periods=1).mean()
                df['NewsSentiment'] = ventana.reindex(fechas).fillna(0.5).clip(0, 1).values
        except Exception as exc:
            logger.warning(f"⚠️ No se pudo incorporar NewsSentiment para {ticker or empresa_id}: {exc}")
        finally:
            if cerrar_sesion and db is not None:
                db.close()
        return df

    @staticmethod
    def calcular_indicadores(df: pd.DataFrame, empresa_id: int = None, ticker: str = None, db=None):
        """Recibe OHLCV con índice de fechas y devuelve features. Misma función en train e inferencia."""
        if df is None or 'Close' not in df.columns or 'Volume' not in df.columns:
            logger.error("❌ Columnas Close o Volume faltantes")
            return None
        if len(df) <= MLEngine.WARMUP + MLEngine.DIAS_MEMORIA_IA:
            logger.warning(f"❌ Muy pocas filas para indicadores: {len(df)}")
            return None

        d = df.copy()
        c, v = d['Close'], d['Volume']
        h = d['High'] if 'High' in d else c
        l = d['Low'] if 'Low' in d else c

        # Retornos
        d['LogReturn'] = np.log(c / c.shift(1))
        d['Ret_5'] = np.log(c / c.shift(5))
        d['Ret_21'] = np.log(c / c.shift(21))

        # Tendencia (se conservan en escala de precio solo para mostrarlas en la web)
        d['EMA20'] = c.ewm(span=20, adjust=False).mean()
        d['EMA50'] = c.ewm(span=50, adjust=False).mean()
        d['SMA20'] = c.rolling(20).mean()
        std20 = c.rolling(20).std()
        d['BB_Upper'] = d['SMA20'] + 2 * std20
        d['BB_Lower'] = d['SMA20'] - 2 * std20
        d['MACD'] = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
        tr = np.maximum(h - l, np.maximum((h - c.shift(1)).abs(), (l - c.shift(1)).abs()))
        d['ATR'] = tr.rolling(14).mean()

        # Osciladores y volumen
        delta = c.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        d['RSI'] = 100 - 100 / (1 + gain / loss.replace(0, np.nan))
        mfv = ((c - l) - (h - c)) / (h - l).replace(0, np.nan) * v
        d['CMF'] = mfv.rolling(20).sum() / v.rolling(20).sum().replace(0, np.nan)
        d['Volatilidad_10d'] = d['LogReturn'].rolling(10).std()

        # Versiones relativas (las que ve el modelo)
        d['Dist_SMA20'] = c / d['SMA20'] - 1
        d['Dist_EMA50'] = c / d['EMA50'] - 1
        d['ATR_pct'] = d['ATR'] / c
        d['MACD_pct'] = d['MACD'] / c
        d['BB_pctB'] = (c - d['BB_Lower']) / (d['BB_Upper'] - d['BB_Lower']).replace(0, np.nan)
        d['Z_Score'] = (c - d['SMA20']) / std20.replace(0, np.nan)
        lv = np.log1p(v)
        d['Vol_z'] = (lv - lv.rolling(60).mean()) / lv.rolling(60).std().replace(0, np.nan)

        # Sin bfill (traería datos del futuro): se descarta el warm-up y se rellena hacia adelante
        d = d.replace([np.inf, -np.inf], np.nan).iloc[MLEngine.WARMUP:].copy()
        d[MLEngine.FEATURES] = d[MLEngine.FEATURES].ffill().fillna(0)

        return MLEngine._agregar_feature_sentimiento(d, empresa_id=empresa_id, ticker=ticker, db=db)