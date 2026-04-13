import os
import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import RobustScaler 
from numpy.lib.stride_tricks import sliding_window_view
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
        
        #Cambiado a ProcessPoolExecutor para cálculos CPU-intensivos
        with concurrent.futures.ProcessPoolExecutor(max_workers=min(4, len(batch_ids))) as executor:
            futuros = [executor.submit(extraer_y_procesar_empresa, id_empresa) for id_empresa in batch_ids]
            for futuro in concurrent.futures.as_completed(futuros):
                df = futuro.result()
                if df is not None:
                    datos_procesados.append(df)
        
        gc.collect()
    
    return datos_procesados

def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    db_thread = SessionLocal()
    try:
        # En lugar de mapear diccionarios, leemos directo a Pandas en C
        consulta = db_thread.query(
            PrecioHistorico.Fecha, 
            PrecioHistorico.PrecioCierre.label('Close'), 
            PrecioHistorico.Volumen.label('Volume')
        ).filter(PrecioHistorico.IdEmpresa == id_empresa).order_by(PrecioHistorico.Fecha.asc())
        
        df = pd.read_sql(consulta.statement, db_thread.bind)

        if len(df) < MLEngine.DIAS_MEMORIA_IA + 50: return None
        
        # Ajustamos los campos extra que necesitabas
        df['High'] = df['Close']
        df['Low'] = df['Close']
        
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
    scaler = RobustScaler() 

    muestras_scaler = []
    contador_muestras = 0
    for df in lista_dfs:
        if len(df) > MLEngine.DIAS_MEMORIA_IA:
            muestras_scaler.append(df[MLEngine.FEATURES].values[:100])
            contador_muestras += 1
            if contador_muestras >= 30: break
    if muestras_scaler: scaler.fit(np.vstack(muestras_scaler))

    # Quitamos las listas de val_global porque cortaremos el tensor maestro al final
    x_train_global, y_train_reg, y_train_clf = [], [], []
    dias_futuro = MLEngine.DIAS_PREDICCION

    for i in range(0, len(lista_dfs), batch_size):
        batch_dfs = lista_dfs[i:i+batch_size]

        for df in batch_dfs:
            if len(df) <= MLEngine.DIAS_MEMORIA_IA + dias_futuro: continue
            
            close_raw = df['Close'].values 
            scaled_data = scaler.transform(df[MLEngine.FEATURES].values)

            # Vectorización de Ventanas Deslizantes (Sin bucles for internos)
            n_validos = len(scaled_data) - MLEngine.DIAS_MEMORIA_IA - dias_futuro + 1
            
            if n_validos <= 0: continue # Protección extra de seguridad
            
            # Crea todas las ventanas temporales en un solo bloque
            ventanas = sliding_window_view(scaled_data, window_shape=MLEngine.DIAS_MEMORIA_IA, axis=0)
            
            # Formato PyTorch esperado: (batch, secuencia, features)
            # Nota: Al usar sliding_window_view sobre (N, Features), la forma original es (Features, N_Ventanas, Secuencia)
            # Primero transponemos los ejes para alinear con (N_Ventanas, Secuencia, Features)
            x_batch = ventanas[:n_validos]

            # Vectorización de los índices de precio futuro y actual
            idx_hoy = np.arange(MLEngine.DIAS_MEMORIA_IA - 1, len(close_raw) - dias_futuro)
            idx_futuro = idx_hoy + dias_futuro

            precio_hoy = close_raw[idx_hoy]
            precio_futuro = close_raw[idx_futuro]

            # Operaciones vectoriales directas con el Filtro Institucional (0.8%)
            log_return = np.log(precio_futuro / precio_hoy)
            clf_target = (log_return > 0.008).astype(np.float32)

            # Agregamos los bloques completos
            x_train_global.append(x_batch)
            y_train_reg.append(log_return)
            y_train_clf.append(clf_target)

        del batch_dfs
        gc.collect()

    # Si no se procesó ninguna empresa válida
    if not x_train_global:
        return None, None, None, None, None, None, None

    #Unimos todo en tensores maestros masivos de Numpy
    x_total = np.concatenate(x_train_global, axis=0)
    y_reg_total = np.concatenate(y_train_reg, axis=0)
    y_clf_total = np.concatenate(y_train_clf, axis=0)

    #EL ARREGLO CRÍTICO: Hacemos el Split 90/10 dinámicamente
    split_idx = int(0.9 * len(x_total))

    #Devolvemos los 7 elementos exactos, divididos correctamente
    return (
        x_total[:split_idx],       # x_train
        y_reg_total[:split_idx],   # y_reg_train
        y_clf_total[:split_idx],   # y_clf_train
        x_total[split_idx:],       # x_val (El 10% de validación)
        y_reg_total[split_idx:],   # y_reg_val
        y_clf_total[split_idx:],   # y_clf_val
        scaler                     # scaler
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

    worker_count = 0
    train_loader = DataLoader(
        train_dataset,
        batch_size=32,
        shuffle=True,
        pin_memory=True,
        num_workers=worker_count,
        persistent_workers=False
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=64,
        shuffle=False,
        pin_memory=True,
        num_workers=worker_count,
        persistent_workers=False
    )

    return train_loader, val_loader