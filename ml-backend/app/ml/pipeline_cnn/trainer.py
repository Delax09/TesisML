import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import StepLR
import numpy as np
import copy
import sys
from tqdm import tqdm
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_error, roc_auc_score, confusion_matrix

from app.ml.core.early_stopping import EarlyStopping 

def ejecutar_entrenamiento_cnn(modelo, train_loader, val_loader, device, epochs=50):
    criterio_reg = nn.HuberLoss(delta=0.01)
    criterio_clf = nn.BCEWithLogitsLoss()
    
    # 🚀 OPTIMIZACIÓN: Learning Rate calibrado a 0.001
    optimizer = optim.Adam(modelo.parameters(), lr=0.001, weight_decay=1e-5)
    scheduler = StepLR(optimizer, step_size=max(1, epochs // 4), gamma=0.5)
    
    early_stopping = EarlyStopping(paciencia=8, delta=0.002)

    print(f"🚀 Iniciando entrenamiento CNN en {device.type.upper()} ({len(train_loader)} batches)...", flush=True)

    for epoch in range(epochs):
        modelo.train()
        train_loss = 0.0
        
        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, file=sys.stdout)
        
        for batch_x, batch_y_reg, batch_y_clf in loop:
            # 🚀 Transferencia Asíncrona
            batch_x = batch_x.to(device, non_blocking=True)
            batch_y_reg = batch_y_reg.to(device, non_blocking=True)
            batch_y_clf = batch_y_clf.to(device, non_blocking=True)

            optimizer.zero_grad()

            pred_reg, pred_clf = modelo(batch_x)
            loss = criterio_reg(pred_reg, batch_y_reg) + criterio_clf(pred_clf, batch_y_clf)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(modelo.parameters(), max_norm=1.0)
            optimizer.step()
            
            train_loss += loss.item()
            loop.set_postfix(loss=loss.item())

        scheduler.step()

        # Validación
        modelo.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_x, val_y_reg, val_y_clf in val_loader:
                val_x = val_x.to(device, non_blocking=True)
                val_y_reg = val_y_reg.to(device, non_blocking=True)
                val_y_clf = val_y_clf.to(device, non_blocking=True)
                
                pred_reg_val, pred_clf_val = modelo(val_x)
                val_loss += (criterio_reg(pred_reg_val, val_y_reg) + criterio_clf(pred_clf_val, val_y_clf)).item()

        if len(val_loader) > 0:
            val_loss /= len(val_loader)
            print(f"📈 Epoch {epoch+1} Finalizado - Val Loss: {val_loss:.4f}", flush=True)
            early_stopping(val_loss, modelo)
            
            if early_stopping.detener: 
                break

    # 🛡️ PROTECCIÓN: Evitar guardar modelo vacío si falla en la época 1
    if early_stopping.mejores_pesos is not None:
        modelo.load_state_dict(early_stopping.mejores_pesos)
        pesos_finales = early_stopping.mejores_pesos
        print("✅ Mejores pesos de CNN restaurados.", flush=True)
    else:
        pesos_finales = copy.deepcopy(modelo.state_dict())
        print("⚠️ Se guardó el estado actual de la CNN.", flush=True)

    return pesos_finales

def evaluar_modelo_cnn(modelo, val_loader, device):
    modelo.eval()
    y_real_clf, y_prob_clf, y_real_reg, y_pred_reg = [], [], [], []

    with torch.no_grad():
        for xv, yrv, ycv in val_loader:
            xv = xv.to(device)
            pred_reg, pred_clf = modelo(xv)
            
            y_prob_clf.extend(torch.sigmoid(pred_clf).cpu().numpy().flatten())
            y_real_clf.extend(ycv.numpy().flatten())
            y_pred_reg.extend(pred_reg.cpu().numpy().flatten())
            y_real_reg.extend(yrv.numpy().flatten())

    # 🛡️ PROTECCIÓN FINAL: Sanitizar métricas para evitar caídas en el dashboard web
    y_prob_clf = np.nan_to_num(np.array(y_prob_clf), nan=0.0)
    y_pred_reg = np.nan_to_num(np.array(y_pred_reg), nan=0.0)
    
    y_pred_clf = (y_prob_clf > 0.5).astype(int)

    cm = confusion_matrix(y_real_clf, y_pred_clf)
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0,0,0,0)

    return {
        'accuracy': accuracy_score(y_real_clf, y_pred_clf),
        'precision': precision_score(y_real_clf, y_pred_clf, zero_division=0),
        'recall': recall_score(y_real_clf, y_pred_clf, zero_division=0),
        'f1_score': f1_score(y_real_clf, y_pred_clf, zero_division=0),
        'mae': mean_absolute_error(y_real_reg, y_pred_reg),
        'auc': roc_auc_score(y_real_clf, y_prob_clf) if len(set(y_real_clf)) > 1 else 0.0,
        'tp': tp, 'tn': tn, 'fp': fp, 'fn': fn
    }