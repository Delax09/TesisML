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
    if not lista_dfs: return None, None, None, None

    print(f"Procesando {len(lista_dfs)} empresas con {sum(len(df) for df in lista_dfs)} registros totales...")
    scaler = RobustScaler() # 👈 Evita errores extremos en ValLoss

    muestras_scaler = []
    for df in lista_dfs[:min(10, len(lista_dfs))]:  
        if len(df) > MLEngine.DIAS_MEMORIA_IA:
            muestras_scaler.append(df[MLEngine.FEATURES].values[:100])  

    if muestras_scaler: scaler.fit(np.vstack(muestras_scaler))

    x_train_global, y_train_reg, y_train_clf = [], [], []
    dias_futuro = MLEngine.DIAS_PREDICCION # 👈 Consumimos la variable global

    for i in range(0, len(lista_dfs), batch_size):
        batch_dfs = lista_dfs[i:i+batch_size]

        for df in batch_dfs:
            if len(df) <= MLEngine.DIAS_MEMORIA_IA + dias_futuro: continue
            scaled_data = scaler.transform(df[MLEngine.FEATURES].values)

            for j in range(MLEngine.DIAS_MEMORIA_IA, len(scaled_data) - dias_futuro + 1):
                x_train_global.append(scaled_data[j-MLEngine.DIAS_MEMORIA_IA:j, :])
                precio_hoy = scaled_data[j-1, 0] 
                precio_futuro = scaled_data[j + dias_futuro - 1, 0] 
                
                y_train_reg.append(precio_futuro)
                y_train_clf.append(1.0 if precio_futuro > precio_hoy else 0.0) 

        del batch_dfs
        gc.collect()

    return (np.array(x_train_global, dtype=np.float32), np.array(y_train_reg, dtype=np.float32),
            np.array(y_train_clf, dtype=np.float32), scaler)

def crear_dataloaders_optimizados(x_train: np.ndarray, y_reg: np.ndarray, y_clf: np.ndarray) -> Tuple[DataLoader, DataLoader, torch.Tensor, torch.Tensor, int]:
    x_tensor = torch.tensor(x_train, dtype=torch.float32)
    y_reg_tensor = torch.tensor(y_reg, dtype=torch.float32).view(-1, 1)
    y_clf_tensor = torch.tensor(y_clf, dtype=torch.float32).view(-1, 1)
    
    split_idx = int(0.9 * len(x_tensor))
    train_dataset = TensorDataset(x_tensor[:split_idx], y_reg_tensor[:split_idx], y_clf_tensor[:split_idx])
    val_dataset = TensorDataset(x_tensor[split_idx:], y_reg_tensor[split_idx:], y_clf_tensor[split_idx:])
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True, pin_memory=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=128, shuffle=False, pin_memory=True)
    
    return train_loader, val_loader, x_tensor, y_clf_tensor, split_idx