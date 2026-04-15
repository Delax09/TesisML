import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import copy
import sys
from tqdm import tqdm
import logging

from app.ml.core.engine import MLEngine
from app.ml.core.logger import configurar_logger
from app.ml.core.metrics import MetricasNormalizadas
from app.ml.core.validation import validacion_cruzada_k_fold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, mean_absolute_error

from app.ml.core.early_stopping import EarlyStopping

# Configurar logger
logger = configurar_logger("ML.Trainer.LSTM", archivo_log="logs/lstm_training.log")

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=30):
    criterion_reg = nn.HuberLoss(delta=0.01)
    criterion_clf = nn.BCEWithLogitsLoss()

    # 1. OPTIMIZACIÓN DE ESTABILIDAD: Learning rate balanceado (ni muy lento, ni explosivo)
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)

    early_stopping = EarlyStopping(paciencia=8, delta=0.002)

    logger.info("Iniciando entrenamiento LSTM",
                extra={"device": device.type.upper(), "batches": len(train_loader), "epochs": epochs})

    if torch.cuda.is_available():
        logger.info("GPU disponible",
                    extra={"gpu_name": torch.cuda.get_device_name(),
                          "vram_gb": torch.cuda.get_device_properties(0).total_memory // 1024**3})

    mejor_modelo = None
    mejor_score = 0

    for epoch in range(epochs):
        model.train()
        train_loss = 0
        total_batches = len(train_loader)

        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, file=sys.stdout)

        for x_b, yr_b, yc_b in loop:
            x_b, yr_b, yc_b = x_b.to(device, non_blocking=True), yr_b.to(device, non_blocking=True), yc_b.to(device, non_blocking=True)
            optimizer.zero_grad()

            # 2. OPTIMIZACIÓN DE ESTABILIDAD: Quitamos autocast en LSTM para evitar colapso NaN
            p_reg, l_clf = model(x_b)
            loss = criterion_reg(p_reg, yr_b) + criterion_clf(l_clf, yc_b)

            loss.backward()

            # Recorte estricto de gradientes para proteger la memoria de la GRU
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

            optimizer.step()
            train_loss += loss.item()
            loop.set_postfix(loss=loss.item())

        # Validación al final de cada epoch
        val_metrics = evaluar_modelo_lstm(model, val_loader, device)
        val_score = MetricasNormalizadas.calcular_score_global(val_metrics)

        logger.info("Epoch completada",
                   extra={"epoch": epoch+1, "train_loss": train_loss/total_batches,
                          "val_accuracy": val_metrics['accuracy'], "val_auc": val_metrics['auc'],
                          "val_score_global": val_score})

        # Early stopping
        early_stopping(val_score)
        if early_stopping.mejor_score == val_score:
            mejor_modelo = copy.deepcopy(model.state_dict())

        if early_stopping.debe_parar():
            logger.info("Early stopping activado", extra={"epoch": epoch+1, "mejor_score": early_stopping.mejor_score})
            break

    # Retornar mejores pesos encontrados
    if mejor_modelo is None:
        mejor_modelo = model.state_dict()

    logger.info("Entrenamiento LSTM completado", extra={"epochs_completadas": epoch+1})
    return mejor_modelo

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

    # 3. OPTIMIZACIÓN DE ESTABILIDAD: Sanitizar las salidas antes de Sklearn
    # Por si acaso la red escupe un NaN residual, lo convertimos en un 0 para no romper la web.
    y_prob_clf = np.nan_to_num(np.array(y_prob_clf), nan=0.0)
    y_pred_reg = np.nan_to_num(np.array(y_pred_reg), nan=0.0)

    y_pred_clf = (y_prob_clf > 0.5).astype(int)

    cm = confusion_matrix(y_real_clf, y_pred_clf)
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0,0,0,0)

def ejecutar_validacion_cruzada_lstm(model_class, data_processor, device, k=5, epochs=30):
    """
    Ejecuta validación cruzada k-fold para el modelo LSTM.

    Args:
        model_class: Clase del modelo LSTM
        data_processor: Instancia del data processor
        device: Dispositivo para entrenamiento
        k: Número de folds para validación cruzada
        epochs: Número de epochs por fold

    Returns:
        dict: Resultados de validación cruzada con métricas promedio
    """
    logger.info("Iniciando validación cruzada LSTM", extra={"k_folds": k, "epochs_por_fold": epochs})

    def train_fold_function(train_data, val_data):
        # Crear modelo para este fold
        model = model_class()
        model.to(device)

        # Preparar dataloaders
        train_loader = data_processor.crear_dataloaders_generico(train_data, batch_size=32, shuffle=True)
        val_loader = data_processor.crear_dataloaders_generico(val_data, batch_size=32, shuffle=False)

        # Entrenar modelo
        mejores_pesos = ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs)

        # Cargar mejores pesos y evaluar
        model.load_state_dict(mejores_pesos)
        metrics = evaluar_modelo_lstm(model, val_loader, device)

        return MetricasNormalizadas.calcular_score_global(metrics), metrics

    # Ejecutar validación cruzada
    resultados = validacion_cruzada_k_fold(
        data_processor.df_procesado,
        train_fold_function,
        k=k
    )

    logger.info("Validación cruzada LSTM completada",
               extra={"score_promedio": resultados['score_promedio'],
                      "desviacion_estandar": resultados['desviacion_estandar']})

    return resultados