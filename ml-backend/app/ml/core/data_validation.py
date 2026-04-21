"""Módulo centralizado de validación y sanitización de datos"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
import logging
from sklearn.preprocessing import MinMaxScaler
from app.ml.core.spark_processor import fusionar_datos_con_spark


logger = logging.getLogger(__name__)

class DataValidator:
    """Centraliza validación y sanitización de datos"""

    @staticmethod
    def sanitizar_datos(df: pd.DataFrame,
                        fillna_strategy: str = 'ffill') -> pd.DataFrame:
        """
        Estrategia única de sanitización

        Args:
            df: DataFrame a sanitizar
            fillna_strategy: 'ffill', 'bfill', 'mean', 'zero'
        """
        # 1. Reemplazar infinitos
        df = df.replace([np.inf, -np.inf], np.nan)

        # 2. Eliminar filas con muchos NaN
        df = df.dropna(thresh=len(df.columns) * 0.8)

        # 3. Rellenar según estrategia
        if fillna_strategy == 'ffill':
            df = df.ffill().bfill()
        elif fillna_strategy == 'mean':
            df = df.fillna(df.mean())
        elif fillna_strategy == 'zero':
            df = df.fillna(0)

        # 4. Clip de valores extremos (3 sigmas)
        for col in df.select_dtypes(include=[np.number]):
            mean = df[col].mean()
            std = df[col].std()
            lower = mean - 3 * std
            upper = mean + 3 * std
            df[col] = df[col].clip(lower, upper)

        return df

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
    def balancear_dataset(X: np.ndarray,
                            y_clf: np.ndarray,
                            method: str = 'smote') -> tuple:
        """
        Balancea dataset desequilibrado
        """
        try:
            if method == 'smote':
                from imblearn.over_sampling import SMOTE
                smote = SMOTE(random_state=42)
                X_bal, y_bal = smote.fit_resample(X.reshape(X.shape[0], -1), y_clf)
                X_bal = X_bal.reshape(-1, X.shape[1], X.shape[2])
            elif method == 'undersample':
                from imblearn.under_sampling import RandomUnderSampler
                rus = RandomUnderSampler(random_state=42)
                X_bal, y_bal = rus.fit_resample(X.reshape(X.shape[0], -1), y_clf)
                X_bal = X_bal.reshape(-1, X.shape[1], X.shape[2])
            elif method == 'oversample':
                from imblearn.over_sampling import RandomOverSampler
                ros = RandomOverSampler(random_state=42)
                X_bal, y_bal = ros.fit_resample(X.reshape(X.shape[0], -1), y_clf)
                X_bal = X_bal.reshape(-1, X.shape[1], X.shape[2])
            else:
                return X, y_clf

            logger.info(f"Dataset balanceado: {len(y_clf)} -> {len(y_bal)} muestras")
            return X_bal, y_bal

        except ImportError:
            logger.warning("imbalanced-learn no instalado, saltando balanceo")
            return X, y_clf

    @staticmethod
    def validar_y_limpiar(df: pd.DataFrame,
                            min_filas: int = 50,
                            required_columns: list = None) -> Optional[pd.DataFrame]:
        """
        Valida y limpia un dataframe de una sola vez, enriqueciendo 
        los datos con Spark si el módulo está disponible.

        Args:
            df: DataFrame a validar y limpiar
            min_filas: Número mínimo de filas requeridas
            required_columns: Columnas requeridas (opcional)

        Returns:
            DataFrame limpio y enriquecido si es válido, None si no lo es
        """
        if df is None or df.empty:
            logger.warning("DataFrame vacío o None")
            return None

        # Validar tamaño mínimo
        if len(df) < min_filas:
            logger.warning(f"Dataset muy pequeño: {len(df)} < {min_filas} filas")
            return None

        # Validar columnas requeridas (antes de enriquecer)
        if required_columns:
            missing_cols = [col for col in required_columns if col not in df.columns]
            if missing_cols:
                logger.warning(f"Columnas faltantes: {missing_cols}")
                return None

        try:
            # --- INTEGRACIÓN SPARK ---
            # Ejecutar el cruce de datos con la macroeconomía usando Spark
            if fusionar_datos_con_spark is not None:
                logger.info("Enriqueciendo dataset con Spark (FRED API)...")
                df_enriquecido = fusionar_datos_con_spark(df)
                
                # Verificar si el enriquecimiento fue exitoso
                if df_enriquecido is not None and not df_enriquecido.empty and 'FEDFUNDS' in df_enriquecido.columns:
                    df = df_enriquecido
                    logger.info("Enriquecimiento con Spark exitoso")
                elif df_enriquecido is not None and not df_enriquecido.empty:
                    df = df_enriquecido
                    logger.warning("Enriquecimiento parcial: DataFrame retornado pero sin columna FEDFUNDS")
                else:
                    logger.warning("Enriquecimiento fallido: Usando datos base sin FRED")
            else:
                logger.warning("Módulo de Spark no disponible. Continuando con datos base.")
            # -------------------------

            # Sanitizar datos (ahora incluye las features de macroeconomía si Spark operó con éxito)
            df_limpio = DataValidator.sanitizar_datos(df, fillna_strategy='ffill')

            # Verificar que no quedó vacío después de la limpieza
            if df_limpio.empty:
                logger.warning("Dataset quedó vacío después de limpieza")
                return None

            # --- NUEVA LÍNEA DE SEGURIDAD (FALLBACK) ---
            # Si FEDFUNDS no existe, inyectar valor por defecto (0.0)
            # Esto asegura compatibilidad con MLEngine.FEATURES que incluye 'FEDFUNDS'
            if 'FEDFUNDS' not in df_limpio.columns:
                logger.warning("Columna FEDFUNDS no encontrada. Inyectando valores por defecto (0.0).")
                df_limpio['FEDFUNDS'] = 0.0
            # -------------------------------------------

            logger.debug(f"Dataset validado y limpio: {len(df_limpio)} filas, {len(df_limpio.columns)} columnas")
            return df_limpio

        except Exception as e:
            logger.error(f"Error al validar y limpiar dataset: {str(e)}", exc_info=True)
            return None