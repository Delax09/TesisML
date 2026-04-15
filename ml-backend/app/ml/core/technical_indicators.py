"""Módulo robusto de indicadores técnicos"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class TechnicalIndicators:
    """Clase centralizada para cálculo seguro de indicadores"""

    MIN_PERIODS = 20  # Mínimo de períodos para validez

    @staticmethod
    def validar_entrada(df: pd.DataFrame) -> bool:
        """Valida que el dataframe sea viable para indicadores"""
        if len(df) < TechnicalIndicators.MIN_PERIODS:
            logger.warning(f"DataFrame muy corto: {len(df)} filas < {TechnicalIndicators.MIN_PERIODS}")
            return False

        required_cols = ['Close', 'Volume']
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"Columna requerida faltante: {col}")
                return False

            if df[col].isna().sum() / len(df) > 0.1:  # >10% NaN
                logger.warning(f"Columna {col} tiene >10% NaN")
                return False

        return True

    @staticmethod
    def rsi(close: pd.Series, period: int = 14) -> pd.Series:
        """RSI con manejo robusto de excepciones"""
        try:
            delta = close.diff()
            gain = delta.where(delta > 0, 0).rolling(window=period).mean()
            loss = -delta.where(delta < 0, 0).rolling(window=period).mean()

            # Evitar división por cero
            rs = gain / loss.replace(0, 1e-10)
            rsi = 100 - (100 / (1 + rs))

            # Sanitizar
            rsi = rsi.clip(0, 100)
            return rsi.fillna(50)  # Valor neutro si falla
        except Exception as e:
            logger.error(f"Error en RSI: {str(e)}")
            return pd.Series(50, index=close.index)  # Default

    @staticmethod
    def bollinger_bands(close: pd.Series, period: int = 20, num_std: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Bandas de Bollinger con protección"""
        try:
            sma = close.rolling(window=period).mean()
            std = close.rolling(window=period).std()

            upper = sma + (std * num_std)
            lower = sma - (std * num_std)

            # Sanitizar
            bb_pct = ((close - lower) / (upper - lower).replace(0, 1)).clip(0, 1)

            return upper.ffill(), lower.bfill(), bb_pct.fillna(0.5)
        except Exception as e:
            logger.error(f"Error en Bollinger Bands: {str(e)}")
            return close, close, pd.Series(0.5, index=close.index)

    @staticmethod
    def sanitizar_infinitos(df: pd.DataFrame) -> pd.DataFrame:
        """Reemplaza infinitos por NaN y rellena"""
        df = df.replace([np.inf, -np.inf], np.nan)

        # Relleno progresivo: forward fill, luego backward fill
        return df.ffill().bfill().fillna(0)