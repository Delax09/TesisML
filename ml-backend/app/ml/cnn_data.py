"""
Módulo de datos para entrenamiento CNN supervisado
Contiene funciones para cargar empresas, construir el dataset y preparar datos.
"""
import concurrent.futures
import torch
import pandas as pd
import numpy as np
from tqdm import tqdm
from typing import List, Tuple, Optional

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA
from app.ml.data_processing import extraer_y_procesar_empresa, preparar_datos_masivos_optimizado


def cargar_empresas_y_modelos_cnn(id_modelo_especifico: int = None):
    """Carga empresas activas y modelos CNN (version v3) desde la base de datos."""
    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        query_modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version == "v3")
        if id_modelo_especifico:
            query_modelos = query_modelos.filter(ModeloIA.IdModelo == id_modelo_especifico)
        modelos_activos = query_modelos.all()

        return ids_empresas, modelos_activos
    finally:
        db.close()


def construir_entorno_empresas(ids_empresas: List[int], max_workers: int = 10) -> List[pd.DataFrame]:
    """Construye el dataset extrayendo y procesando datos para cada empresa."""
    if not ids_empresas:
        return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(max_workers, len(ids_empresas))) as executor:
        resultados = list(tqdm(
            executor.map(extraer_y_procesar_empresa, ids_empresas),
            total=len(ids_empresas),
            desc="Construyendo Dataset"
        ))

    return [df for df in resultados if df is not None]


def preparar_datos_cnn(lista_dfs: List[pd.DataFrame]):
    """Prepara los datos de entrenamiento CNN reutilizando la pipeline estándar."""
    return preparar_datos_masivos_optimizado(lista_dfs)


def separar_train_validation(x_train: np.ndarray, y_reg: np.ndarray, y_clf: np.ndarray,
                            valid_ratio: float = 0.1, device: Optional[torch.device] = None):
    """Divide datos en entrenamiento y validación con un corte temporal secuencial."""
    split_idx = int((1 - valid_ratio) * len(x_train))

    x_entrenamiento = x_train[:split_idx]
    y_reg_entrenamiento = y_reg[:split_idx]
    y_clf_entrenamiento = y_clf[:split_idx]  # ← Faltaba esta línea
    x_validacion = torch.tensor(x_train[split_idx:], dtype=torch.float32)
    if device is not None:
        x_validacion = x_validacion.to(device)

    y_clf_validacion = y_clf[split_idx:]

    return x_entrenamiento, y_reg_entrenamiento, y_clf_entrenamiento, x_validacion, y_clf_validacion