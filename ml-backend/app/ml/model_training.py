import torch
import torch.nn as nn
import torch.optim as optim
import copy
from tqdm import tqdm
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from app.ml.engine import MLEngine

class EarlyStopping:
    def __init__(self, paciencia=8, delta=0.001):
        self.paciencia = paciencia; 
        self.delta = delta; 
        self.contador = 0
        self.mejor_loss = np.inf; 
        self.detener = False; 
        self.mejores_pesos = None

    def __call__(self, val_loss, modelo):
        #Proteccion contra COLAPSO matematico
        if np.isnan(val_loss) or np.ifinf(val_loss):
            print("⚠️ [EarlyStopping] val_loss es NaN/Inf. Deteniendo para salvar los últimos pesos estables.")
            self.detener = True
            return
        
        #Mejora real que supera el delta 
        if val_loss < self.mejor_loss - self.delta:
            self.mejor_loss = val_loss
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0 
        
        #No hay mejora 
        else: 
            self.contador += 1 
            print(f'[EarlyStopping] Paciencia: {self.contador}/{self.paciencia} (Mejor histórica: {self.mejor_loss:.4f})')
            if self.contador >= self.paciencia:
                print(f"[EarlyStopping] Entrenamiento detenido. No hubo mejora en {self.paciencia} épocas")
                self.detener = True

def ejecutar_entrenamiento_pytorch_optimizado(model, train_loader, val_loader, device, epochs=25):
    criterion_reg = nn.HuberLoss(delta=0.01)
    
    
    criterion_clf = nn.BCEWithLogitsLoss()
    criterion_mae = nn.L1Loss()
    
    #Cambiar aqui para calcular el peso de clase dinamicamente 
    optimizer = optim.Adam(model.parameters(), lr=0.0003, weight_decay=1e-5)
    
    early_stopping = EarlyStopping(paciencia=8, delta=1e-4)
    
    historial = {
        'loss': [], 
        'mae': [], 
        'val_loss': [], 
        'val_mae': [],
        'val_accuracy': [], 
        'val_precision': [], 
        'val_recall': [], 
        'val_f1': [], 
        'val_auc': []
    }
    scaler_autocast = torch.amp.GradScaler(enabled=(device.type == 'cuda'))

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
            
            # 👇 CAMBIO 3: Clip de gradientes para evitar que la red neuronal explote
            scaler_autocast.unscale_(optimizer) 
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
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
        
        if early_stopping.mejores_pesos is not None:
            model.load_state_dict(early_stopping.mejores_pesos)
            print(f"mejores pesos restaurados")
            
    return historial, early_stopping.mejores_pesos

def calcular_metricas_clasificacion(model, val_loader, device):
    y_val_real = []
    y_val_pred = []
    val_mae = 0.0
    val_loss = 0.0
    criterion_mae = nn.L1Loss()
    criterion_reg = nn.HuberLoss(delta=0.01)
    
    # También eliminamos el sesgo al calcular la métrica de validación final
    criterion_clf = nn.BCEWithLogitsLoss()

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

    try:
        auc = roc_auc_score(y_val_real, y_val_pred)
    except ValueError:
        auc = 0.0 

    cm = confusion_matrix(y_val_real, y_val_pred_binary)
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
    else:
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