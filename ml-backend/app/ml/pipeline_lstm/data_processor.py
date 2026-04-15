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

def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    """Extrae datos de la BD y aplica indicadores técnicos con validación"""
    db = SessionLocal()
    try:
        registros = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(registros) < 60: return None

        df = pd.DataFrame([{
            'Date': r.Fecha,
            'Open': r.PrecioApertura,
            'High': r.PrecioMaximo,
            'Low': r.PrecioMinimo,
            'Close': r.PrecioCierre,
            'Volume': r.Volumen
        } for r in registros]).set_index('Date')

        df = df.astype(float)
        df.replace([np.inf, -np.inf], np.nan, inplace=True) # Prevenir veneno

        # Validar datos antes de procesar
        df_valido = DataValidator.validar_y_limpiar(df)

        if df_valido is None or df_valido.empty:
            print(f"Datos inválidos para empresa {id_empresa}")
            return None

        df_procesado = MLEngine.calcular_indicadores(df_valido)
        df_procesado.ffill(inplace=True)
        df_procesado.bfill(inplace=True)

        # Validar datos procesados
        df_procesado_valido = DataValidator.validar_y_limpiar(df_procesado)
        return df_procesado_valido if df_procesado_valido is not None and not df_procesado_valido.empty else None

    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {str(e)}")
        return None
    finally:
        db.close()

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], batch_size: int = 50):
    """Usa la implementación genérica para consistencia con validación de datos"""
    # Validar todos los dataframes antes de procesar
    dfs_validos = []

    for df in lista_dfs:
        df_valido = DataValidator.validar_y_limpiar(df)
        if df_valido is not None and not df_valido.empty:
            dfs_validos.append(df_valido)

    if not dfs_validos:
        raise ValueError("No hay dataframes válidos después de la validación")

    return preparar_datos_generico(dfs_validos, batch_size)

def crear_dataloaders_lstm(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size=256):
    """Usa la implementación genérica para consistencia"""
    return crear_dataloaders_generico(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size, drop_last=True)