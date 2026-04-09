import torch
import torch.nn as nn
import torch.optim as optim
import copy
from tqdm import tqdm
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from app.ml.engine import MLEngine

class EarlyStopping:
    def __init__(self, paciencia=5, delta=0):
        self.paciencia = paciencia; self.delta = delta; self.contador = 0
        self.mejor_loss = None; self.detener = False; self.mejores_pesos = None

    def __call__(self, val_loss, modelo):
        if self.mejor_loss is None:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
        elif val_loss > self.mejor_loss - self.delta:
            self.contador += 1
            if self.contador >= self.paciencia: self.detener = True
        else:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0

def ejecutar_entrenamiento_pytorch_optimizado(model, train_loader, val_loader, device, epochs=25, class_weight=None):
    criterion_reg = nn.HuberLoss(delta=1.0)
    if class_weight is None:
        class_weight = torch.tensor([1.0], device=device)
    criterion_clf = nn.BCEWithLogitsLoss(pos_weight=class_weight)
    criterion_mae = nn.L1Loss()
    
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    early_stopping = EarlyStopping(paciencia=5, delta=1e-4)
    
    historial = {
        'loss': [], 'mae': [], 'val_loss': [], 'val_mae': [],
        'val_accuracy': [], 'val_precision': [], 'val_recall': [], 'val_f1': [], 'val_auc': []
    }
    scaler_autocast = torch.amp.GradScaler(device.type)

    for epoch in range(epochs):
        model.train()
        train_loss, train_mae = 0.0, 0.0
        loop_entrenamiento = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, unit="batch")
        
        for x_batch, y_reg_batch, y_clf_batch in loop_entrenamiento:
            x_batch = x_batch.to(device, non_blocking=True).contiguous()  # Asegurar contigüidad para cuDNN
            y_reg_batch = y_reg_batch.to(device, non_blocking=True)
            y_clf_batch = y_clf_batch.to(device, non_blocking=True)
            
            optimizer.zero_grad()
            
            with torch.amp.autocast(device.type):
                pred_reg, logits_clf = model(x_batch) # 👈 Logits directos
                loss_reg = criterion_reg(pred_reg, y_reg_batch)
                loss_clf = criterion_clf(logits_clf, y_clf_batch)
                loss_total = loss_reg + loss_clf
                mae = criterion_mae(pred_reg, y_reg_batch)
            
            scaler_autocast.scale(loss_total).backward()
            scaler_autocast.step(optimizer)
            scaler_autocast.update()
            
            train_loss += loss_total.item()
            train_mae += mae.item()
            loop_entrenamiento.set_postfix(loss=f"{loss_total.item():.4f}", mae=f"{mae.item():.4f}")
            
        train_loss /= len(train_loader)
        train_mae /= len(train_loader)
        
        model.eval()
        val_loss, val_mae = 0.0, 0.0
        y_val_real, y_val_pred = [], []
        with torch.no_grad():
            for x_val, y_reg_val, y_clf_val in val_loader:
                x_val = x_val.to(device, non_blocking=True).contiguous()  # Asegurar contigüidad para cuDNN
                y_reg_val = y_reg_val.to(device, non_blocking=True)
                y_clf_val = y_clf_val.to(device, non_blocking=True)
                
                with torch.amp.autocast(device.type):
                    p_reg, l_clf = model(x_val)
                    pred_clf = torch.sigmoid(l_clf)
                    v_loss = criterion_reg(p_reg, y_reg_val) + criterion_clf(l_clf, y_clf_val)
                    
                val_loss += v_loss.item()
                val_mae += criterion_mae(p_reg, y_reg_val).item()
                y_val_real.extend(y_clf_val.cpu().numpy().reshape(-1))
                y_val_pred.extend(pred_clf.cpu().numpy().reshape(-1))
                
        val_loss /= len(val_loader)
        val_mae /= len(val_loader)

        y_val_pred_binary = (np.array(y_val_pred) > 0.5).astype(int)
        val_accuracy = accuracy_score(y_val_real, y_val_pred_binary)
        val_precision = precision_score(y_val_real, y_val_pred_binary, zero_division=0)
        val_recall = recall_score(y_val_real, y_val_pred_binary, zero_division=0)
        val_f1 = f1_score(y_val_real, y_val_pred_binary, zero_division=0)
        try:
            val_auc = roc_auc_score(y_val_real, y_val_pred)
        except ValueError:
            val_auc = 0.0
        
        historial['loss'].append(train_loss)
        historial['mae'].append(train_mae)
        historial['val_loss'].append(val_loss)
        historial['val_mae'].append(val_mae)
        historial['val_accuracy'].append(val_accuracy)
        historial['val_precision'].append(val_precision)
        historial['val_recall'].append(val_recall)
        historial['val_f1'].append(val_f1)
        historial['val_auc'].append(val_auc)
        
        print(
            f"Epoch [{epoch+1}/{epochs}] - Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f} "
            f"- Val Acc: {val_accuracy:.3f} - Val AUC: {val_auc:.3f}"
        )
        
        early_stopping(val_loss, model)
        if early_stopping.detener:
            print(f"⏹️ Early stopping activado en epoch {epoch+1}")
            break
        
        if device.type == 'cuda':
            torch.cuda.empty_cache()
            
    return historial, early_stopping.mejores_pesos

def calcular_metricas_clasificacion(model, val_loader, device, class_weight=None):
    y_val_real = []
    y_val_pred = []
    val_mae = 0.0
    val_loss = 0.0
    criterion_mae = nn.L1Loss()
    criterion_reg = nn.HuberLoss(delta=1.0)
    if class_weight is None:
        class_weight = torch.tensor([1.0], device=device)
    criterion_clf = nn.BCEWithLogitsLoss(pos_weight=class_weight)

    model.eval()
    with torch.no_grad():
        for x_val, y_reg_val, y_clf_val in val_loader:
            x_val = x_val.to(device, non_blocking=True).contiguous()  # Asegurar contigüidad para cuDNN
            y_reg_val = y_reg_val.to(device, non_blocking=True)
            y_clf_val = y_clf_val.to(device, non_blocking=True)

            with torch.amp.autocast(device.type):
                pred_reg, logits_clf = model(x_val)
                pred_clf = torch.sigmoid(logits_clf)
                loss_reg = criterion_reg(pred_reg, y_reg_val)
                loss_clf = criterion_clf(logits_clf, y_clf_val)
                loss_total = loss_reg + loss_clf

            val_loss += loss_total.item()
            val_mae += float(criterion_mae(pred_reg, y_reg_val))
            y_val_real.extend(y_clf_val.cpu().numpy().reshape(-1))
            y_val_pred.extend(pred_clf.cpu().numpy().reshape(-1))

    if len(y_val_real) == 0:
        return {
            'loss': 0.0,
            'mae': 0.0,
            'val_loss': 0.0,
            'val_mae': 0.0,
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1_score': 0.0,
            'DiasFuturo': MLEngine.DIAS_PREDICCION
        }

    val_loss /= len(val_loader)
    val_mae /= len(val_loader)

    y_val_pred_binary = (np.array(y_val_pred) > 0.5).astype(int)

    acc = accuracy_score(y_val_real, y_val_pred_binary)
    prec = precision_score(y_val_real, y_val_pred_binary, zero_division=0)
    rec = recall_score(y_val_real, y_val_pred_binary, zero_division=0)
    f1 = f1_score(y_val_real, y_val_pred_binary, zero_division=0)

    # Calcular AUC
    try:
        auc = roc_auc_score(y_val_real, y_val_pred)
    except ValueError:
        auc = 0.0  # En caso de que no haya clases positivas o negativas

    # Calcular matriz de confusión
    cm = confusion_matrix(y_val_real, y_val_pred_binary)
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
    else:
        # Si no es 2x2, por ejemplo si solo hay una clase
        tp = tn = fp = fn = 0
        if cm.shape[0] == 1:
            if y_val_real[0] == 1:
                tp = cm[0][0]
            else:
                tn = cm[0][0]

    return {
        'loss': float(val_loss),
        'mae': float(val_mae),
        'val_loss': float(val_loss),
        'val_mae': float(val_mae),
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1),
        'auc': float(auc),
        'tp': int(tp),
        'tn': int(tn),
        'fp': int(fp),
        'fn': int(fn),
        'DiasFuturo': MLEngine.DIAS_PREDICCION
    }