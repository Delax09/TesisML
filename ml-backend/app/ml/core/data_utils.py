"""Utilidades compartidas de procesamiento de datos para todos los pipelines"""

from typing import List, Tuple, Optional
import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler
from numpy.lib.stride_tricks import sliding_window_view
import gc

from app.ml.core.engine import MLEngine

def preparar_datos_generico(
    lista_dfs: List[pd.DataFrame],
    batch_size: int = 50
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, RobustScaler]:
    """Preparación universal de datos para cualquier arquitectura"""
    if not lista_dfs:
        return None, None, None, None, None, None, None

    scaler = RobustScaler()
    muestras = [df[MLEngine.FEATURES].values[:100] for df in lista_dfs[:30] if len(df) > 30]
    if muestras:
        scaler.fit(np.vstack(muestras))

    x_chunks, y_reg_chunks, y_clf_chunks = [], [], []

    for df in lista_dfs:
        if len(df) <= MLEngine.DIAS_MEMORIA_IA + MLEngine.DIAS_PREDICCION:
            continue

        close_raw = df['Close'].values
        scaled_data = scaler.transform(df[MLEngine.FEATURES].values)
        n_validos = len(scaled_data) - MLEngine.DIAS_MEMORIA_IA - MLEngine.DIAS_PREDICCION + 1

        ventanas = sliding_window_view(scaled_data, window_shape=MLEngine.DIAS_MEMORIA_IA, axis=0)
        x_batch = ventanas.transpose(0, 2, 1)[:n_validos]

        idx_hoy = np.arange(MLEngine.DIAS_MEMORIA_IA - 1, len(close_raw) - MLEngine.DIAS_PREDICCION)
        idx_fut = idx_hoy + MLEngine.DIAS_PREDICCION

        log_ret = np.log(close_raw[idx_fut] / (close_raw[idx_hoy] + 1e-8))
        log_ret = np.nan_to_num(log_ret, nan=0.0, posinf=0.0, neginf=0.0)

        clf_target = (log_ret > 0.005).astype(np.float32)

        x_chunks.append(x_batch)
        y_reg_chunks.append(log_ret)
        y_clf_chunks.append(clf_target)

    total_filas = sum(len(x) for x in x_chunks)
    split_idx = int(0.9 * total_filas)

    x_total = np.empty((total_filas, MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)), dtype=np.float32)
    y_reg_total = np.empty(total_filas, dtype=np.float32)
    y_clf_total = np.empty(total_filas, dtype=np.float32)

    idx = 0
    for cx, cy_r, cy_c in zip(x_chunks, y_reg_chunks, y_clf_chunks):
        n = len(cx)
        x_total[idx:idx+n], y_reg_total[idx:idx+n], y_clf_total[idx:idx+n] = cx, cy_r, cy_c
        idx += n

    del x_chunks, y_reg_chunks, y_clf_chunks
    gc.collect()

    return (x_total[:split_idx], y_reg_total[:split_idx], y_clf_total[:split_idx],
            x_total[split_idx:], y_reg_total[split_idx:], y_clf_total[split_idx:], scaler)

def crear_dataloaders_generico(
    x_t: np.ndarray,
    yr_t: np.ndarray,
    yc_t: np.ndarray,
    x_v: np.ndarray,
    yr_v: np.ndarray,
    yc_v: np.ndarray,
    batch_size: int = 64,
    drop_last: bool = True
) -> Tuple[DataLoader, DataLoader]:
    """Crea dataloaders estandarizados para todos los pipelines"""
    train_ds = TensorDataset(torch.tensor(x_t), torch.tensor(yr_t).view(-1,1), torch.tensor(yc_t).view(-1,1))
    val_ds = TensorDataset(torch.tensor(x_v), torch.tensor(yr_v).view(-1,1), torch.tensor(yc_v).view(-1,1))

    return (DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0, drop_last=drop_last),
            DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0, drop_last=drop_last))