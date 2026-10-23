"""Módulo centralizado de validación y sanitización de datos"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
import logging


logger = logging.getLogger(__name__)

class DataValidator:
    """Centraliza validación y sanitización de datos"""

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

    @staticmethod
    def validar_dataset_completo(df: pd.DataFrame,
                                min_filas: int = 50,
                                required_columns: list = None) -> Dict[str, Any]:
        """
        Validación completa de un dataset

        Returns:
            Dict con resultados de validación
        """
        resultados = {
            'valido': True,
            'errores': [],
            'advertencias': [],
            'estadisticas': {}
        }

        # Validar tamaño mínimo
        if len(df) < min_filas:
            resultados['valido'] = False
            resultados['errores'].append(f"Dataset muy pequeño: {len(df)} < {min_filas} filas")

        # Validar columnas requeridas
        if required_columns:
            missing_cols = [col for col in required_columns if col not in df.columns]
            if missing_cols:
                resultados['valido'] = False
                resultados['errores'].append(f"Columnas faltantes: {missing_cols}")

        # Verificar NaN excesivos
        nan_ratios = df.isna().mean()
        high_nan_cols = nan_ratios[nan_ratios > 0.5].index.tolist()
        if high_nan_cols:
            resultados['advertencias'].append(f"Columnas con >50% NaN: {high_nan_cols}")

        # Estadísticas básicas
        resultados['estadisticas'] = {
            'filas': len(df),
            'columnas': len(df.columns),
            'nan_total': df.isna().sum().sum(),
            'nan_porcentaje': (df.isna().sum().sum() / (len(df) * len(df.columns))) * 100
        }

        return resultados

    @staticmethod
    def detectar_outliers(df: pd.DataFrame,
                            method: str = 'iqr',
                            threshold: float = 1.5) -> Dict[str, list]:
        """
        Detecta outliers en el dataset

        Args:
            df: DataFrame a analizar
            method: 'iqr' o 'zscore'
            threshold: Umbral para detección

        Returns:
            Dict con índices de outliers por columna
        """
        outliers = {}

        for col in df.select_dtypes(include=[np.number]).columns:
            if method == 'iqr':
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                outlier_indices = df[(df[col] < lower_bound) | (df[col] > upper_bound)].index.tolist()
            elif method == 'zscore':
                z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
                outlier_indices = df[z_scores > threshold].index.tolist()
            else:
                continue

            if outlier_indices:
                outliers[col] = outlier_indices

        return outliers

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

    @staticmethod
    def validar_y_limpiar(df: pd.DataFrame,
                            min_filas: int = 50,
                            required_columns: list = None) -> Optional[pd.DataFrame]:
        """
        Valida y limpia un dataframe de una sola vez.

        Args:
            df: DataFrame a validar y limpiar
            min_filas: Número mínimo de filas requeridas
            required_columns: Columnas requeridas (opcional)

        Returns:
            DataFrame limpio y válido, None si no lo es
        """
        if df is None or df.empty:
            logger.warning("DataFrame vacío o None")
            return None

        # Validar tamaño mínimo
        if len(df) < min_filas:
            logger.warning(f"Dataset muy pequeño: {len(df)} < {min_filas} filas")
            return None

        # Validar columnas requeridas (antes de procesar)
        if required_columns:
            missing_cols = [col for col in required_columns if col not in df.columns]
            if missing_cols:
                logger.warning(f"Columnas faltantes: {missing_cols}")
                return None

        try:
            # Sanitizar datos
            df_limpio = DataValidator.sanitizar_datos(df, fillna_strategy='ffill')

            # Verificar que no quedó vacío después de la limpieza
            if df_limpio.empty:
                logger.warning("Dataset quedó vacío después de limpieza")
                return None

            logger.debug(f"Dataset validado y limpio: {len(df_limpio)} filas, {len(df_limpio.columns)} columnas")
            return df_limpio

        except Exception as e:
            logger.error(f"Error al validar y limpiar dataset: {str(e)}", exc_info=True)
            return None