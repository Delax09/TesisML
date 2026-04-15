import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import copy
import sys 
from tqdm import tqdm # 👈 IMPORTACIÓN DE TQDM
from app.ml.core.engine import MLEngine 
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, mean_absolute_error

from app.ml.core.early_stopping import EarlyStopping 

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=30):
    criterion_reg = nn.HuberLoss(delta=0.01) 
    criterion_clf = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.002, weight_decay=1e-5)
    
    early_stopping = EarlyStopping(paciencia=8, delta=0.002)
    scaler_autocast = torch.amp.GradScaler(enabled=(device.type == 'cuda'))

    print(f"🚀 Iniciando entrenamiento LSTM en {device.type.upper()} ({len(train_loader)} batches)...", flush=True)

    if torch.cuda.is_available():
        print(f"🎮 GPU disponible: {torch.cuda.get_device_name()}")
        print(f"💾 VRAM total: {torch.cuda.get_device_properties(0).total_memory // 1024**3}GB")
    else:
        print("💻 Usando CPU - rendimiento limitado")

    for epoch in range(epochs):
        model.train()
        train_loss = 0
        
        #BARRA DE PROGRESO CLÁSICA PARA LOS BATCHES
        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, file=sys.stdout)
        
        for x_b, yr_b, yc_b in loop:
            x_b, yr_b, yc_b = x_b.to(device, non_blocking = True), yr_b.to(device, non_blocking = True), yc_b.to(device, non_blocking = True)
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
            
            loop.set_postfix(loss=loss.item())

        # Validación
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for xv, yrv, ycv in val_loader:
                xv, yrv, ycv = xv.to(device), yrv.to(device), ycv.to(device)
                pr, lc = model(xv)
                val_loss += (criterion_reg(pr, yrv) + criterion_clf(lc, ycv)).item()
        
        if len(val_loader) > 0:
            val_loss /= len(val_loader)
            print(f"📈 Epoch {epoch+1} Finalizado - Val Loss: {val_loss:.4f}", flush=True)
            early_stopping(val_loss, model)
            
            if early_stopping.detener: 
                break

    if early_stopping.mejores_pesos is not None:
        model.load_state_dict(early_stopping.mejores_pesos)
        pesos_finales = early_stopping.mejores_pesos
        print("✅ Mejores pesos restaurados.", flush=True)
    else:
        pesos_finales = copy.deepcopy(model.state_dict())
        print("⚠️ Se guardó el estado actual (No hubo mejora inicial).", flush=True)
        
    return pesos_finales

def evaluar_modelo_lstm(model, val_loader, device):
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
        'fn': fn,
        'DiasFutro': MLEngine.DIAS_PREDICCION
    }