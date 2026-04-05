"""
Modulo de Entrenamiento de Modelos ML
Contiene la logica especifica para entrenar modelos de PyTorch
"""
import torch
import torch.nn as nn
import torch.optim as optim
import copy
from typing import Dict, List, Tuple, Any
import time
from tqdm import tqdm
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from app.ml.utils import monitorear_recursos, imprimir_estadisticas_entrenamiento, mostrar_resumen_entrenamiento


class EarlyStopping:
    """Implementacion de Early Stopping para entrenamiento"""
    def __init__(self, paciencia: int = 3, delta: float = 0.0):
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.mejor_loss = None
        self.detener = False
        self.mejores_pesos = None

    def __call__(self, val_loss: float, modelo: nn.Module):
        if self.mejor_loss is None:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
        elif val_loss > self.mejor_loss - self.delta:
            self.contador += 1
            if self.contador >= self.paciencia:
                self.detener = True
        else:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0


def ejecutar_entrenamiento_pytorch_optimizado(model: nn.Module, train_loader: torch.utils.data.DataLoader,
                                            val_loader: torch.utils.data.DataLoader, device: torch.device,
                                            epochs: int = 25) -> Tuple[Dict[str, List[float]], Any]:
    """Entrenamiento optimizado con mixed precision y optimizaciones GPU"""
    from torch.cuda.amp import GradScaler, autocast

    criterion_reg = nn.HuberLoss(delta=1.0)
    criterion_clf = nn.BCELoss()
    criterion_mae = nn.L1Loss()

    # AdamW para mejor regularizacion
    optimizer = optim.AdamW(model.parameters(), lr=0.0005, weight_decay=1e-4)

    # Learning rate scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2, verbose=True)

    early_stopping = EarlyStopping(paciencia=3, delta=0.0)

    # Mixed precision training si hay GPU
    use_amp = device.type == 'cuda'
    scaler = GradScaler() if use_amp else None

    historial = {'loss': [], 'mae': [], 'val_loss': [], 'val_mae': []}

    print("Iniciando entrenamiento optimizado...")
    inicio_total = time.time()

    # Monitoreo inicial
    recursos_iniciales = monitorear_recursos()
    print("Recursos iniciales:")
    imprimir_estadisticas_entrenamiento(recursos_iniciales, 0, 0, 0)

    for epoch in range(epochs):
        inicio_epoch = time.time()

        model.train()
        train_loss, train_mae = 0.0, 0.0

        loop_entrenamiento = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, unit="batch")

        for x_batch, y_reg_batch, y_clf_batch in loop_entrenamiento:
            x_batch = x_batch.to(device, non_blocking=True)
            y_reg_batch = y_reg_batch.to(device, non_blocking=True)
            y_clf_batch = y_clf_batch.to(device, non_blocking=True)

            optimizer.zero_grad()

            # Mixed precision
            if use_amp:
                with autocast():
                    pred_reg, pred_clf = model(x_batch)
                    loss_reg = criterion_reg(pred_reg, y_reg_batch)
                    loss_clf = criterion_clf(pred_clf, y_clf_batch)
                    loss_total = loss_reg + loss_clf
                    mae = criterion_mae(pred_reg, y_reg_batch)

                scaler.scale(loss_total).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                pred_reg, pred_clf = model(x_batch)
                loss_reg = criterion_reg(pred_reg, y_reg_batch)
                loss_clf = criterion_clf(pred_clf, y_clf_batch)
                loss_total = loss_reg + loss_clf
                mae = criterion_mae(pred_reg, y_reg_batch)

                loss_total.backward()
                optimizer.step()

            train_loss += loss_total.item()
            train_mae += mae.item()
            loop_entrenamiento.set_postfix(loss=f"{loss_total.item():.4f}", mae=f"{mae.item():.4f}")

        train_loss /= len(train_loader)
        train_mae /= len(train_loader)

        # Validacion
        model.eval()
        val_loss, val_mae = 0.0, 0.0
        with torch.no_grad():
            for x_val, y_reg_val, y_clf_val in val_loader:
                x_val = x_val.to(device, non_blocking=True)
                y_reg_val = y_reg_val.to(device, non_blocking=True)
                y_clf_val = y_clf_val.to(device, non_blocking=True)

                if use_amp:
                    with autocast():
                        p_reg, p_clf = model(x_val)
                        v_loss = criterion_reg(p_reg, y_reg_val) + criterion_clf(p_clf, y_clf_val)
                        val_mae += criterion_mae(p_reg, y_reg_val).item()
                else:
                    p_reg, p_clf = model(x_val)
                    v_loss = criterion_reg(p_reg, y_reg_val) + criterion_clf(p_clf, y_clf_val)
                    val_mae += criterion_mae(p_reg, y_reg_val).item()

                val_loss += v_loss.item()

        val_loss /= len(val_loader)
        val_mae /= len(val_loader)

        historial['loss'].append(train_loss)
        historial['mae'].append(train_mae)
        historial['val_loss'].append(val_loss)
        historial['val_mae'].append(val_mae)

        tiempo_epoch = time.time() - inicio_epoch
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f} - LR: {optimizer.param_groups[0]['lr']:.6f} - Tiempo {tiempo_epoch:.2f}s")

        # Monitoreo cada 5 epochs o en el ultimo
        if epoch % 5 == 0 or epoch == epochs - 1:
            recursos_actuales = monitorear_recursos()
            imprimir_estadisticas_entrenamiento(recursos_actuales, epoch + 1, train_loss, val_loss, tiempo_epoch)

        # LR scheduling
        scheduler.step(val_loss)

        early_stopping(val_loss, model)
        if early_stopping.detener:
            print(f"Early stopping en epoch {epoch+1}")
            break

    tiempo_total = time.time() - inicio_total
    print(f"Entrenamiento completado en {tiempo_total:.2f}s")

    # Monitoreo final
    recursos_finales = monitorear_recursos()

    # Mostrar resumen completo
    mostrar_resumen_entrenamiento(historial, tiempo_total, recursos_iniciales, recursos_finales)

    # Limpieza de memoria
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return historial, early_stopping.mejores_pesos


def ejecutar_entrenamiento_pytorch(model: nn.Module, train_loader: torch.utils.data.DataLoader,
                                val_loader: torch.utils.data.DataLoader, device: torch.device,
                                epochs: int = 25) -> Tuple[Dict[str, List[float]], Any]:
    """Wrapper para compatibilidad"""
    return ejecutar_entrenamiento_pytorch_optimizado(model, train_loader, val_loader, device, epochs)


def calcular_metricas_clasificacion(model: nn.Module, x_tensor: torch.Tensor, y_clf_tensor: torch.Tensor,
                                  split_idx: int, historial: Dict[str, List[float]], device: torch.device) -> Dict[str, float]:
    """Calcula metricas de clasificacion para el modelo"""
    x_val_final = x_tensor[split_idx:]
    y_val_real = y_clf_tensor[split_idx:].numpy()

    y_val_pred_list = []
    lote_evaluacion = 128

    with torch.no_grad():
        for i in range(0, len(x_val_final), lote_evaluacion):
            x_batch = x_val_final[i:i+lote_evaluacion].to(device)
            _, pred_clf = model(x_batch)  # Ignoramos el precio, tomamos la tendencia
            y_val_pred_list.append(pred_clf.cpu().numpy())

    probabilidades = np.vstack(y_val_pred_list)
    # Todo lo mayor a 50% de probabilidad se considera tendencia alcista (1)
    direccion_pred = (probabilidades > 0.5).astype(int)

    acc = accuracy_score(y_val_real, direccion_pred)
    prec = precision_score(y_val_real, direccion_pred, zero_division=0)
    rec = recall_score(y_val_real, direccion_pred, zero_division=0)
    f1 = f1_score(y_val_real, direccion_pred, zero_division=0)

    mejor_idx = np.argmin(historial['val_loss'])
    return {
        'loss': float(historial['loss'][mejor_idx]),
        'mae': float(historial['mae'][mejor_idx]),
        'val_loss': float(historial['val_loss'][mejor_idx]),
        'val_mae': float(historial['val_mae'][mejor_idx]),
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1)
    }