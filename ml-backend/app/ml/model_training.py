import torch
import torch.nn as nn
import torch.optim as optim
import copy
from tqdm import tqdm
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
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

def ejecutar_entrenamiento_pytorch_optimizado(model, train_loader, val_loader, device, epochs=25):
    criterion_reg = nn.HuberLoss(delta=1.0)
    pesos_clases = torch.tensor([1.2]).to(device) # 👈 Penaliza la predicción optimista
    criterion_clf = nn.BCEWithLogitsLoss(pos_weight=pesos_clases) # 👈 Seguro para Autocast
    criterion_mae = nn.L1Loss() 
    
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    early_stopping = EarlyStopping(paciencia=3, delta=0.0) # 👈 Paciencia más estricta
    
    historial = {'loss': [], 'mae': [], 'val_loss': [], 'val_mae': []}
    scaler_autocast = torch.amp.GradScaler(device.type) 

    for epoch in range(epochs):
        model.train()
        train_loss, train_mae = 0.0, 0.0
        loop_entrenamiento = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, unit="batch")
        
        for x_batch, y_reg_batch, y_clf_batch in loop_entrenamiento:
            x_batch = x_batch.to(device, non_blocking=True)
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
        with torch.no_grad():
            for x_val, y_reg_val, y_clf_val in val_loader:
                x_val = x_val.to(device, non_blocking=True)
                y_reg_val = y_reg_val.to(device, non_blocking=True)
                y_clf_val = y_clf_val.to(device, non_blocking=True)
                
                with torch.amp.autocast(device.type):
                    p_reg, l_clf = model(x_val)
                    v_loss = criterion_reg(p_reg, y_reg_val) + criterion_clf(l_clf, y_clf_val)
                    
                val_loss += v_loss.item()
                val_mae += criterion_mae(p_reg, y_reg_val).item()
                
        val_loss /= len(val_loader)
        val_mae /= len(val_loader)
        
        historial['loss'].append(train_loss)
        historial['mae'].append(train_mae)
        historial['val_loss'].append(val_loss)
        historial['val_mae'].append(val_mae)
        
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {train_loss:.4f} - val_loss: {val_loss:.4f}")
        
        early_stopping(val_loss, model)
        if early_stopping.detener: break
            
    return historial, early_stopping.mejores_pesos

def calcular_metricas_clasificacion(model, x_tensor, y_clf_tensor, split_idx, historial, device):
    x_val_final = x_tensor[split_idx:]
    y_val_real = y_clf_tensor[split_idx:].numpy()
    
    y_val_pred_list = []
    lote_evaluacion = 128 
    
    model.eval()
    with torch.no_grad():
        for i in range(0, len(x_val_final), lote_evaluacion):
            x_batch = x_val_final[i:i+lote_evaluacion].to(device)
            with torch.amp.autocast(device.type):
                _, logits_clf = model(x_batch)
                # 👈 Calculamos la sigmoide manual para sacar la métrica de porcentaje
                pred_clf = torch.sigmoid(logits_clf)
            y_val_pred_list.append(pred_clf.cpu().numpy())

    probabilidades = np.vstack(y_val_pred_list)
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
        'f1_score': float(f1),
        'DiasFuturo': MLEngine.DIAS_PREDICCION # 👈 Guardamos los días usados en la BD
    }