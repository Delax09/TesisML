"""
Módulo de entrenamiento CNN supervisado
Entrena la red CNN v3 con aprendizaje supervisado para predicción de precios.
"""
import copy
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.amp import autocast, GradScaler
from torch.optim.lr_scheduler import StepLR
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_error, mean_squared_error, roc_auc_score, confusion_matrix
from tqdm import tqdm
from typing import Any, Dict, List, Tuple

from app.ml.utils import Timer


def entrenar_cnn_supervisado(modelo: nn.Module,
                            x_entrenamiento: np.ndarray,
                            y_reg_entrenamiento: np.ndarray,
                            y_clf_entrenamiento: np.ndarray,
                            x_validacion: torch.Tensor,
                            y_reg_validacion: np.ndarray,
                            y_clf_validacion: np.ndarray,
                            device: torch.device,
                            epochs: int = 50,
                            batch_size: int = 256,
                            early_stopping_patience: int = 5) -> Tuple[Any, Dict[str, float]]:
    """Entrena la CNN con aprendizaje supervisado usando mixed precision y early stopping."""

    optimizer = optim.Adam(modelo.parameters(), lr=0.001)
    scheduler = StepLR(optimizer, step_size=max(1, epochs // 4), gamma=0.5)
    scaler = GradScaler()

    # Pérdidas: Huber para regresión, BCEWithLogits para clasificación (seguro con autocast)
    criterio_reg = nn.HuberLoss(delta=1.0)
    criterio_clf = nn.BCEWithLogitsLoss()

    mejor_loss_val = float('inf')
    mejores_pesos = None
    epochs_sin_mejora = 0

    for epoch in range(epochs):
        modelo.train()
        loss_total_acumulado = 0.0
        loss_reg_acumulado = 0.0
        loss_clf_acumulado = 0.0
        batches_procesados = 0

        # Crear batches
        num_batches = len(x_entrenamiento) // batch_size
        if len(x_entrenamiento) % batch_size != 0:
            num_batches += 1

        loop_tiempo = tqdm(range(num_batches),
                            desc=f"Epoch [{epoch+1}/{epochs}]",
                            leave=False)

        for batch_idx in loop_tiempo:
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(x_entrenamiento))

            batch_x = torch.tensor(x_entrenamiento[start_idx:end_idx], dtype=torch.float32).to(device)
            batch_y_reg = torch.tensor(y_reg_entrenamiento[start_idx:end_idx], dtype=torch.float32).to(device).unsqueeze(1)
            batch_y_clf = torch.tensor(y_clf_entrenamiento[start_idx:end_idx], dtype=torch.float32).to(device).unsqueeze(1)

            optimizer.zero_grad()

            # Mixed Precision Training
            with autocast(device_type=device.type):
                pred_reg, pred_clf = modelo(batch_x)

                loss_reg = criterio_reg(pred_reg, batch_y_reg)
                loss_clf = criterio_clf(pred_clf, batch_y_clf)
                loss_total = loss_reg + loss_clf

            scaler.scale(loss_total).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(modelo.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()

            loss_total_acumulado += loss_total.item()
            loss_reg_acumulado += loss_reg.item()
            loss_clf_acumulado += loss_clf.item()
            batches_procesados += 1

        # Actualizar learning rate
        scheduler.step()

        # Calcular métricas de validación
        modelo.eval()
        with torch.no_grad():
            val_pred_reg, val_pred_clf = modelo(x_validacion)
            val_pred_clf_binary = (torch.sigmoid(val_pred_clf) > 0.5).float()

            val_loss_reg = criterio_reg(val_pred_reg, torch.tensor(y_reg_validacion, dtype=torch.float32).to(device).unsqueeze(1))
            val_loss_clf = criterio_clf(val_pred_clf, torch.tensor(y_clf_validacion, dtype=torch.float32).to(device).unsqueeze(1))
            val_loss_total = val_loss_reg + val_loss_clf

            # Métricas de clasificación
            acc = accuracy_score(y_clf_validacion, val_pred_clf_binary.cpu().numpy())
            prec = precision_score(y_clf_validacion, val_pred_clf_binary.cpu().numpy(), zero_division=0)
            rec = recall_score(y_clf_validacion, val_pred_clf_binary.cpu().numpy(), zero_division=0)
            f1 = f1_score(y_clf_validacion, val_pred_clf_binary.cpu().numpy(), zero_division=0)

            # Métricas de regresión
            mae = mean_absolute_error(y_reg_validacion, val_pred_reg.cpu().numpy().flatten())
            mse = mean_squared_error(y_reg_validacion, val_pred_reg.cpu().numpy().flatten())

        avg_loss_total = loss_total_acumulado / max(1, batches_procesados)
        avg_loss_reg = loss_reg_acumulado / max(1, batches_procesados)
        avg_loss_clf = loss_clf_acumulado / max(1, batches_procesados)

        print(f"📊 Epoch [{epoch+1}/{epochs}] - Train Loss: {avg_loss_total:.4f} (Reg: {avg_loss_reg:.4f}, Clf: {avg_loss_clf:.4f})")
        print(f"   Val Loss: {val_loss_total:.4f} - Acc: {acc:.3f} - MAE: {mae:.4f} - LR: {scheduler.get_last_lr()[0]:.6f}")

        # Early Stopping
        if val_loss_total < mejor_loss_val:
            mejor_loss_val = val_loss_total
            mejores_pesos = copy.deepcopy(modelo.state_dict())
            epochs_sin_mejora = 0
        else:
            epochs_sin_mejora += 1

        if epochs_sin_mejora >= early_stopping_patience:
            print(f"⏹️ Early stopping: {epochs_sin_mejora} epochs sin mejora")
            break

    # Métricas finales con mejores pesos
    if mejores_pesos is not None:
        modelo.load_state_dict(mejores_pesos)

    modelo.eval()
    with torch.no_grad():
        final_pred_reg, final_pred_clf = modelo(x_validacion)
        final_pred_clf_binary = (torch.sigmoid(final_pred_clf) > 0.5).float()

        metricas = {
            'loss': float(mejor_loss_val),
            'mae': float(mean_absolute_error(y_reg_validacion, final_pred_reg.cpu().numpy().flatten())),
            'mse': float(mse),
            'accuracy': float(accuracy_score(y_clf_validacion, final_pred_clf_binary.cpu().numpy())),
            'precision': float(precision_score(y_clf_validacion, final_pred_clf_binary.cpu().numpy(), zero_division=0)),
            'recall': float(recall_score(y_clf_validacion, final_pred_clf_binary.cpu().numpy(), zero_division=0)),
            'f1_score': float(f1_score(y_clf_validacion, final_pred_clf_binary.cpu().numpy(), zero_division=0)),
        }

    return mejores_pesos, metricas


def evaluar_cnn(modelo: nn.Module,
                x_validacion: torch.Tensor,
                y_reg_validacion: np.ndarray,
                y_clf_validacion: np.ndarray,
                device: torch.device) -> Dict[str, float]:
    """Evalúa el modelo CNN entrenado en el conjunto de validación."""
    modelo.eval()

    with torch.no_grad():
        pred_reg, pred_clf = modelo(x_validacion)
        pred_clf_prob = torch.sigmoid(pred_clf).cpu().numpy().flatten()
        pred_clf_binary = (pred_clf_prob > 0.5).astype(int)

        acc = accuracy_score(y_clf_validacion, pred_clf_binary)
        prec = precision_score(y_clf_validacion, pred_clf_binary, zero_division=0)
        rec = recall_score(y_clf_validacion, pred_clf_binary, zero_division=0)
        f1 = f1_score(y_clf_validacion, pred_clf_binary, zero_division=0)
        mae = mean_absolute_error(y_reg_validacion, pred_reg.cpu().numpy().flatten())

        # Calcular AUC
        try:
            auc = roc_auc_score(y_clf_validacion, pred_clf_prob)
        except ValueError:
            auc = 0.0

        # Calcular matriz de confusión
        cm = confusion_matrix(y_clf_validacion, pred_clf_binary)
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
        else:
            tp = tn = fp = fn = 0
            if cm.shape[0] == 1:
                if y_clf_validacion[0] == 1:
                    tp = cm[0][0]
                else:
                    tn = cm[0][0]

    return {
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1),
        'mae': float(mae),
        'auc': float(auc),
        'tp': int(tp),
        'tn': int(tn),
        'fp': int(fp),
        'fn': int(fn)
    }