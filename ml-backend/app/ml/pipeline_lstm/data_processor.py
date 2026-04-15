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
from app.ml.core.engine import MLEngine # Importación modular

def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    """Extrae datos de la BD y aplica indicadores técnicos"""
    db = SessionLocal()
    try:
        registros = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()
        
        if len(registros) < 60: return None
            
        df = pd.DataFrame([{
            'Date': r.Fecha, 'Open': r.Apertura, 'High': r.Maximo,
            'Low': r.Minimo, 'Close': r.Cierre, 'Volume': r.Volumen
        } for r in registros]).set_index('Date')
        
        engine = MLEngine()
        df_procesado = engine.procesar_datos_completos(df)
        df_procesado.ffill(inplace=True)
        df_procesado.bfill(inplace=True)
        return df_procesado if not df_procesado.empty else None
    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {str(e)}")
        return None
    finally:
        db.close()

def preparar_datos_lstm(lista_dfs: List[pd.DataFrame], batch_size: int = 1000):
    """Prepara ventanas temporales y targets logarítmicos con gestión de memoria eficiente"""
    if not lista_dfs: return None, None, None, None, None, None, None

    scaler = RobustScaler()
    muestras = [df[MLEngine.FEATURES].values[:100] for df in lista_dfs[:30] if len(df) > 30]
    if muestras: scaler.fit(np.vstack(muestras))

    x_chunks, y_reg_chunks, y_clf_chunks = [], [], []
    
    for df in lista_dfs:
        if len(df) <= MLEngine.DIAS_MEMORIA_IA + MLEngine.DIAS_PREDICCION: continue
        
        close_raw = df['Close'].values 
        scaled_data = scaler.transform(df[MLEngine.FEATURES].values)
        n_validos = len(scaled_data) - MLEngine.DIAS_MEMORIA_IA - MLEngine.DIAS_PREDICCION + 1
        
        ventanas = sliding_window_view(scaled_data, window_shape=MLEngine.DIAS_MEMORIA_IA, axis=0)
        x_batch = ventanas.transpose(0, 2, 1)[:n_validos]

        idx_hoy = np.arange(MLEngine.DIAS_MEMORIA_IA - 1, len(close_raw) - MLEngine.DIAS_PREDICCION)
        idx_fut = idx_hoy + MLEngine.DIAS_PREDICCION
        
        log_ret = np.log(close_raw[idx_fut] / close_raw[idx_hoy])
        clf_target = (log_ret > 0.008).astype(np.float32)

        x_chunks.append(x_batch)
        y_reg_chunks.append(log_ret)
        y_clf_chunks.append(clf_target)

    # Cálculo de división 90/10 in-place para ahorrar RAM
    total_filas = sum(len(x) for x in x_chunks)
    split_idx = int(0.9 * total_filas)
    
    # Pre-asignación controlada para evitar ArrayMemoryError
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

def crear_dataloaders_lstm(x_t, yr_t, yc_t, x_v, yr_v, yc_v):
    train_ds = TensorDataset(torch.tensor(x_t), torch.tensor(yr_t).view(-1,1), torch.tensor(yc_t).view(-1,1))
    val_ds = TensorDataset(torch.tensor(x_v), torch.tensor(yr_v).view(-1,1), torch.tensor(yc_v).view(-1,1))
    return (DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0), 
            DataLoader(val_ds, batch_size=64, shuffle=False, num_workers=0))