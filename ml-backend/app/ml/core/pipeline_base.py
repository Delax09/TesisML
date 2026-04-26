import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler
from numpy.lib.stride_tricks import sliding_window_view
import gc
from typing import Tuple, List, Optional
from tqdm import tqdm

from app.db.sessions import SessionLocal
from app.models.precio_historico import PrecioHistorico
from app.ml.core.engine import MLEngine
from app.ml.core.data_utils import preparar_datos_generico, crear_dataloaders_generico
from app.ml.core.data_validation import DataValidator

def _procesar_dataframe_crudo(df: pd.DataFrame, origen_id: str) -> Optional[pd.DataFrame]:
    """
    Motor central de procesamiento. Toma un DataFrame crudo estandarizado,
    aplica indicadores y valida. No le importa si viene de BD o CSV.
    """
    if len(df) < 60:
        return None

    df = df.astype(float)
    df.replace([np.inf, -np.inf], np.nan, inplace=True) # Prevenir veneno

    # Validar datos antes de procesar
    df_valido = DataValidator.validar_y_limpiar(df)

    if df_valido is None or df_valido.empty:
        print(f"Datos inválidos para origen {origen_id}")
        return None

    # Calcular indicadores técnicos (SMA, Bandas, RSI, etc.)
    df_procesado = MLEngine.calcular_indicadores(df_valido)
    df_procesado.ffill(inplace=True)
    df_procesado.bfill(inplace=True)

    # Validar datos procesados
    df_procesado_valido = DataValidator.validar_y_limpiar(df_procesado)
    return df_procesado_valido if df_procesado_valido is not None and not df_procesado_valido.empty else None

def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    """Extrae datos de la Base de Datos en Supabase (Producción)"""
    db = SessionLocal()
    try:
        query = db.query(
            PrecioHistorico.Fecha.label('Date'),
            PrecioHistorico.PrecioApertura.label('Open'),
            PrecioHistorico.PrecioMaximo.label('High'),
            PrecioHistorico.PrecioMinimo.label('Low'),
            PrecioHistorico.PrecioCierre.label('Close'),
            PrecioHistorico.Volumen.label('Volume')
        ).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc())

        df = pd.read_sql(query.statement, db.get_bind())

        if df.empty:
            return None

        df.set_index('Date', inplace=True)
        return _procesar_dataframe_crudo(df, origen_id=f"Empresa_BD_{id_empresa}")

    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {str(e)}")
        return None
    finally:
        db.close()

def extraer_y_procesar_desde_csv(ruta_csv: str) -> Optional[pd.DataFrame]:
    """
    Adaptador para archivos CSV locales. 
    Traduce las columnas de Supabase al estándar del pipeline.
    """
    try:
        df = pd.read_csv(ruta_csv)
        
        mapeo_columnas = {
            'Fecha': 'Date',
            'PrecioApertura': 'Open',
            'PrecioMaximo': 'High',
            'PrecioMinimo': 'Low',
            'PrecioCierre': 'Close',
            'Volumen': 'Volume'
        }
        
        df.rename(columns=mapeo_columnas, inplace=True)
        
        columnas_requeridas = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
        for col in columnas_requeridas:
            if col not in df.columns:
                print(f"Error: El CSV {ruta_csv} no contiene la columna origen para {col}")
                return None

        # Formatear fecha e índice
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        
        # Dejar solo el OHLCV para recalcular indicadores limpios
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']]

        return _procesar_dataframe_crudo(df, origen_id=f"CSV_{ruta_csv}")

    except Exception as e:
        print(f"Error leyendo CSV {ruta_csv}: {str(e)}")
        return None

def preparar_datos(lista_dfs: List[pd.DataFrame], batch_size: int = 50):
    """Valida y prepara la memoria tensorial universalmente"""
    dfs_validos = []

    for df in lista_dfs:
        df_valido = DataValidator.validar_y_limpiar(df)
        if df_valido is not None and not df_valido.empty:
            dfs_validos.append(df_valido)

    if not dfs_validos:
        raise ValueError("No hay dataframes válidos después de la validación")

    return preparar_datos_generico(dfs_validos, batch_size)

def crear_dataloaders(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size=256):
    """Crea los lotes para PyTorch"""
    return crear_dataloaders_generico(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size, drop_last=True)