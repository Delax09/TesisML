import pandas as pd
from typing import List, Optional
from app.ml.core.engine import MLEngine
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def extraer_y_procesar_empresa_cnn(id_empresa: int) -> Optional[pd.DataFrame]:
    return extraer_y_procesar_empresa(id_empresa)

def preparar_datos_cnn(lista_dfs: List[pd.DataFrame], **kwargs):
    return preparar_datos(lista_dfs, **kwargs)

def crear_dataloaders_cnn(datos, batch_size=None):
    batch_size = batch_size or MLEngine.BATCH_SIZE
    return crear_dataloaders(datos, batch_size)