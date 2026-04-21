import pandas as pd
from typing import List, Optional
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], batch_size: int = 50):
    """Alias para consistencia con nomenclatura LSTM"""
    return preparar_datos(lista_dfs, batch_size)

def crear_dataloaders_lstm(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size=256):
    """Alias para consistencia con nomenclatura LSTM"""
    return crear_dataloaders(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size)