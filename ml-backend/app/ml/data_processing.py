import os
import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler # 👈 RobustScaler
import gc
from typing import Tuple, List, Optional, Any
import concurrent.futures
from tqdm import tqdm

from app.db.sessions import SessionLocal
from app.models.precio_historico import PrecioHistorico
from app.ml.engine import MLEngine

def procesar_empresas_en_lotes(ids_empresas: List[int], batch_size: int = 50) -> List[pd.DataFrame]:
    """Procesa empresas en lotes para optimizar memoria y rendimiento"""
    datos_procesados = []
    
    print(f"Procesando {len(ids_empresas)} empresas en lotes de {batch_size}...")
    
    for i in tqdm(range(0, len(ids_empresas), batch_size), desc="Procesando lotes"):
        batch_ids = ids_empresas[i:i+batch_size]
        
        # Procesar en paralelo dentro del lote
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(batch_ids))) as executor:
            futuros = [executor.submit(extraer_y_procesar_empresa, id_empresa) for id_empresa in batch_ids]
            for futuro in concurrent.futures.as_completed(futuros):
                df = futuro.result()
                if df is not None:
                    datos_procesados.append(df)
        
        gc.collect()  # Liberar memoria después de cada lote
    
    return datos_procesados

def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    db_thread = SessionLocal()
    try:
        precios = db_thread.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(precios) < MLEngine.DIAS_MEMORIA_IA + 50: return None

        datos_formateados = [{
            'Fecha': p.Fecha, 'Close': float(p.PrecioCierre), 'Volume': int(p.Volumen or 0),
            'High': float(p.PrecioCierre), 'Low': float(p.PrecioCierre)
        } for p in precios]
            
        df = pd.DataFrame(datos_formateados)
        df.set_index('Fecha', inplace=True)
        return MLEngine.calcular_indicadores(df)
    except Exception as e:
        print(f"Error procesando empresa ID {id_empresa}: {e}")
        return None
    finally:
        db_thread.close()

def preparar_datos_masivos_optimizado(lista_dfs: List[pd.DataFrame], batch_size: int = 1000) -> Tuple[Optional[np.ndarray], ...]:
    if not lista_dfs: return None, None, None, None, None, None, None

    print(f"Procesando {len(lista_dfs)} empresas con {sum(len(df) for df in lista_dfs)} registros totales...")
    scaler = RobustScaler() # 👈 Evita errores extremos en ValLoss

    muestras_scaler = []
    contador_muestras = 0
    for df in lista_dfs:
        if len(df) > MLEngine.DIAS_MEMORIA_IA:
            muestras_scaler.append(df[MLEngine.FEATURES].values[:100])
            contador_muestras += 1
            if contador_muestras >= 30:
                break

    if muestras_scaler:
        scaler.fit(np.vstack(muestras_scaler))

    x_train_global, y_train_reg, y_train_clf = [], [], []
    x_val_global, y_val_reg, y_val_clf = [], [], []
    dias_futuro = MLEngine.DIAS_PREDICCION

    for i in range(0, len(lista_dfs), batch_size):
        batch_dfs = lista_dfs[i:i+batch_size]

        for df in batch_dfs:
            if len(df) <= MLEngine.DIAS_MEMORIA_IA + dias_futuro:
                continue

            scaled_data = scaler.transform(df[MLEngine.FEATURES].values)
            raw_close = df['Close'].values
            split_boundary = max(int(len(df) * 0.9), MLEngine.DIAS_MEMORIA_IA + dias_futuro)

            for j in range(MLEngine.DIAS_MEMORIA_IA, len(scaled_data) - dias_futuro + 1):
                close_actual = raw_close[j - 1]
                close_futuro = raw_close[j + dias_futuro - 1]
                if close_actual <= 0 or close_futuro <= 0:
                    continue

                retorno_log = np.log(close_futuro / close_actual)
                x_seq = scaled_data[j - MLEngine.DIAS_MEMORIA_IA:j, :]
                etiqueta_clf = 1.0 if retorno_log > 0 else 0.0

                if (j + dias_futuro - 1) < split_boundary:
                    x_train_global.append(x_seq)
                    y_train_reg.append(retorno_log)
                    y_train_clf.append(etiqueta_clf)
                else:
                    x_val_global.append(x_seq)
                    y_val_reg.append(retorno_log)
                    y_val_clf.append(etiqueta_clf)

        del batch_dfs
        gc.collect()

    return (
        np.array(x_train_global, dtype=np.float32),
        np.array(y_train_reg, dtype=np.float32),
        np.array(y_train_clf, dtype=np.float32),
        np.array(x_val_global, dtype=np.float32),
        np.array(y_val_reg, dtype=np.float32),
        np.array(y_val_clf, dtype=np.float32),
        scaler
    )


def crear_dataloaders_optimizados(
    x_train: np.ndarray, y_reg_train: np.ndarray, y_clf_train: np.ndarray,
    x_val: np.ndarray, y_reg_val: np.ndarray, y_clf_val: np.ndarray
) -> Tuple[DataLoader, DataLoader]:
    x_train_tensor = torch.tensor(x_train, dtype=torch.float32)
    y_reg_train_tensor = torch.tensor(y_reg_train, dtype=torch.float32).view(-1, 1)
    y_clf_train_tensor = torch.tensor(y_clf_train, dtype=torch.float32).view(-1, 1)

    x_val_tensor = torch.tensor(x_val, dtype=torch.float32)
    y_reg_val_tensor = torch.tensor(y_reg_val, dtype=torch.float32).view(-1, 1)
    y_clf_val_tensor = torch.tensor(y_clf_val, dtype=torch.float32).view(-1, 1)

    train_dataset = TensorDataset(x_train_tensor, y_reg_train_tensor, y_clf_train_tensor)
    val_dataset = TensorDataset(x_val_tensor, y_reg_val_tensor, y_clf_val_tensor)

    worker_count = min(4, max(0, os.cpu_count() - 1))
    train_loader = DataLoader(
        train_dataset,
        batch_size=32,
        shuffle=True,
        pin_memory=True,
        num_workers=worker_count,
        persistent_workers=(worker_count > 0)
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=64,
        shuffle=False,
        pin_memory=True,
        num_workers=worker_count,
        persistent_workers=(worker_count > 0)
    )

    return train_loader, val_loader