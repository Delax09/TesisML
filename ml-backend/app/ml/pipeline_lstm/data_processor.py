import pandas as pd
from typing import List
from app.ml.core.engine import MLEngine
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], **kwargs):
    return preparar_datos(lista_dfs, **kwargs)

def crear_dataloaders_lstm(datos, batch_size=None):
    batch_size = batch_size or MLEngine.BATCH_SIZE
    return crear_dataloaders(datos, batch_size)