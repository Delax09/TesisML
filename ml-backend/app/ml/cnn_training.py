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
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_error, roc_auc_score, confusion_matrix
from tqdm import tqdm
from typing import Any, Dict, Tuple

from app.ml.utils import Timer

# =====================================================================
# CLASE EARLY STOPPING AVANZADO (FINANCIERO)
# =====================================================================
class EarlyStopping:
    def __init__(self, paciencia=8, delta=0.002):
        """
        Paciencia alta (8) para sobrevivir al ruido del mercado.
        Delta de 0.002 para exigir una mejora real y no sobreajustar micro-fluctuaciones.
        """
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.mejor_loss = np.inf
        self.detener = False
        self.mejores_pesos = None

    def __call__(self, val_loss, modelo):
        # 1. Protección contra colapso matemático (Exploding Gradients)
        if np.isnan(val_loss) or np.isinf(val_loss):
            print("⚠️ [EarlyStopping] val_loss es NaN/Inf. Deteniendo para salvar los últimos pesos estables.")
            self.detener = True
            return

        # 2. Si hay una mejora real que supera el delta
        if val_loss < self.mejor_loss - self.delta:
            self.mejor_loss = val_loss
            # Guardamos la mejor versión del cerebro
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0 # Reiniciamos paciencia
            
        # 3. Si no hay mejora suficiente (Ruido o inicio de Overfitting)
        else:
            self.contador += 1
            print(f'   ⏳ [EarlyStopping] Paciencia: {self.contador}/{self.paciencia} (Mejor histórica: {self.mejor_loss:.4f})')
            if self.contador >= self.paciencia:
                print(f"🛑 [EarlyStopping] Entrenamiento detenido. No hubo mejora en {self.paciencia} épocas seguidas.")
                self.detener = True

# =====================================================================
# FUNCIÓN DE ENTRENAMIENTO ORQUESTADA
# =====================================================================
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
                            early_stopping_patience: int = 8) -> Tuple[Any, Dict[str, list]]:
    """Entrena la CNN con aprendizaje supervisado usando mixed precision y early stopping robusto."""

    # 1. Preparar DataLoaders para Entrenamiento
    x_train_tensor = torch.tensor(x_entrenamiento)
    y_reg_train_tensor = torch.tensor(y_reg_entrenamiento).view(-1, 1)
    y_clf_train_tensor = torch.tensor(y_clf_entrenamiento).view(-1, 1)
    
    train_dataset = torch.utils.data.TensorDataset(x_train_tensor, y_reg_train_tensor, y_clf_train_tensor)
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True, pin_memory=True)
    
    # Preparar DataLoaders para Validación
    y_reg_val_tensor = torch.tensor(y_reg_validacion).view(-1, 1)
    y_clf_val_tensor = torch.tensor(y_clf_validacion).view(-1, 1)
    
    val_dataset = torch.utils.data.TensorDataset(x_validacion, y_reg_val_tensor, y_clf_val_tensor)
    val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=batch_size, shuffle=False, pin_memory=True)

    # 2. Optimizador (LR Alto para Regresión Logarítmica) y Optimizadores
    optimizer = optim.Adam(modelo.parameters(), lr=0.002)
    scheduler = StepLR(optimizer, step_size=max(1, epochs // 4), gamma=0.5)
    scaler = GradScaler(enabled=(device.type == 'cuda'))

    criterio_reg = nn.HuberLoss(delta=0.01) #Sensible a retornos porcentuales
    criterio_clf = nn.BCEWithLogitsLoss()
    criterio_mae = nn.L1Loss()
    
    # 3. Instanciar Early Stopping
    early_stopping = EarlyStopping(paciencia=early_stopping_patience, delta=0.002)
    
    historial = {'loss': [], 'val_loss': [], 'mae': [], 'val_mae': []}

    for epoch in range(epochs):
        modelo.train()
        train_loss_total = 0.0
        train_mae_total = 0.0
        
        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False)
        
        for x_batch, y_reg_batch, y_clf_batch in loop:
            x_batch = x_batch.to(device, non_blocking=True).contiguous()
            y_reg_batch = y_reg_batch.to(device, non_blocking=True)
            y_clf_batch = y_clf_batch.to(device, non_blocking=True)

            optimizer.zero_grad()

            with autocast(device_type=device.type):
                pred_reg, pred_clf = modelo(x_batch)
                loss_reg = criterio_reg(pred_reg, y_reg_batch)
                loss_clf = criterio_clf(pred_clf, y_clf_batch)
                loss = loss_reg + loss_clf
                mae = criterio_mae(pred_reg, y_reg_batch)

            scaler.scale(loss).backward()
            
            # Gradient Clipping para evitar explosiones matemáticas
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(modelo.parameters(), max_norm=1.0)
            
            scaler.step(optimizer)
            scaler.update()

            train_loss_total += loss.item()
            train_mae_total += mae.item()
            loop.set_postfix(loss=f"{loss.item():.4f}")

        scheduler.step()

        # Validación
        modelo.eval()
        val_loss_total = 0.0
        val_mae_total = 0.0
        
        with torch.no_grad():
            for x_val, y_reg_val_batch, y_clf_val_batch in val_loader:
                x_val = x_val.to(device, non_blocking=True).contiguous()
                y_reg_val_batch = y_reg_val_batch.to(device, non_blocking=True)
                y_clf_val_batch = y_clf_val_batch.to(device, non_blocking=True)

                with autocast(device_type=device.type):
                    pred_reg_val, pred_clf_val = modelo(x_val)
                    loss_reg_val = criterio_reg(pred_reg_val, y_reg_val_batch)
                    loss_clf_val = criterio_clf(pred_clf_val, y_clf_val_batch)
                    loss_val = loss_reg_val + loss_clf_val
                    mae_val = criterio_mae(pred_reg_val, y_reg_val_batch)

                val_loss_total += loss_val.item()
                val_mae_total += mae_val.item()

        train_loss = train_loss_total / len(train_loader)
        train_mae = train_mae_total / len(train_loader)
        val_loss = val_loss_total / len(val_loader)
        val_mae = val_mae_total / len(val_loader)

        historial['loss'].append(train_loss)
        historial['mae'].append(train_mae)
        historial['val_loss'].append(val_loss)
        historial['val_mae'].append(val_mae)

        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f} - MAE: {val_mae:.4f}")

        # 4. Evaluación del Early Stopping al final de la época
        early_stopping(val_loss, modelo)
        if early_stopping.detener:
            break

    # 5. RESTAURAR LA MEMORIA (EL PASO MÁS CRÍTICO)
    if early_stopping.mejores_pesos is not None:
        modelo.load_state_dict(early_stopping.mejores_pesos)
        print("✅ Mejores pesos restaurados en el modelo CNN exitosamente.")
        pesos_finales = early_stopping.mejores_pesos
    else:
        pesos_finales = copy.deepcopy(modelo.state_dict())

    return pesos_finales, historial

# =====================================================================
# FUNCIÓN DE EVALUACIÓN FINAL
# =====================================================================
def evaluar_cnn(modelo: nn.Module,
                x_validacion: torch.Tensor,
                y_reg_validacion: np.ndarray,
                y_clf_validacion: np.ndarray,
                device: torch.device) -> Dict[str, float]:
    """Evalúa el modelo CNN y genera las métricas para la base de datos."""
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

        try:
            auc = roc_auc_score(y_clf_validacion, pred_clf_prob)
        except ValueError:
            auc = 0.0

        cm = confusion_matrix(y_clf_validacion, pred_clf_binary)
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
        else:
            tp = tn = fp = fn = 0
            if cm.shape[0] == 1:
                if y_clf_validacion[0] == 1:
                    tp = cm[0, 0]
                else:
                    tn = cm[0, 0]

    return {
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1_score': f1,
        'mae': mae,
        'auc': auc,
        'tp': tp,
        'tn': tn,
        'fp': fp,
        'fn': fn
    }