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
from app.ml.core.engine import MLEngine 
from app.ml.core.data_validation import DataValidator

def extraer_y_procesar_empresa_cnn(id_empresa: int) -> Optional[pd.DataFrame]:
    db = SessionLocal()
    try:
        # 1. OPTIMIZACIÓN PANDAS: Consultamos solo las columnas requeridas
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

        # 2. Leemos la consulta directamente a memoria con Pandas (Evita el cuelgue)
        df = pd.read_sql(query.statement, db.get_bind())
        
        if len(df) < 60: return None
            
        df.set_index('Date', inplace=True)
        
        # 🛡️ PROTECCIÓN: Casteo a float y limpieza de infinitos
        df = df.astype(float)
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        # Aplicamos los indicadores técnicos
        df_procesado = MLEngine.calcular_indicadores(df)
        df_procesado.ffill(inplace=True)
        df_procesado.bfill(inplace=True)

        # Validar datos procesados
        df_procesado_valido = DataValidator.validar_y_limpiar(df_procesado)
        return df_procesado_valido if df_procesado_valido is not None and not df_procesado_valido.empty else None

    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {str(e)}")
        return None
    finally:
        db.close()

def preparar_datos_cnn(lista_dfs: List[pd.DataFrame]):
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
        
        # 🛡️ PROTECCIÓN: Evitar Log(0) o división por cero
        log_ret = np.log(close_raw[idx_fut] / (close_raw[idx_hoy] + 1e-8))
        log_ret = np.nan_to_num(log_ret, nan=0.0, posinf=0.0, neginf=0.0)
        
        clf_target = (log_ret > 0.008).astype(np.float32)

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

def crear_dataloaders_cnn(x_t, yr_t, yc_t, x_v, yr_v, yc_v):
    train_ds = TensorDataset(torch.tensor(x_t), torch.tensor(yr_t).view(-1,1), torch.tensor(yc_t).view(-1,1))
    val_ds = TensorDataset(torch.tensor(x_v), torch.tensor(yr_v).view(-1,1), torch.tensor(yc_v).view(-1,1))
    
    # 🚀 OPTIMIZACIÓN: Lotes masivos (256/512), protección drop_last y transferencia rápida (pin_memory)
    return (DataLoader(train_ds, batch_size=256, shuffle=True, num_workers=0, drop_last=True, pin_memory=True), 
            DataLoader(val_ds, batch_size=512, shuffle=False, num_workers=0, pin_memory=True))