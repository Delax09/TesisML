import pandas as pd
from typing import List
from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], **kwargs):
    """Devuelve el dict {'train','val','test', *_meta, 'scaler'} (split temporal)"""
    return preparar_datos(lista_dfs, **kwargs)

def crear_dataloaders_lstm(datos, batch_size=256):
    """Devuelve (train_loader, val_loader, test_loader)"""
    return crear_dataloaders(datos, batch_size)