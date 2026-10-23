# Corrección del pipeline de ML — TesisML

Guía paso a paso para corregir el entrenamiento y el análisis de precios en `ml-backend/`. Todo el código de esta guía fue probado sobre los 86 CSV de `ml-backend/data/` (la preparación de datos, la consistencia entre entrenamiento e inferencia y el script de línea base se ejecutaron de punta a punta; el bucle de PyTorch se verificó a nivel de sintaxis).

## Por qué hay que cambiarlo

Los 13 modelos guardados en `app/ml/models/versiones/` tienen un AUC entre 0.505 y 0.53, es decir, equivalen a lanzar una moneda, y oscilan entre predecir todo "baja" o todo "sube". No es un problema de arquitectura: son bugs en el pipeline de datos.

| # | Problema | Archivo | Efecto |
|---|----------|---------|--------|
| 1 | El undersampling rellena `y_reg` con índices aleatorios | `core/data_utils.py` | La cabeza de regresión aprende ruido y contamina al resto de la red |
| 2 | Recorte de ±3σ sobre **todas** las columnas, incluido `Close` | `core/data_validation.py` | NVDA queda congelado en 141.5 durante 285 días y LLY en 638 durante 595 días; el objetivo se calcula sobre precios falsos y con información del futuro |
| 3 | La validación es el último 10% de filas concatenadas | `core/data_utils.py` | Valida con 8 tickers (UPS…XRP-USD) en las mismas fechas que el entrenamiento; no mide capacidad de predecir el futuro |
| 4 | Features en escala de precio con un scaler global ajustado con las primeras 100 filas | `core/engine.py`, `core/data_utils.py` | BTC (≈78.000) y Ford (≈12) mezclados; los datos recientes quedan fuera de rango |
| 5 | `scaler.pkl` global sobrescrito por cada pipeline | orquestadores, `core/engine.py` | La CNN puede predecir con el scaler de las LSTM |
| 6 | Se evalúa con los pesos de la última época, no con los mejores | orquestadores, `core/pipeline_trainer.py` | Métricas y umbral no corresponden al modelo guardado |
| 7 | En inferencia el DataFrame no tiene fechas | `auto/generar_predicciones.py` | `NewsSentiment` siempre vale 0.5 (en el entrenamiento por CSV también) |
| 8 | `UMBRAL_BAJISTA = 1 - umbral` y `strict=False` al cargar | `core/engine.py` | Con umbral 0.5 nunca existe "MANTENER"; una arquitectura distinta se carga en silencio con pesos aleatorios |

---

## 0. Antes de empezar

```bash
cd TesisML
git checkout -b fix/pipeline-ml
# respaldo de los modelos actuales (serán incompatibles con las nuevas features)
mkdir -p ml-backend/app/ml/models/legacy
mv ml-backend/app/ml/models/modelo_acciones_v*.pth ml-backend/app/ml/models/scaler.pkl ml-backend/app/ml/models/legacy/
```

No necesitas instalar nada nuevo: `scipy` ya viene con `scikit-learn`, y `imbalanced-learn` deja de usarse (puedes quitarlo de `requirement.txt`).

### Opción rápida: aplicar el parche

Junto a este README va `cambios_pipeline_ml.patch`, generado contra el estado actual del repositorio. Si no has modificado los archivos involucrados desde entonces:

```bash
git apply --check cambios_pipeline_ml.patch   # verifica que aplica
git apply cambios_pipeline_ml.patch
```

Si aplica sin errores, salta directo a la sección **11. Reentrenar y verificar**. Si no aplica (porque cambiaste algo), sigue los pasos manuales; cada uno indica qué reemplazar.

---

## 1. `app/ml/core/data_validation.py` — dejar de recortar precios y balancear por índices

Reemplaza el método `sanitizar_datos` completo. Ya no recorta valores: los extremos se controlan después del escalado, con estadísticos calculados solo sobre entrenamiento.

```python
    @staticmethod
    def sanitizar_datos(df: pd.DataFrame,
                        fillna_strategy: str = 'ffill') -> pd.DataFrame:
        """
        Limpieza de OHLCV crudo. NO recorta valores: recortar precios con
        media ± 3σ de toda la serie congela tramos reales (ej. NVDA, LLY)
        y además usa información del futuro.
        """
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df[~df.index.duplicated(keep='last')].sort_index()

        if 'Close' in df.columns:
            df = df[df['Close'] > 0]

        df = df.dropna(thresh=int(len(df.columns) * 0.8))

        if fillna_strategy == 'ffill':
            df = df.ffill()          # solo hacia adelante: nunca usar datos futuros
        elif fillna_strategy == 'zero':
            df = df.fillna(0)

        return df.dropna()
```

Reemplaza `balancear_dataset` por `indices_balanceo`. La clave es que devuelve **índices**, de modo que X, `y_reg` e `y_clf` se recortan con la misma selección y siguen alineados. SMOTE se elimina porque interpolar ventanas de series de tiempo genera secuencias que nunca existieron.

```python
    @staticmethod
    def indices_balanceo(y_clf: np.ndarray, method: str = 'undersample', seed: int = 42) -> np.ndarray:
        """
        Devuelve los ÍNDICES a conservar, para aplicar la misma selección a X, y_reg e y_clf
        y no desalinear los objetivos. 'smote' se eliminó: interpolar ventanas de series
        temporales crea secuencias que nunca existieron.
        """
        n = len(y_clf)
        if method not in ('undersample', 'oversample'):
            return np.arange(n)

        rng = np.random.default_rng(seed)
        pos, neg = np.flatnonzero(y_clf == 1), np.flatnonzero(y_clf == 0)
        if len(pos) == 0 or len(neg) == 0:
            return np.arange(n)

        if method == 'undersample':
            k = min(len(pos), len(neg))
            idx = np.concatenate([rng.choice(pos, k, replace=False), rng.choice(neg, k, replace=False)])
        else:
            menor, mayor = (pos, neg) if len(pos) < len(neg) else (neg, pos)
            idx = np.concatenate([mayor, rng.choice(menor, len(mayor), replace=True)])

        idx = np.sort(idx)
        logger.info(f"Balanceo {method}: {n} -> {len(idx)} muestras")
        return idx
```

Borra también la línea `from sklearn.preprocessing import MinMaxScaler` (no se usa).

---

## 2. `app/ml/core/engine.py` — configuración, features relativas e inferencia coherente

Reemplaza el archivo completo. Cambios principales:

- **Features relativas**: `Close`, `Volume`, `ATR`, `SMA20`, `BB_Upper`, `BB_Lower` y `MACD` se sustituyen por versiones que significan lo mismo para cualquier activo (distancia a medias, ATR y MACD como % del precio, %B de Bollinger, volumen como z-score de 60 días). Se agregan `Ret_5` y `Ret_21`. Los valores en escala de precio se siguen calculando porque la web los muestra, pero el modelo no los ve.
- **`ADX` eliminado**: en el código original era la media del ATR, no un ADX.
- **`NewsSentiment` sale de `FEATURES`**: en los datos de entrenamiento valía 0.5 casi siempre, así que el modelo no podía aprender nada de él y en producción recibía valores que nunca vio. Se sigue calculando (ahora vectorizado y con el índice de fechas correcto) para mostrarlo. Vuelve a incluirlo cuando tengas sentimiento histórico para todo el período de entrenamiento.
- **Sin `bfill`**: se descartan las primeras `WARMUP = 60` filas en vez de rellenar hacia atrás con datos del futuro.
- **Carga segura**: el modelo, su scaler y su metadata se cargan como trío de la misma versión (`modelo_acciones_vX.pth`, `scaler_vX.pkl`, `metadata_vX.json`); se verifica que las features coincidan y se usa `strict=True`.
- **Umbrales independientes**: `UMBRAL_ALCISTA` y `UMBRAL_BAJISTA` vienen de la calibración en validación.
- **Toda la configuración en un solo lugar** (fechas de corte, stride, zona muerta, semilla), y `configuracion()` la guarda en el metadata.

```python
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
```

> Se quitaron indicadores que el modelo no usaba (Stochastic, Williams, CCI, MFI, OBV, VWAP, Aroon, Ichimoku, etc.). Aroon en particular usaba `rolling().apply()` y era lo más lento del pipeline. Si alguna vista de la web los necesita, agrégalos de nuevo dentro de `calcular_indicadores`, pero no los pongas en `FEATURES` si están en escala de precio.

---

## 3. `app/ml/core/data_utils.py` — split temporal sin fugas

Reemplaza el archivo completo. Ahora la separación es **por fecha, igual para todos los tickers**:

- **train**: ventanas cuyo objetivo (hoy + 21 días) termina antes de `FECHA_VAL`. Esto purga automáticamente el solapamiento con validación.
- **val**: desde `FECHA_VAL` hasta que el objetivo toque `FECHA_TEST`. Se usa para early stopping y para calibrar umbrales.
- **test**: desde `FECHA_TEST`. Solo se usa una vez, para el reporte final.

Además: el scaler se ajusta solo con filas de entrenamiento; en train se toma una ventana cada 5 días (`STRIDE_TRAIN`) porque ventanas consecutivas comparten casi todo; y se descartan en train los movimientos menores a 0.25× la volatilidad esperada (`ZONA_MUERTA`), que son indistinguibles del ruido. El objetivo de clasificación pasa a ser simplemente "el retorno a 21 días es positivo".

```python
"""Preparación de datos compartida por todos los pipelines (split temporal, sin fugas)."""

from typing import List, Dict
import gc
import logging

import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler
from numpy.lib.stride_tricks import sliding_window_view

from app.ml.core.engine import MLEngine
from app.ml.core.data_validation import DataValidator

logger = logging.getLogger(__name__)


def preparar_datos_generico(
    lista_dfs: List[pd.DataFrame],
    fecha_val: str = None,
    fecha_test: str = None,
    stride_train: int = None,
    zona_muerta: float = None,
    balance_method: str = None,
    seed: int = None,
) -> Dict:
    """
    Construye ventanas y separa train / val / test POR FECHA, igual para todos los tickers.

      train: ventanas cuyo objetivo (hoy + 21 días) termina ANTES de fecha_val  -> purga automática
      val:   ventanas desde fecha_val cuyo objetivo termina antes de fecha_test
      test:  ventanas desde fecha_test (solo para la evaluación final)

    Devuelve {'train': [x, y_reg, y_clf], 'val': [...], 'test': [...],
              'train_meta' / 'val_meta' / 'test_meta': DataFrame(fecha, ticker), 'scaler': RobustScaler}
    """
    M, H, F = MLEngine.DIAS_MEMORIA_IA, MLEngine.DIAS_PREDICCION, MLEngine.FEATURES
    fecha_val = pd.Timestamp(fecha_val or MLEngine.FECHA_VAL)
    fecha_test = pd.Timestamp(fecha_test or MLEngine.FECHA_TEST)
    stride_train = stride_train or MLEngine.STRIDE_TRAIN
    zona_muerta = MLEngine.ZONA_MUERTA if zona_muerta is None else zona_muerta
    balance_method = balance_method or MLEngine.BALANCE_METHOD
    seed = MLEngine.SEED if seed is None else seed

    if not lista_dfs:
        raise ValueError("No hay DataFrames para preparar")

    # 1) Scaler ajustado SOLO con filas anteriores a la validación
    filas = [df.loc[df.index < fecha_val, F].values for df in lista_dfs]
    filas = [f for f in filas if len(f)]
    if not filas:
        raise ValueError(f"No hay datos anteriores a {fecha_val.date()} para ajustar el scaler")
    scaler = RobustScaler().fit(np.vstack(filas))
    del filas

    partes = {k: {'x': [], 'yr': [], 'yc': [], 'fecha': [], 'ticker': []} for k in ('train', 'val', 'test')}

    for i, df in enumerate(lista_dfs):
        n = len(df)
        if n <= M + H:
            continue
        ticker = df.attrs.get('ticker', f'df_{i}')

        X = np.clip(scaler.transform(df[F].values), -MLEngine.CLIP_SCALER, MLEngine.CLIP_SCALER).astype(np.float32)
        close = df['Close'].values

        idx_hoy = np.arange(M - 1, n - H)        # último día de cada ventana
        idx_fut = idx_hoy + H
        y_reg = np.log(close[idx_fut] / close[idx_hoy]).astype(np.float32)
        y_clf = (y_reg > 0).astype(np.float32)

        # Volatilidad esperada a H días (solo con datos pasados) para la zona muerta
        vol = df['LogReturn'].rolling(20).std().ffill().fillna(0).values[idx_hoy] * np.sqrt(H)

        # ventanas[j] termina exactamente en idx_hoy[j]
        ventanas = sliding_window_view(X, M, axis=0).transpose(0, 2, 1)[:len(idx_hoy)]

        f_hoy, f_fut = df.index[idx_hoy], df.index[idx_fut]
        m_train = np.asarray(f_fut < fecha_val)
        m_val = np.asarray((f_hoy >= fecha_val) & (f_fut < fecha_test))
        m_test = np.asarray(f_hoy >= fecha_test)

        # Menos redundancia en train: una ventana cada `stride_train` días
        paso = np.zeros(len(idx_hoy), dtype=bool)
        paso[::stride_train] = True
        m_train &= paso
        # Zona muerta: en train se descartan movimientos indistinguibles del ruido
        if zona_muerta > 0:
            m_train &= np.abs(y_reg) > zona_muerta * vol

        for k, m in (('train', m_train), ('val', m_val), ('test', m_test)):
            if not m.any():
                continue
            p = partes[k]
            p['x'].append(np.ascontiguousarray(ventanas[m]))
            p['yr'].append(y_reg[m])
            p['yc'].append(y_clf[m])
            p['fecha'].append(f_hoy[m])
            p['ticker'].append(np.full(int(m.sum()), ticker))

    salida = {'scaler': scaler}
    for k, p in partes.items():
        if not p['x']:
            raise ValueError(f"Conjunto '{k}' vacío: revisa FECHA_VAL / FECHA_TEST")
        salida[k] = [np.concatenate(p['x']), np.concatenate(p['yr']), np.concatenate(p['yc'])]
        salida[k + '_meta'] = pd.DataFrame({'fecha': np.concatenate(p['fecha']),
                                            'ticker': np.concatenate(p['ticker'])})
    del partes
    gc.collect()

    # 2) Balanceo SOLO en train, con índices -> X, y_reg e y_clf siguen alineados
    idx = DataValidator.indices_balanceo(salida['train'][2], method=balance_method, seed=seed)
    salida['train'] = [a[idx] for a in salida['train']]
    salida['train_meta'] = salida['train_meta'].iloc[idx].reset_index(drop=True)

    for k in ('train', 'val', 'test'):
        x, _, yc = salida[k]
        meta = salida[k + '_meta']
        logger.info(f"{k}: {len(x)} ventanas | positivos {yc.mean():.3f} | "
                    f"{meta.fecha.min().date()} -> {meta.fecha.max().date()} | {meta.ticker.nunique()} tickers")
    return salida


def crear_dataloaders_generico(datos: Dict, batch_size: int = 256, seed: int = None):
    """Devuelve (train_loader, val_loader, test_loader). Solo train descarta el último lote incompleto."""
    seed = MLEngine.SEED if seed is None else seed

    def _ds(k):
        x, yr, yc = datos[k]
        return TensorDataset(torch.from_numpy(x), torch.from_numpy(yr).view(-1, 1), torch.from_numpy(yc).view(-1, 1))

    g = torch.Generator().manual_seed(seed)
    return (
        DataLoader(_ds('train'), batch_size=batch_size, shuffle=True, drop_last=True, generator=g, num_workers=0),
        DataLoader(_ds('val'), batch_size=batch_size, shuffle=False, drop_last=False, num_workers=0),
        DataLoader(_ds('test'), batch_size=batch_size, shuffle=False, drop_last=False, num_workers=0),
    )
```

Con los CSV actuales y las fechas por defecto, esto produce:

| Conjunto | Ventanas | Período | Positivos |
|----------|---------:|---------|----------:|
| train | 79.172 | hasta dic-2022 | 0.500 (balanceado) |
| val | 31.731 | ene-2023 → jun-2024 | 0.578 |
| test | 38.948 | jul-2024 → abr-2026 | 0.547 |

---

## 4. `app/ml/core/metrics.py` — métricas financieras

Agrega al final del archivo (deja lo existente). El AUC dice si el modelo ordena bien en general; estas métricas dicen si sirve para elegir acciones **en un mismo día**, que es como se usa en la práctica:

- `ic_medio`: correlación de Spearman diaria entre el retorno predicho y el real. En finanzas, un IC sostenido de 0.02–0.05 ya es interesante.
- `spread_q5_q1`: cuánto más rinde a 21 días el 20% de acciones con mayor probabilidad alcista que el 20% con menor.

```python
def metricas_cartera(meta, prob, pred_reg, y_reg, min_activos: int = 10) -> Dict[str, float]:
    """
    Métricas con sentido financiero, calculadas por fecha (corte transversal):
      ic_medio:     correlación de Spearman diaria entre retorno predicho y real (promedio)
      ic_ir:        ic_medio / desviación del IC (estabilidad)
      spread_q5_q1: retorno a 21 días del 20% con mayor prob. alcista menos el 20% con menor
    """
    import pandas as pd
    from scipy.stats import spearmanr

    df = meta[['fecha']].copy()
    df['prob'], df['pred'], df['real'] = prob, pred_reg, y_reg
    ics, spreads = [], []
    for _, g in df.groupby('fecha'):
        if len(g) < min_activos:
            continue
        ic = spearmanr(g['pred'], g['real'])[0]
        if ic == ic:   # descarta NaN
            ics.append(ic)
        q = g['prob'].rank(pct=True)
        spreads.append(g.loc[q >= 0.8, 'real'].mean() - g.loc[q <= 0.2, 'real'].mean())
    ics = np.array(ics)
    return {
        'ic_medio': float(ics.mean()) if len(ics) else 0.0,
        'ic_ir': float(ics.mean() / ics.std()) if len(ics) > 1 and ics.std() > 0 else 0.0,
        'spread_q5_q1': float(np.nanmean(spreads)) if len(spreads) else 0.0,
    }
```

---

## 5. `app/ml/core/pipeline_base.py` — guardar el ticker y unificar la limpieza

Reemplaza `_procesar_dataframe_crudo`. Ahora rellena `Open/High/Low` faltantes con el cierre (en la BD son nulables), valida una sola vez, y guarda el ticker en `df.attrs['ticker']` (se conserva al pasar por `ProcessPoolExecutor`).

```python
def _procesar_dataframe_crudo(df: pd.DataFrame, origen_id: str, empresa_id: int = None, ticker: str = None) -> Optional[pd.DataFrame]:
    """
    Motor central: OHLCV crudo (índice = fechas) -> limpieza -> indicadores.
    No importa si viene de BD o CSV. Guarda el ticker en df.attrs para el split y las métricas.
    """
    minimo = MLEngine.WARMUP + MLEngine.DIAS_MEMORIA_IA + MLEngine.DIAS_PREDICCION
    if len(df) < minimo:
        return None

    df = df[['Open', 'High', 'Low', 'Close', 'Volume']].astype(float)
    df.index = pd.to_datetime(df.index)
    # Open/High/Low son opcionales en la BD: si faltan se usa el cierre (si no, dropna borraría la fila)
    for col in ('Open', 'High', 'Low'):
        df[col] = df[col].fillna(df['Close'])
    df['Volume'] = df['Volume'].fillna(0)

    df_valido = DataValidator.validar_y_limpiar(df)
    if df_valido is None or len(df_valido) < minimo:
        print(f"Datos inválidos o insuficientes para {origen_id}")
        return None

    df_procesado = MLEngine.calcular_indicadores(df_valido, empresa_id=empresa_id, ticker=ticker)
    if df_procesado is None or df_procesado.empty:
        return None

    df_procesado.attrs['ticker'] = ticker or origen_id
    return df_procesado
```

En `extraer_y_procesar_empresa`, reemplaza el final del `try` para convertir la fecha y obtener el ticker:

```python
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        ticker = db.query(Empresa.Ticket).filter(Empresa.IdEmpresa == id_empresa).scalar()
        return _procesar_dataframe_crudo(
            df,
            origen_id=f"Empresa_BD_{id_empresa}",
            empresa_id=id_empresa,
            ticker=ticker,
        )
```

Y reemplaza `preparar_datos` y `crear_dataloaders` al final del archivo:

```python
def preparar_datos(lista_dfs: List[pd.DataFrame], **kwargs):
    """Filtra vacíos y arma train/val/test con split temporal (ver data_utils)."""
    dfs_validos = [df for df in lista_dfs if df is not None and not df.empty]
    if not dfs_validos:
        raise ValueError("No hay dataframes válidos")
    return preparar_datos_generico(dfs_validos, **kwargs)

def crear_dataloaders(datos, batch_size=256):
    """Devuelve (train_loader, val_loader, test_loader)"""
    return crear_dataloaders_generico(datos, batch_size=batch_size)
```

---

## 6. `app/ml/core/pipeline_trainer.py` — entrenamiento

Reemplaza el archivo completo. Cambios:

- **BCE simple** en lugar de Focal Loss + `pos_weight` + undersampling (tres balanceos apilados sobre datos que ya están balanceados).
- **Objetivo de regresión escalado** (`log_ret / REG_SCALE`): antes, con `HuberLoss(delta=0.01)`, la pérdida de regresión era unas 200 veces menor que la de clasificación y prácticamente no influía.
- **Early stopping por AUC de validación**: antes se re-optimizaba el umbral en cada época y se usaba un score compuesto, lo que hacía la señal muy ruidosa.
- **Se cargan los mejores pesos antes de calibrar umbrales.**
- **Umbrales alcista/bajista por percentiles** de la probabilidad en validación: con 0.3/0.3, cerca del 30% de las señales serán ALCISTA, 30% BAJISTA y 40% MANTENER. Ajusta `frac_alcista` / `frac_bajista` si quieres señales más o menos selectivas.
- `evaluar_modelo` agrega `ic_global`, `tasa_base_positivos` y, si recibe `meta`, las métricas de cartera.
- Se elimina `ejecutar_validacion_cruzada`, que llamaba a `validacion_cruzada_k_fold` con argumentos incompatibles y habría fallado al ejecutarse.

```python
import random
import sys
import logging

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from tqdm import tqdm
from scipy.stats import spearmanr
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, roc_curve, confusion_matrix, mean_absolute_error)

from app.ml.core.engine import MLEngine
from app.ml.core.logger import configurar_logger
from app.ml.core.metrics import metricas_cartera
from app.ml.core.early_stopping import EarlyStopping


def fijar_semillas(seed: int = MLEngine.SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class PipelineTrainer:
    def __init__(self, architecture_name: str, log_file: str):
        self.architecture_name = architecture_name
        self.logger = configurar_logger(f"ML.Trainer.{architecture_name}", archivo_log=log_file)

    # ------------------------------------------------------------------ utilidades
    def _predecir(self, model, loader, device):
        """Devuelve prob. alcista, retorno predicho (escala real), y_clf, y_reg."""
        model.eval()
        P, R, YC, YR = [], [], [], []
        with torch.no_grad():
            for xb, yrb, ycb in loader:
                p_reg, logits = model(xb.to(device))
                P.append(torch.sigmoid(logits).cpu().numpy().ravel())
                R.append(p_reg.cpu().numpy().ravel() * MLEngine.REG_SCALE)
                YC.append(ycb.numpy().ravel())
                YR.append(yrb.numpy().ravel())
        return [np.concatenate(a) for a in (P, R, YC, YR)]

    # ------------------------------------------------------------------ entrenamiento
    def ejecutar_entrenamiento(self, model, train_loader, val_loader, device,
                               epochs=50, lr=1e-3, lambda_reg=0.5, paciencia=8):
        # Datos ya balanceados -> BCE simple (sin focal loss ni pos_weight encima)
        criterion_clf = nn.BCEWithLogitsLoss()
        # El objetivo se escala (log_ret / REG_SCALE) para que ambas pérdidas pesen parecido
        criterion_reg = nn.HuberLoss(delta=1.0)

        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
        # Criterio estable e independiente del umbral: AUC de validación
        early = EarlyStopping(paciencia=paciencia, delta=0.002, modelo_inicial=model, modo='max')

        self.logger.info("Iniciando entrenamiento", extra={
            "architecture": self.architecture_name, "device": device.type.upper(),
            "batches": len(train_loader), "epochs": epochs})

        train_loss = 0.0
        for epoch in range(epochs):
            model.train()
            total = 0.0
            loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, file=sys.stdout)
            for xb, yrb, ycb in loop:
                xb, yrb, ycb = xb.to(device), yrb.to(device), ycb.to(device)
                optimizer.zero_grad()
                p_reg, logits = model(xb)
                loss = criterion_clf(logits, ycb) + lambda_reg * criterion_reg(p_reg, yrb / MLEngine.REG_SCALE)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                total += loss.item()
                loop.set_postfix(loss=loss.item())
            scheduler.step()
            train_loss = total / max(len(train_loader), 1)

            prob, pred_r, yc, yr = self._predecir(model, val_loader, device)
            val_auc = float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5
            val_ic = spearmanr(pred_r, yr)[0]
            self.logger.info("Epoch completada", extra={
                "epoch": epoch + 1, "train_loss": round(train_loss, 5), "val_auc": round(val_auc, 4),
                "val_ic": round(float(val_ic), 4) if val_ic == val_ic else None,
                "lr": scheduler.get_last_lr()[0]})

            early(val_auc, model)
            if early.detener:
                self.logger.info("Early stopping", extra={"epoch": epoch + 1, "mejor_auc": early.mejor_score})
                break

        # Los umbrales se calibran con los MEJORES pesos, no con los de la última época
        model.load_state_dict(early.mejores_pesos)
        umbrales = self.calibrar_umbrales(model, val_loader, device)

        self.logger.info("Entrenamiento completado", extra={
            "epochs": epoch + 1, "mejor_auc_val": early.mejor_score, **umbrales})
        return {"pesos": early.mejores_pesos, "epochs": epoch + 1, "loss": train_loss,
                "mejor_auc_val": float(early.mejor_score), **umbrales}

    # ------------------------------------------------------------------ umbrales
    def calibrar_umbrales(self, model, val_loader, device, frac_alcista=0.3, frac_bajista=0.3):
        """
        umbral_optimo: J de Youden (para las métricas binarias).
        umbral_alcista / umbral_bajista: percentiles de la probabilidad en validación.
        Con 0.3/0.3 ~30% de las señales serán ALCISTA, ~30% BAJISTA y ~40% MANTENER.
        """
        prob, _, yc, _ = self._predecir(model, val_loader, device)
        fpr, tpr, thr = roc_curve(yc, prob)
        umbral = float(np.clip(thr[np.argmax(tpr - fpr)], 0.0, 1.0))
        return {
            "umbral_optimo": umbral,
            "umbral_alcista": float(np.quantile(prob, 1 - frac_alcista)),
            "umbral_bajista": float(np.quantile(prob, frac_bajista)),
        }

    # ------------------------------------------------------------------ evaluación
    def evaluar_modelo(self, model, loader, device, umbral_decision=0.5, meta=None):
        """Úsalo con el test_loader para el reporte final. `meta` (fecha, ticker) habilita IC y spread."""
        prob, pred_r, yc, yr = self._predecir(model, loader, device)
        prob = np.nan_to_num(prob, nan=0.5)
        pred_r = np.nan_to_num(pred_r, nan=0.0)
        y_pred = (prob > umbral_decision).astype(int)

        cm = confusion_matrix(yc, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        bce = float(nn.functional.binary_cross_entropy(
            torch.tensor(np.clip(prob, 1e-7, 1 - 1e-7)), torch.tensor(yc)).item())

        metricas = {
            'accuracy': float(accuracy_score(yc, y_pred)),
            'precision': float(precision_score(yc, y_pred, zero_division=0)),
            'recall': float(recall_score(yc, y_pred, zero_division=0)),
            'f1_score': float(f1_score(yc, y_pred, zero_division=0)),
            'auc': float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5,
            'mae': float(mean_absolute_error(yr, pred_r)),
            'val_loss': bce,
            'ic_global': float(np.nan_to_num(spearmanr(pred_r, yr)[0])),
            'tasa_base_positivos': float(yc.mean()),
            'tp': int(tp), 'tn': int(tn), 'fp': int(fp), 'fn': int(fn),
        }
        if meta is not None:
            metricas.update(metricas_cartera(meta, prob, pred_r, yr))
        return metricas
```

---

## 7. `app/ml/core/model_versioning.py` — guardar configuración y publicar el trío completo

Tres cambios en `guardar_modelo_versionado`:

1. Agrega el parámetro `configuracion: Dict[str, Any] = None` a la firma.
2. En el diccionario `metadata`, agrega `"configuracion": configuracion or {},` antes de `"metricas"`, y en el `json.dump` agrega `default=float` (evita errores con tipos de NumPy).
3. Reemplaza el bloque del enlace simbólico (`# Crear enlace simbólico al último modelo` … `shutil.copy(model_path, latest_link)`) por:

```python
        # Publicar como "modelo activo": pesos, scaler y metadata SIEMPRE juntos y de la misma versión.
        # (copias en vez de symlinks para que funcione igual en Windows)
        shutil.copy(model_path, self.base_path / f"modelo_acciones_{version}.pth")
        shutil.copy(scaler_path, self.base_path / f"scaler_{version}.pkl")
        shutil.copy(metadata_path, self.base_path / f"metadata_{version}.json")
```

---

## 8. Pipelines LSTM y CNN

### Alias (`data_processor.py` y `trainer.py`)

`app/ml/pipeline_lstm/data_processor.py`:

```python
import pandas as pd
from typing import List
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], **kwargs):
    """Devuelve el dict {'train','val','test', *_meta, 'scaler'} (split temporal)"""
    return preparar_datos(lista_dfs, **kwargs)

def crear_dataloaders_lstm(datos, batch_size=256):
    """Devuelve (train_loader, val_loader, test_loader)"""
    return crear_dataloaders(datos, batch_size)
```

`app/ml/pipeline_lstm/trainer.py`:

```python
from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_lstm = PipelineTrainer("LSTM", "logs/lstm_training.log")

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=50):
    return trainer_lstm.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_lstm(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_lstm.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)
```

`app/ml/pipeline_cnn/data_processor.py`:

```python
import pandas as pd
from typing import List, Optional
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def extraer_y_procesar_empresa_cnn(id_empresa: int) -> Optional[pd.DataFrame]:
    return extraer_y_procesar_empresa(id_empresa)

def preparar_datos_cnn(lista_dfs: List[pd.DataFrame], **kwargs):
    return preparar_datos(lista_dfs, **kwargs)

def crear_dataloaders_cnn(datos, batch_size=256):
    return crear_dataloaders(datos, batch_size)
```

`app/ml/pipeline_cnn/trainer.py`:

```python
from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_cnn = PipelineTrainer("CNN", "logs/cnn_training.log")

def ejecutar_entrenamiento_cnn(model, train_loader, val_loader, device, epochs=50):
    return trainer_cnn.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_cnn(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_cnn.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)
```

### Orquestadores (`pipeline_lstm/orquestador.py` y `pipeline_cnn/orquestador.py`)

Los cambios son iguales en ambos; abajo va la versión LSTM (en la CNN cambia `_lstm` por `_cnn`).

Agrega el import:

```python
from app.ml.core.pipeline_trainer import fijar_semillas
```

Reemplaza la sección **"3. Preparación de Tensores"**:

```python
        # 3. Preparación de Tensores (split temporal train / val / test)
        with Timer("Preparación de Tensores"):
            datos = preparar_datos_lstm(datos_procesados)
            scaler, test_meta = datos['scaler'], datos['test_meta']
            train_loader, val_loader, test_loader = crear_dataloaders_lstm(datos)
            del datos_procesados, datos
            gc.collect()
```

Al inicio del `for mod_db in modelos.all():` agrega `fijar_semillas(MLEngine.SEED)`, y reemplaza todo lo que va desde `modelo_pt.to(device)` hasta `# Guardar métricas en BD` por:

```python
            modelo_pt.to(device)

            res = ejecutar_entrenamiento_lstm(modelo_pt, train_loader, val_loader, device)
            modelo_pt.load_state_dict(res["pesos"])          # evaluar con los MEJORES pesos

            # Evaluación final en TEST (datos que el modelo nunca vio ni se usaron para elegir nada)
            metricas = evaluar_modelo_lstm(modelo_pt, test_loader, device,
                                         umbral_decision=res["umbral_optimo"], meta=test_meta)
            metricas.update({
                'DiasFuturo': MLEngine.DIAS_PREDICCION,
                'loss': res['loss'],
                'epochs': res['epochs'],
                'mejor_auc_val': res['mejor_auc_val'],
                'umbral_optimo': res['umbral_optimo'],
                'umbral_alcista': res['umbral_alcista'],
                'umbral_bajista': res['umbral_bajista'],
            })
            mejores_pesos = res["pesos"]
```

En la llamada a `guardar_modelo_versionado`, agrega el argumento `configuracion=MLEngine.configuracion()`. Por último, **elimina** las dos líneas que guardan el scaler global:

```python
        # Guardar scaler global (para compatibilidad)
        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler.pkl"))
```

> Las métricas nuevas (`ic_medio`, `spread_q5_q1`, umbrales) quedan en `metadata.json`. `MetricaService` solo guarda en la BD las columnas que ya existen; si quieres mostrarlas en la web, agrega columnas a `MetricaModelo`.

---

## 9. `app/auto/generar_predicciones.py` — misma preparación que en entrenamiento

Agrega el import:

```python
from app.ml.core.data_validation import DataValidator
```

Reemplaza desde `LIMITE_DB = ...` hasta justo antes de `# ✅ FIX 2` por:

```python
        # Warm-up de indicadores + ventana del modelo + margen para que EMA50 se estabilice
        LIMITE_DB = MLEngine.WARMUP + MLEngine.DIAS_MEMORIA_IA + 150
        MINIMO_FILAS = MLEngine.WARMUP + MLEngine.DIAS_MEMORIA_IA + 10

        datos_preparados = []
        for emp in empresas:
            try:
                precios = db.query(PrecioHistorico).filter(PrecioHistorico.IdEmpresa == emp.IdEmpresa)\
                            .order_by(PrecioHistorico.Fecha.desc()).limit(LIMITE_DB).all()

                if len(precios) < MINIMO_FILAS:
                    print(f"⚠️ Empresa {emp.Ticket}: insuficientes datos ({len(precios)} < {MINIMO_FILAS})")
                    continue

                # Índice de FECHAS (necesario para el sentimiento) y misma limpieza que en entrenamiento
                df = pd.DataFrame([{'Date': p.Fecha,
                                    'Open': float(p.PrecioApertura or p.PrecioCierre),
                                    'High': float(p.PrecioMaximo or p.PrecioCierre),
                                    'Low': float(p.PrecioMinimo or p.PrecioCierre),
                                    'Close': float(p.PrecioCierre),
                                    'Volume': float(p.Volumen or 0)}
                                   for p in reversed(precios)])
                df['Date'] = pd.to_datetime(df['Date'])
                df = DataValidator.validar_y_limpiar(df.set_index('Date'))
                if df is None:
                    continue
```

Ahora el DataFrame tiene índice de fechas (el sentimiento se calcula bien), pasa por la misma limpieza que en entrenamiento y se piden suficientes filas para el warm-up. Verifiqué que con 300 filas de historia las features de la ventana final coinciden con las del entrenamiento con un error relativo menor a 1e-7.

---

## 10. Entrenamiento offline y línea base

### `entrenar_offline.py` (reemplazo completo)

Usa `glob` en lugar de `data/rutas.py` (las rutas con `\` solo funcionan en Windows), evalúa en test y publica el modelo con versionado para que `MLEngine` pueda usarlo directamente.

```python
"""
Entrenamiento offline desde los CSV de data/ (no necesita la BD).
Uso:  python entrenar_offline.py            (todas las arquitecturas)
      python entrenar_offline.py 1 3        (solo v1 y v3)
"""
import os
import sys
import glob
import json
from datetime import datetime

import torch

from app.ml.core.pipeline_base import extraer_y_procesar_desde_csv, preparar_datos, crear_dataloaders
from app.ml.core.pipeline_trainer import PipelineTrainer, fijar_semillas
from app.ml.core.model_versioning import ModelVersionManager
from app.ml.core.engine import MLEngine
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.arquitectura.v4_lstm_cnn import obtener_modelo_v4

ARQUITECTURAS = {
    1: ("LSTM_v1", obtener_modelo_v1),
    2: ("LSTM_Bidireccional_v2", obtener_modelo_v2),
    3: ("CNN_v3", obtener_modelo_v3),
    4: ("LSTMCNN_v4", obtener_modelo_v4),
}
CARPETA_REPORTES = os.path.join("app", "ml", "models", "entrenamientos_offline")


def cargar_csvs():
    rutas = sorted(glob.glob(os.path.join("data", "data_*.csv")))   # funciona en Windows y Linux
    dfs = []
    for ruta in rutas:
        df = extraer_y_procesar_desde_csv(ruta)
        if df is not None:
            dfs.append(df)
    print(f"✅ {len(dfs)}/{len(rutas)} CSV procesados")
    return dfs


def iniciar_entrenamiento_csv(modelos=(1, 2, 3, 4), epochs=50):
    dfs = cargar_csvs()
    if not dfs:
        print("❌ No hay datos válidos para entrenar.")
        return

    datos = preparar_datos(dfs)
    scaler, test_meta = datos['scaler'], datos['test_meta']
    for k in ('train', 'val', 'test'):
        m = datos[k + '_meta']
        print(f"   {k:5s}: {len(m):7d} ventanas  {m.fecha.min().date()} -> {m.fecha.max().date()}")
    train_loader, val_loader, test_loader = crear_dataloaders(datos)
    del datos, dfs

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"⚡ Dispositivo: {device.type.upper()}")
    os.makedirs(CARPETA_REPORTES, exist_ok=True)
    version_manager = ModelVersionManager(os.path.join("app", "ml", "models"))

    resumen = {}
    for num in modelos:
        if num not in ARQUITECTURAS:
            print(f"❌ Modelo v{num} no válido (use 1-4)")
            continue
        nombre, fabrica = ARQUITECTURAS[num]
        version = f"v{num}"
        print(f"\n{'=' * 60}\n📊 Entrenando {nombre}\n{'=' * 60}")

        fijar_semillas(MLEngine.SEED)
        modelo = fabrica(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)).to(device)
        trainer = PipelineTrainer(nombre, os.path.join(CARPETA_REPORTES, f"training_{version}.log"))

        res = trainer.ejecutar_entrenamiento(modelo, train_loader, val_loader, device, epochs=epochs)
        modelo.load_state_dict(res['pesos'])
        metricas = trainer.evaluar_modelo(modelo, test_loader, device,
                                          umbral_decision=res['umbral_optimo'], meta=test_meta)
        metricas.update({k: res[k] for k in ('loss', 'epochs', 'mejor_auc_val',
                                             'umbral_optimo', 'umbral_alcista', 'umbral_bajista')})
        metricas['DiasFuturo'] = MLEngine.DIAS_PREDICCION

        ruta = version_manager.guardar_modelo_versionado(
            res['pesos'], scaler, metricas, nombre, version,
            "Entrenamiento offline desde CSV", configuracion=MLEngine.configuracion())
        resumen[version] = metricas

        print(f"\n✅ {nombre} — métricas en TEST ({test_meta.fecha.min().date()} en adelante)")
        for k in ('auc', 'accuracy', 'tasa_base_positivos', 'f1_score', 'ic_medio', 'spread_q5_q1', 'mae'):
            print(f"   {k:20s}: {metricas.get(k, 0):.4f}")
        print(f"   guardado en {ruta}")

    with open(os.path.join(CARPETA_REPORTES, "reporte_consolidado.json"), "w", encoding="utf-8") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "configuracion": MLEngine.configuracion(),
                   "modelos": resumen}, f, indent=2, ensure_ascii=False, default=float)
    print(f"\n🎉 Listo. Reporte: {CARPETA_REPORTES}/reporte_consolidado.json")


if __name__ == "__main__":
    elegidos = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4]
    iniciar_entrenamiento_csv(modelos=elegidos)
```

### `scripts/baseline.py` (archivo nuevo, más un `scripts/__init__.py` vacío)

Entrena modelos clásicos con **exactamente el mismo split y features** que las redes. Es la referencia contra la que se comparan en la tesis.

```python
"""
Líneas base con el MISMO split y features que las redes. Ejecutar desde ml-backend/:
    python -m scripts.baseline
Si una red no supera a estos modelos en TEST, no está aportando.
"""
import os
import glob

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, accuracy_score

from app.ml.core.pipeline_base import extraer_y_procesar_desde_csv, preparar_datos
from app.ml.core.metrics import metricas_cartera
from app.ml.core.engine import MLEngine


def resumen_ventana(x):
    """Último día + promedio de la ventana -> vector plano para modelos clásicos."""
    return np.hstack([x[:, -1, :], x.mean(axis=1)])


def main():
    dfs = [extraer_y_procesar_desde_csv(r) for r in sorted(glob.glob(os.path.join("data", "data_*.csv")))]
    datos = preparar_datos([d for d in dfs if d is not None])
    xt, yrt, yct = datos['train']
    xe, yre, yce = datos['test']
    meta = datos['test_meta']
    Xt, Xe = resumen_ventana(xt), resumen_ventana(xe)
    i_ret21 = MLEngine.FEATURES.index('Ret_21')

    candidatos = {
        'Siempre alcista': np.ones(len(yce)),
        'Momentum (Ret_21)': xe[:, -1, i_ret21],
    }
    for nombre, modelo in {
        'Regresión logística': LogisticRegression(max_iter=2000, C=0.1),
        'Gradient Boosting': HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05,
                                                            max_leaf_nodes=15, random_state=MLEngine.SEED),
    }.items():
        modelo.fit(Xt, yct)
        candidatos[nombre] = modelo.predict_proba(Xe)[:, 1]

    filas = []
    for nombre, score in candidatos.items():
        constante = np.std(score) == 0
        corte = 0.0 if nombre.startswith('Momentum') else 0.5
        fila = {'modelo': nombre,
                'accuracy': accuracy_score(yce, score > corte),
                'auc': 0.5 if constante else roc_auc_score(yce, score)}
        if not constante:
            fila.update(metricas_cartera(meta, score, score, yre))
        filas.append(fila)

    print(f"\nTEST: {meta.fecha.min().date()} -> {meta.fecha.max().date()} | {len(yce)} ventanas | "
          f"positivos {yce.mean():.3f}\n")
    print(pd.DataFrame(filas).round(4).to_string(index=False))


if __name__ == "__main__":
    main()
```

### `app/main.py` (limpieza opcional)

El bloque `if IA_AVAILABLE:` del `lifespan` carga los `.pth` y `scaler.pkl` en `app.state`, pero nada en el código usa `app.state.model_v*` ni `app.state.scaler`. Tras estos cambios `scaler.pkl` ya no existe, así que mostrará una advertencia al arrancar. Puedes eliminar ese bloque sin efectos secundarios.

---

## 11. Reentrenar y verificar

Desde `ml-backend/`:

```bash
# 1. Línea base (2–3 minutos en CPU)
python -m scripts.baseline

# 2. Entrenamiento offline desde CSV (una arquitectura primero para probar)
python entrenar_offline.py 3
python entrenar_offline.py          # todas

# 3. Entrenamiento desde la BD (como antes)
python entrenar_con_noticias.py --all
```

### Qué deberías ver

La línea base con los CSV actuales da (test: jul-2024 → abr-2026):

| Modelo | Accuracy | AUC | IC medio | Spread Q5–Q1 |
|--------|---------:|----:|---------:|-------------:|
| Siempre alcista | 0.547 | 0.500 | — | — |
| Momentum (Ret_21) | 0.492 | 0.492 | 0.001 | 0.10% |
| Regresión logística | 0.510 | 0.519 | −0.001 | 0.40% |
| Gradient Boosting | 0.517 | 0.531 | 0.020 | 0.83% |

### Lista de verificación

- [ ] Los logs muestran train / val / test con fechas que **no se solapan** y los 86 tickers en cada conjunto.
- [ ] El AUC de validación sube en las primeras épocas y el early stopping se detiene antes de la época 50.
- [ ] Ningún modelo predice todo de una sola clase (revisa `tp/fp/fn/tn` en `metadata_vX.json`).
- [ ] En `app/ml/models/` existen `modelo_acciones_vX.pth`, `scaler_vX.pkl` y `metadata_vX.json` para cada versión.
- [ ] `generar_predicciones` produce una mezcla de ALCISTA, BAJISTA y MANTENER.
- [ ] Comparas cada red contra el Gradient Boosting en **test**, no en validación.

### Cómo interpretar los resultados

Con datos diarios y horizonte de 21 días, el problema es muy difícil: el Gradient Boosting llega a AUC 0.53. Una red que alcance **0.53–0.56 en test** con IC positivo es un resultado realista y defendible. Si una red no supera a la línea base, ese también es un hallazgo válido para la tesis. Si ves AUC de 0.65 o más, sospecha primero de una fuga de información antes de celebrar.

Fíjate en que la accuracy puede quedar **por debajo** de "siempre alcista" (0.547) aunque el modelo sea útil: el período de test fue alcista y el modelo se entrena balanceado. Por eso el AUC, el IC y el spread son mejores métricas que la accuracy aquí.

---

## 12. Configuración (todo en `MLEngine`)

| Constante | Valor | Qué controla |
|-----------|-------|--------------|
| `DIAS_MEMORIA_IA` | 90 | Largo de la ventana de entrada |
| `DIAS_PREDICCION` | 21 | Horizonte del objetivo |
| `WARMUP` | 60 | Filas iniciales descartadas por indicadores incompletos |
| `FECHA_VAL` / `FECHA_TEST` | 2023-01-01 / 2024-07-01 | Cortes temporales. Al actualizar datos, muévelos hacia adelante manteniendo al menos 12 meses en cada conjunto |
| `STRIDE_TRAIN` | 5 | Paso entre ventanas de entrenamiento |
| `ZONA_MUERTA` | 0.25 | Fracción de la volatilidad esperada bajo la cual se descarta una muestra de train (0 = desactivado) |
| `BALANCE_METHOD` | undersample | `undersample`, `oversample` o `none` |
| `REG_SCALE` | 0.1 | Escala del objetivo de regresión |
| `CLIP_SCALER` | 10 | Recorte tras el escalado (igual en train e inferencia) |
| `SEED` | 42 | Reproducibilidad |

Si cambias `FEATURES`, `DIAS_MEMORIA_IA` o cualquier cosa del cálculo de indicadores, **hay que reentrenar**: el engine rechaza modelos cuya configuración no coincide.

---

## 13. Siguientes pasos (opcionales, después de tener todo funcionando)

**Experimentos rápidos, de uno en uno:** `ZONA_MUERTA` en 0 / 0.25 / 0.5; `DIAS_MEMORIA_IA` en 30 / 60 / 90 (ventanas más cortas suelen funcionar igual o mejor con datos diarios); `lambda_reg` en 0 (solo clasificación) frente a 0.5.

**Retorno relativo al mercado.** Predecir `log_ret(activo) − log_ret(SPY)` en vez del retorno absoluto elimina el movimiento general del mercado, que ningún indicador técnico puede anticipar, y suele mejorar el IC. Se implementa en `preparar_datos_generico`: carga SPY una vez, alinea por fecha (`spy_close.reindex(df.index).ffill()`) y resta su retorno a 21 días al de cada activo.

**Validación walk-forward.** Para la tesis es más robusto reportar varios cortes que uno solo. Como `preparar_datos` acepta las fechas como parámetro:

```python
for fecha_val, fecha_test in [('2020-01-01', '2021-07-01'),
                              ('2021-07-01', '2023-01-01'),
                              ('2023-01-01', '2024-07-01')]:
    datos = preparar_datos(dfs, fecha_val=fecha_val, fecha_test=fecha_test)
    # entrenar y evaluar; filtra test_meta a los 18 meses siguientes a fecha_test
    # para que cada fold tenga un período de test del mismo largo
```

Reporta la media y la desviación del AUC y del IC entre folds.

**Criptomonedas.** BTC, ETH, SOL, ADA, DOT y XRP cotizan los 7 días y tienen volatilidades muy distintas a las acciones. Prueba entrenar con y sin ellas, o agrega un embedding por tipo de activo.

**Sentimiento de noticias.** Para volver a usar `NewsSentiment` como feature necesitas cobertura histórica durante todo el período de entrenamiento; si solo hay noticias recientes, el modelo verá 0.5 en el 99% de los datos. Una alternativa es entrenar un modelo solo con el período que tiene noticias y comparar contra el mismo período sin ellas.
