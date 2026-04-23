"""Utilidades de validación cruzada para modelos ML"""

from typing import List, Callable, Dict, Any
import numpy as np
from sklearn.model_selection import KFold, StratifiedKFold
import torch
from sklearn.model_selection import TimeSeriesSplit

def validacion_cruzada_k_fold(
    X: np.ndarray,
    y_reg: np.ndarray,
    y_clf: np.ndarray,
    model_factory: Callable,
    train_func: Callable,
    eval_func: Callable,
    k: int = 5,
    **kwargs
) -> Dict[str, List[float]]:
    """
    Ejecuta validación cruzada k-fold

    Args:
        X: Features (N, T, F)
        y_reg: Targets regresión (N,)
        y_clf: Targets clasificación (N,)
        model_factory: Función que crea un modelo nuevo
        train_func: Función de entrenamiento
        eval_func: Función de evaluación
        k: Número de folds
        **kwargs: Argumentos adicionales para train_func

    Returns:
        Dict con métricas por fold
    """
    kf = TimeSeriesSplit(n_splits=k)
    resultados = {'fold': [], 'accuracy': [], 'f1': [], 'auc': [], 'mae': []}

    for fold, (train_idx, val_idx) in enumerate(kf.split(X), 1):
        print(f"Fold {fold}/{k}")

        X_train, X_val = X[train_idx], X[val_idx]
        y_reg_train, y_reg_val = y_reg[train_idx], y_reg[val_idx]
        y_clf_train, y_clf_val = y_clf[train_idx], y_clf[val_idx]

        # Entrenar modelo en este fold
        model = model_factory()
        train_func(model, X_train, y_reg_train, y_clf_train, **kwargs)

        # Evaluar
        metricas = eval_func(model, X_val, y_reg_val, y_clf_val)

        for key, val in metricas.items():
            resultados[key].append(val)

        resultados['fold'].append(fold)

    # Imprimir resumen
    print("\n=== RESULTADOS VALIDACIÓN CRUZADA ===")
    for key, vals in resultados.items():
        if key != 'fold':
            print(f"{key}: {np.mean(vals):.4f} (±{np.std(vals):.4f})")

    return resultados