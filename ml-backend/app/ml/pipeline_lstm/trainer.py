import torch
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, mean_absolute_error

from app.ml.core.early_stopping import EarlyStopping # Importación modular

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=30):
    """Ejecuta el entrenamiento con pérdida Huber optimizada para log-returns"""
    criterion_reg = nn.HuberLoss(delta=0.01) # Sensibilidad a retornos porcentuales
    criterion_clf = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005, weight_decay=1e-5)
    
    early_stopping = EarlyStopping(paciencia=8, delta=0.002)
    scaler_autocast = torch.amp.GradScaler(enabled=(device.type == 'cuda'))

    for epoch in range(epochs):
        model.train()
        train_loss = 0
        loop = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}", leave=False)
        
        for x_b, yr_b, yc_b in loop:
            x_b, yr_b, yc_b = x_b.to(device), yr_b.to(device), yc_b.to(device)
            optimizer.zero_grad()
            
            with torch.amp.autocast(device.type):
                p_reg, l_clf = model(x_b)
                loss = criterion_reg(p_reg, yr_b) + criterion_clf(l_clf, yc_b)
            
            scaler_autocast.scale(loss).backward()
            scaler_autocast.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler_autocast.step(optimizer)
            scaler_autocast.update()
            train_loss += loss.item()

        # Validación para Early Stopping
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for xv, yrv, ycv in val_loader:
                xv, yrv, ycv = xv.to(device), yrv.to(device), ycv.to(device)
                pr, lc = model(xv)
                val_loss += (criterion_reg(pr, yrv) + criterion_clf(lc, ycv)).item()
        
        val_loss /= len(val_loader)
        print(f"Epoch {epoch+1} - Val Loss: {val_loss:.4f}")
        
        early_stopping(val_loss, model)
        if early_stopping.detener: break

    if early_stopping.mejores_pesos:
        model.load_state_dict(early_stopping.mejores_pesos)
        print("✅ Mejores pesos restaurados.")
    return early_stopping.mejores_pesos

def evaluar_modelo_lstm(model, val_loader, device):
    """Calcula métricas detalladas de clasificación y regresión"""
    model.eval()
    y_real_clf, y_prob_clf, y_real_reg, y_pred_reg = [], [], [], []
    
    with torch.no_grad():
        for xv, yrv, ycv in val_loader:
            xv = xv.to(device)
            p_reg, logits = model(xv)
            
            y_prob_clf.extend(torch.sigmoid(logits).cpu().numpy().flatten())
            y_real_clf.extend(ycv.numpy().flatten())
            y_pred_reg.extend(p_reg.cpu().numpy().flatten())
            y_real_reg.extend(yrv.numpy().flatten())

    y_prob_clf = np.array(y_prob_clf)
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
        'tp': tp, 
        'tn': tn, 
        'fp': fp, 
        'fn': fn
    }