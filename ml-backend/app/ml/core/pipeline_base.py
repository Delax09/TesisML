import os
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
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.ml.core.engine import MLEngine
from app.ml.core.data_utils import preparar_datos_generico, crear_dataloaders_generico
from app.ml.core.data_validation import DataValidator

# Cache por proceso: los workers de ProcessPoolExecutor cargan la serie de mercado una sola vez
_SERIE_MERCADO_BD: Optional[pd.Series] = None
_SERIE_MERCADO_CSV: dict = {}


def cargar_serie_mercado_bd(db=None, limite: int = None) -> pd.Series:
    """
    Cierres de MLEngine.TICKER_MERCADO desde la BD (índice = fecha).
    `limite`: solo las últimas N filas (inferencia). Sin límite se cachea por proceso.
    """
    global _SERIE_MERCADO_BD
    if limite is None and _SERIE_MERCADO_BD is not None:
        return _SERIE_MERCADO_BD

    cerrar = db is None
    db = db or SessionLocal()
    try:
        emp = db.query(Empresa).filter(Empresa.Ticket == MLEngine.TICKER_MERCADO).first()
        if emp is None:
            raise ValueError(f"No existe la empresa de mercado '{MLEngine.TICKER_MERCADO}' en la BD")
        q = db.query(PrecioHistorico.Fecha, PrecioHistorico.PrecioCierre)              .filter(PrecioHistorico.IdEmpresa == emp.IdEmpresa)              .order_by(PrecioHistorico.Fecha.desc())
        if limite:
            q = q.limit(limite)
        filas = q.all()
    finally:
        if cerrar:
            db.close()

    if not filas:
        raise ValueError(f"'{MLEngine.TICKER_MERCADO}' no tiene precios en la BD")
    serie = pd.Series([float(c) for _, c in filas], index=pd.to_datetime([f for f, _ in filas])).sort_index()
    if limite is None:
        _SERIE_MERCADO_BD = serie
    return serie


def cargar_serie_mercado_csv(carpeta: str) -> pd.Series:
    """Cierres de MLEngine.TICKER_MERCADO desde <carpeta>/data_<TICKER>.csv."""
    if carpeta not in _SERIE_MERCADO_CSV:
        ruta = os.path.join(carpeta, f"data_{MLEngine.TICKER_MERCADO}.csv")
        if not os.path.exists(ruta):
            raise FileNotFoundError(f"Falta {ruta}: se necesita para las features de mercado")
        df = pd.read_csv(ruta)
        col_fecha = 'Fecha' if 'Fecha' in df.columns else 'Date'
        col_cierre = 'PrecioCierre' if 'PrecioCierre' in df.columns else 'Close'
        _SERIE_MERCADO_CSV[carpeta] = pd.Series(df[col_cierre].astype(float).values,
                                                index=pd.to_datetime(df[col_fecha])).sort_index()
    return _SERIE_MERCADO_CSV[carpeta]


def _procesar_dataframe_crudo(df: pd.DataFrame, origen_id: str, empresa_id: int = None, ticker: str = None,
                              serie_mercado: pd.Series = None) -> Optional[pd.DataFrame]:
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

    df_procesado = MLEngine.calcular_indicadores(df_valido, empresa_id=empresa_id, ticker=ticker,
                                                 serie_mercado=serie_mercado)
    if df_procesado is None or df_procesado.empty:
        return None

    df_procesado.attrs['ticker'] = ticker or origen_id
    return df_procesado

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
        return _procesar_dataframe_crudo(
            df,
            origen_id=f"Empresa_BD_{id_empresa}",
            empresa_id=id_empresa,
            serie_mercado=cargar_serie_mercado_bd(db)
        )

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

        ticker = os.path.splitext(os.path.basename(ruta_csv))[0]
        if ticker.startswith('data_'):
            ticker = ticker.replace('data_', '')

        return _procesar_dataframe_crudo(
            df,
            origen_id=f"CSV_{ruta_csv}",
            ticker=ticker,
            serie_mercado=cargar_serie_mercado_csv(os.path.dirname(ruta_csv) or ".")
        )

    except Exception as e:
        print(f"Error leyendo CSV {ruta_csv}: {str(e)}")
        return None

def preparar_datos(lista_dfs: List[pd.DataFrame], **kwargs):
    """Valida y prepara la memoria tensorial universalmente (kwargs -> preparar_datos_generico)"""
    dfs_validos = []

    for df in lista_dfs:
        df_valido = DataValidator.validar_y_limpiar(df)
        if df_valido is not None and not df_valido.empty:
            dfs_validos.append(df_valido)

    if not dfs_validos:
        raise ValueError("No hay dataframes válidos después de la validación")

    # Por defecto usa la configuración de MLEngine (fechas, balance, stride, zona muerta)
    return preparar_datos_generico(dfs_validos, **kwargs)

def crear_dataloaders(datos, batch_size=MLEngine.BATCH_SIZE):
    """Crea los lotes para PyTorch a partir de los datos preparados."""
    return crear_dataloaders_generico(datos, batch_size)