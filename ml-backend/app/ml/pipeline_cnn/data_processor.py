from app.ml.core.pipeline_base import extraer_y_procesar_empresa, preparar_datos, crear_dataloaders

def extraer_y_procesar_empresa_cnn(id_empresa: int) -> Optional[pd.DataFrame]:
    """Alias para consistencia con nomenclatura CNN"""
    return extraer_y_procesar_empresa(id_empresa)

def preparar_datos_cnn(lista_dfs: List[pd.DataFrame], batch_size: int = 50):
    """Alias para consistencia con nomenclatura CNN"""
    return preparar_datos(lista_dfs, batch_size)

def crear_dataloaders_cnn(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size=256):
    """Alias para consistencia con nomenclatura CNN"""
    return crear_dataloaders(x_t, yr_t, yc_t, x_v, yr_v, yc_v, batch_size)