"""Preparación de datos compartida por todos los pipelines (split temporal, sin fugas)."""

from typing import List, Dict
import gc
import logging

import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler
from numpy.lib.stride_tricks import sliding_window_view

from app.ml.core.engine import MLEngine
from app.ml.core.data_validation import DataValidator

logger = logging.getLogger(__name__)


def preparar_datos_generico(
    lista_dfs: List[pd.DataFrame],
    fecha_val: str = None,
    fecha_test: str = None,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    stride_train: int = None,
    zona_muerta: float = None,
    balance_method: str = None,
    seed: int = None,
) -> Dict:
    """
    Construye ventanas y separa train / val / test POR FECHA, igual para todos los tickers.

      train: ventanas desde fecha_inicio cuyo objetivo (hoy + 21 días) termina ANTES de fecha_val -> purga automática
      val:   ventanas desde fecha_val cuyo objetivo termina antes de fecha_test
      test:  ventanas desde fecha_test (y antes de fecha_fin, si se da; lo usa el walk-forward)

    Devuelve {'train': [x, y_reg, y_clf], 'val': [...], 'test': [...],
              'train_meta' / 'val_meta' / 'test_meta': DataFrame(fecha, ticker), 'scaler': RobustScaler}
    """
    M, H, F = MLEngine.DIAS_MEMORIA_IA, MLEngine.DIAS_PREDICCION, MLEngine.FEATURES
    fecha_val = pd.Timestamp(fecha_val or MLEngine.FECHA_VAL)
    fecha_test = pd.Timestamp(fecha_test or MLEngine.FECHA_TEST)
    fecha_inicio = pd.Timestamp(fecha_inicio or MLEngine.FECHA_INICIO)
    fecha_fin = pd.Timestamp(fecha_fin) if fecha_fin else None
    stride_train = stride_train or MLEngine.STRIDE_TRAIN
    zona_muerta = MLEngine.ZONA_MUERTA if zona_muerta is None else zona_muerta
    balance_method = balance_method or MLEngine.BALANCE_METHOD
    seed = MLEngine.SEED if seed is None else seed

    if not lista_dfs:
        raise ValueError("No hay DataFrames para preparar")

    # 1) Scaler ajustado SOLO con filas del período de entrenamiento
    filas = [df.loc[(df.index >= fecha_inicio) & (df.index < fecha_val), F].values for df in lista_dfs]
    filas = [f for f in filas if len(f)]
    if not filas:
        raise ValueError(f"No hay datos anteriores a {fecha_val.date()} para ajustar el scaler")
    scaler = RobustScaler().fit(np.vstack(filas))
    del filas

    partes = {k: {'x': [], 'yr': [], 'yc': [], 'fecha': [], 'ticker': []} for k in ('train', 'val', 'test')}

    for i, df in enumerate(lista_dfs):
        n = len(df)
        if n <= M + H:
            continue
        ticker = df.attrs.get('ticker', f'df_{i}')

        X = np.clip(scaler.transform(df[F].values), -MLEngine.CLIP_SCALER, MLEngine.CLIP_SCALER).astype(np.float32)
        close = df['Close'].values

        idx_hoy = np.arange(M - 1, n - H)        # último día de cada ventana
        idx_fut = idx_hoy + H
        y_reg = np.log(close[idx_fut] / close[idx_hoy]).astype(np.float32)
        y_clf = (y_reg > 0).astype(np.float32)

        # Volatilidad esperada a H días (solo con datos pasados) para la zona muerta
        vol = df['LogReturn'].rolling(20).std().ffill().fillna(0).values[idx_hoy] * np.sqrt(H)

        # ventanas[j] termina exactamente en idx_hoy[j]
        ventanas = sliding_window_view(X, M, axis=0).transpose(0, 2, 1)[:len(idx_hoy)]

        f_hoy, f_fut = df.index[idx_hoy], df.index[idx_fut]
        m_train = np.asarray((f_hoy >= fecha_inicio) & (f_fut < fecha_val))
        m_val = np.asarray((f_hoy >= fecha_val) & (f_fut < fecha_test))
        m_test = np.asarray(f_hoy >= fecha_test)
        if fecha_fin is not None:
            m_test &= np.asarray(f_hoy < fecha_fin)

        # Menos redundancia en train: una ventana cada `stride_train` días
        paso = np.zeros(len(idx_hoy), dtype=bool)
        paso[::stride_train] = True
        m_train &= paso
        # Zona muerta: en train se descartan movimientos indistinguibles del ruido
        if zona_muerta > 0:
            m_train &= np.abs(y_reg) > zona_muerta * vol

        for k, m in (('train', m_train), ('val', m_val), ('test', m_test)):
            if not m.any():
                continue
            p = partes[k]
            p['x'].append(np.ascontiguousarray(ventanas[m]))
            p['yr'].append(y_reg[m])
            p['yc'].append(y_clf[m])
            p['fecha'].append(f_hoy[m])
            p['ticker'].append(np.full(int(m.sum()), ticker))

    salida = {'scaler': scaler}
    for k, p in partes.items():
        if not p['x']:
            raise ValueError(f"Conjunto '{k}' vacío: revisa FECHA_VAL / FECHA_TEST")
        salida[k] = [np.concatenate(p['x']), np.concatenate(p['yr']), np.concatenate(p['yc'])]
        salida[k + '_meta'] = pd.DataFrame({'fecha': np.concatenate(p['fecha']),
                                            'ticker': np.concatenate(p['ticker'])})
    del partes
    gc.collect()

    # 2) Balanceo SOLO en train, con índices -> X, y_reg e y_clf siguen alineados
    idx = DataValidator.indices_balanceo(salida['train'][2], method=balance_method, seed=seed)
    salida['train'] = [a[idx] for a in salida['train']]
    salida['train_meta'] = salida['train_meta'].iloc[idx].reset_index(drop=True)

    for k in ('train', 'val', 'test'):
        x, _, yc = salida[k]
        meta = salida[k + '_meta']
        logger.info(f"{k}: {len(x)} ventanas | positivos {yc.mean():.3f} | "
                    f"{meta.fecha.min().date()} -> {meta.fecha.max().date()} | {meta.ticker.nunique()} tickers")
    return salida


def crear_dataloaders_generico(datos: Dict, batch_size: int = 256, seed: int = None):
    """Devuelve (train_loader, val_loader, test_loader). Solo train descarta el último lote incompleto."""
    seed = MLEngine.SEED if seed is None else seed

    def _ds(k):
        x, yr, yc = datos[k]
        return TensorDataset(torch.from_numpy(x), torch.from_numpy(yr).view(-1, 1), torch.from_numpy(yc).view(-1, 1))

    g = torch.Generator().manual_seed(seed)
    return (
        DataLoader(_ds('train'), batch_size=batch_size, shuffle=True, drop_last=True, generator=g, num_workers=0),
        DataLoader(_ds('val'), batch_size=batch_size, shuffle=False, drop_last=False, num_workers=0),
        DataLoader(_ds('test'), batch_size=batch_size, shuffle=False, drop_last=False, num_workers=0),
    )