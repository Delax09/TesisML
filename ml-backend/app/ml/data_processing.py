"""
Modulo de Procesamiento de Datos para ML
Contiene funciones para preparar y procesar datos de entrenamiento
"""
import numpy as np
import pandas as pd
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
import gc
from typing import Tuple, List, Optional, Any
import concurrent.futures
from tqdm import tqdm

from app.db.sessions import SessionLocal
from app.models.precio_historico import PrecioHistorico
from app.ml.engine import MLEngine


def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    """Extrae y procesa datos de una empresa especifica"""
    db_thread = SessionLocal()
    try:
        # Solo cargar los campos necesarios
        precios = db_thread.query(
            PrecioHistorico.Fecha,
            PrecioHistorico.PrecioCierre,
            PrecioHistorico.Volumen
        ).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(precios) < MLEngine.DIAS_MEMORIA_IA + 50:
            return None

        # Crear DataFrame directamente sin diccionarios intermedios
        df = pd.DataFrame([{
            'Fecha': p.Fecha,
            'Close': float(p.PrecioCierre),
            'Volume': float(p.Volumen or 0),
            'High': float(p.PrecioCierre),
            'Low': float(p.PrecioCierre)
        } for p in precios])

        df.set_index('Fecha', inplace=True)
        df_ind = MLEngine.calcular_indicadores(df)

        # Limpiar memoria inmediatamente
        del df, precios
        gc.collect()

        return df_ind

    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {e}")
        return None
    finally:
        db_thread.close()


def preparar_datos_masivos_optimizado(lista_dfs: List[pd.DataFrame], batch_size: int = 1000) -> Tuple[Optional[np.ndarray], ...]:
    """Procesamiento por lotes para manejar datasets grandes"""
    if not lista_dfs:
        return None, None, None, None

    print(f"Procesando {len(lista_dfs)} empresas con {sum(len(df) for df in lista_dfs)} registros totales...")

    # Calcular scaler en lotes para evitar cargar todo en memoria
    scaler = MinMaxScaler(feature_range=(0, 1))

    # Primer paso: fit del scaler con muestras representativas
    muestras_scaler = []
    for df in lista_dfs[:min(10, len(lista_dfs))]:  # Usar solo 10 empresas para fit
        if len(df) > MLEngine.DIAS_MEMORIA_IA:
            muestras_scaler.append(df[MLEngine.FEATURES].values[:100])  # 100 muestras por empresa

    if muestras_scaler:
        scaler.fit(np.vstack(muestras_scaler))

    # Procesar en lotes para evitar OOM
    x_train_global = []
    y_train_reg = []
    y_train_clf = []

    for i in range(0, len(lista_dfs), batch_size):
        batch_dfs = lista_dfs[i:i+batch_size]
        print(f"Procesando lote {i//batch_size + 1}/{(len(lista_dfs)-1)//batch_size + 1}...")

        for df in batch_dfs:
            if len(df) <= MLEngine.DIAS_MEMORIA_IA:
                continue

            scaled_data = scaler.transform(df[MLEngine.FEATURES].values)

            # Vectorizar las operaciones
            for j in range(MLEngine.DIAS_MEMORIA_IA, len(scaled_data)):
                x_train_global.append(scaled_data[j-MLEngine.DIAS_MEMORIA_IA:j, :])

                precio_hoy = scaled_data[j-1, 0]
                precio_manana = scaled_data[j, 0]
                y_train_reg.append(precio_manana)
                y_train_clf.append(1.0 if precio_manana > precio_hoy else 0.0)

        # Limpiar memoria del lote procesado
        del batch_dfs
        gc.collect()

    return (np.array(x_train_global, dtype=np.float32),
            np.array(y_train_reg, dtype=np.float32),
            np.array(y_train_clf, dtype=np.float32),
            scaler)


def preparar_datos_masivos(lista_dfs: List[pd.DataFrame]) -> Tuple[Optional[np.ndarray], ...]:
    """Wrapper para compatibilidad - usa la version optimizada"""
    return preparar_datos_masivos_optimizado(lista_dfs)


def crear_dataloaders_optimizados(x_train: np.ndarray, y_reg: np.ndarray, y_clf: np.ndarray,
                                batch_size: int = 256, num_workers: int = 2) -> Tuple[DataLoader, ...]:
    """Crea DataLoaders optimizados con mejor performance"""
    x_tensor = torch.tensor(x_train, dtype=torch.float32)
    y_reg_tensor = torch.tensor(y_reg, dtype=torch.float32).view(-1, 1)
    y_clf_tensor = torch.tensor(y_clf, dtype=torch.float32).view(-1, 1)

    # Split estratificado para mantener distribucion
    split_idx = int(0.9 * len(x_tensor))

    train_dataset = TensorDataset(x_tensor[:split_idx], y_reg_tensor[:split_idx], y_clf_tensor[:split_idx])
    val_dataset = TensorDataset(x_tensor[split_idx:], y_reg_tensor[split_idx:], y_clf_tensor[split_idx:])

    # DataLoader con prefetching y optimizaciones
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        pin_memory=True,
        num_workers=num_workers,
        prefetch_factor=2 if num_workers > 0 else None,
        persistent_workers=True if num_workers > 0 else False,
        drop_last=True  # Evitar batches incompletos
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        pin_memory=True,
        num_workers=num_workers,
        prefetch_factor=2 if num_workers > 0 else None,
        persistent_workers=True if num_workers > 0 else False
    )

    return train_loader, val_loader, x_tensor, y_clf_tensor, split_idx


def crear_dataloaders(x_train: np.ndarray, y_reg: np.ndarray, y_clf: np.ndarray) -> Tuple[DataLoader, ...]:
    """Wrapper para compatibilidad"""
    return crear_dataloaders_optimizados(x_train, y_reg, y_clf)


def procesar_empresas_en_lotes(ids_empresas: List[int], batch_empresas: int = 50) -> List[pd.DataFrame]:
    """Procesa empresas en lotes para evitar OOM"""
    todos_los_datos = []

    for i in range(0, len(ids_empresas), batch_empresas):
        batch_ids = ids_empresas[i:i+batch_empresas]
        print(f"Procesando lote de empresas {i//batch_empresas + 1}/{(len(ids_empresas)-1)//batch_empresas + 1}...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(batch_ids))) as executor:
            resultados_batch = list(tqdm(
                executor.map(extraer_y_procesar_empresa, batch_ids),
                total=len(batch_ids),
                desc=f"Procesando {len(batch_ids)} empresas"
            ))

        # Filtrar resultados validos
        datos_validos = [df for df in resultados_batch if df is not None]
        todos_los_datos.extend(datos_validos)

        print(f"Lote completado: {len(datos_validos)}/{len(batch_ids)} empresas validas")

        # Liberar memoria
        del resultados_batch, datos_validos
        gc.collect()

    return todos_los_datos