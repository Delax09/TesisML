import random
import sys
import logging

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from tqdm import tqdm
from scipy.stats import spearmanr
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, roc_curve, confusion_matrix, mean_absolute_error)

from app.ml.core.engine import MLEngine
from app.ml.arquitectura import EnsambleModelos
from app.ml.core.logger import configurar_logger
from app.ml.core.metrics import metricas_cartera
from app.ml.core.early_stopping import EarlyStopping


def fijar_semillas(seed: int = MLEngine.SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class PipelineTrainer:
    def __init__(self, architecture_name: str, log_file: str):
        self.architecture_name = architecture_name
        self.logger = configurar_logger(f"ML.Trainer.{architecture_name}", archivo_log=log_file)

    # ------------------------------------------------------------------ utilidades
    def _predecir(self, model, loader, device):
        """Devuelve prob. alcista, retorno predicho (escala real), y_clf, y_reg."""
        model.eval()
        P, R, YC, YR = [], [], [], []
        with torch.no_grad():
            for xb, yrb, ycb in loader:
                p_reg, logits = model(xb.to(device))
                P.append(torch.sigmoid(logits).cpu().numpy().ravel())
                R.append(p_reg.cpu().numpy().ravel() * MLEngine.REG_SCALE)
                YC.append(ycb.numpy().ravel())
                YR.append(yrb.numpy().ravel())
        return [np.concatenate(a) for a in (P, R, YC, YR)]

    # ------------------------------------------------------------------ entrenamiento
    def ejecutar_entrenamiento(self, model, train_loader, val_loader, device,
                               epochs=None, lr=None, lambda_reg=0.5, paciencia=None, weight_decay=None):
        epochs = epochs or MLEngine.EPOCHS
        lr = lr or MLEngine.LR
        paciencia = paciencia or MLEngine.PACIENCIA
        weight_decay = MLEngine.WEIGHT_DECAY if weight_decay is None else weight_decay

        # Datos ya balanceados -> BCE simple (sin focal loss ni pos_weight encima)
        criterion_clf = nn.BCEWithLogitsLoss()
        # El objetivo se escala (log_ret / REG_SCALE) para que ambas pérdidas pesen parecido
        criterion_reg = nn.HuberLoss(delta=1.0)

        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
        # Criterio estable e independiente del umbral: AUC de validación
        early = EarlyStopping(paciencia=paciencia, delta=0.001, modelo_inicial=model, modo='max')

        self.logger.info("Iniciando entrenamiento", extra={
            "architecture": self.architecture_name, "device": device.type.upper(),
            "batches": len(train_loader), "epochs": epochs})

        train_loss = 0.0
        for epoch in range(epochs):
            model.train()
            total = 0.0
            loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{epochs}]", leave=False, file=sys.stdout)
            for xb, yrb, ycb in loop:
                xb, yrb, ycb = xb.to(device), yrb.to(device), ycb.to(device)
                optimizer.zero_grad()
                p_reg, logits = model(xb)
                loss = criterion_clf(logits, ycb) + lambda_reg * criterion_reg(p_reg, yrb / MLEngine.REG_SCALE)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                total += loss.item()
                loop.set_postfix(loss=loss.item())
            scheduler.step()
            train_loss = total / max(len(train_loader), 1)

            prob, pred_r, yc, yr = self._predecir(model, val_loader, device)
            val_auc = float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5
            val_ic = spearmanr(pred_r, yr)[0]
            self.logger.info("Epoch completada", extra={
                "epoch": epoch + 1, "train_loss": round(train_loss, 5), "val_auc": round(val_auc, 4),
                "val_ic": round(float(val_ic), 4) if val_ic == val_ic else None,
                "lr": scheduler.get_last_lr()[0]})

            early(val_auc, model)
            if early.detener:
                self.logger.info("Early stopping", extra={"epoch": epoch + 1, "mejor_auc": early.mejor_score})
                break

        # Los umbrales se calibran con los MEJORES pesos, no con los de la última época
        model.load_state_dict(early.mejores_pesos)
        umbrales = self.calibrar_umbrales(model, val_loader, device)

        self.logger.info("Entrenamiento completado", extra={
            "epochs": epoch + 1, "mejor_auc_val": early.mejor_score, **umbrales})
        return {"pesos": early.mejores_pesos, "epochs": epoch + 1, "loss": train_loss,
                "mejor_auc_val": float(early.mejor_score), **umbrales}

    def entrenar_con_semillas(self, fabrica, train_loader, val_loader, device, n_semillas=None, epochs=None):
        """
        Entrena `n_semillas` modelos (fabrica() crea uno nuevo) y los promedia en un EnsambleModelos.
        Reduce la varianza de un modelo con señal débil. Devuelve (modelo_final, resultado) donde
        resultado['pesos'] es el state_dict del ensamble (o del modelo único si n_semillas == 1).
        """
        n_semillas = n_semillas or MLEngine.N_SEMILLAS
        miembros, resultados = [], []
        for i in range(n_semillas):
            fijar_semillas(MLEngine.SEED + i)
            modelo = fabrica().to(device)
            self.logger.info("Entrenando miembro del ensamble", extra={"semilla": MLEngine.SEED + i,
                                                                       "miembro": i + 1, "total": n_semillas})
            res = self.ejecutar_entrenamiento(modelo, train_loader, val_loader, device, epochs=epochs)
            modelo.load_state_dict(res["pesos"])
            miembros.append(modelo)
            resultados.append(res)

        modelo_final = miembros[0] if n_semillas == 1 else EnsambleModelos(miembros).to(device)
        modelo_final.eval()
        prob, _, yc, _ = self._predecir(modelo_final, val_loader, device)
        auc_val = float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5
        umbrales = self.calibrar_umbrales(modelo_final, val_loader, device)

        self.logger.info("Ensamble completado", extra={
            "n_semillas": n_semillas, "auc_val_ensamble": round(auc_val, 4),
            "auc_val_miembros": [round(float(r["mejor_auc_val"]), 4) for r in resultados], **umbrales})
        return modelo_final, {
            "pesos": {k: v.detach().cpu().clone() for k, v in modelo_final.state_dict().items()},
            "epochs": int(round(np.mean([r["epochs"] for r in resultados]))),
            "loss": float(np.mean([r["loss"] for r in resultados])),
            "mejor_auc_val": auc_val,
            **umbrales,
        }

    # ------------------------------------------------------------------ umbrales
    def calibrar_umbrales(self, model, val_loader, device, frac_alcista=0.3, frac_bajista=0.3):
        """
        umbral_optimo: J de Youden (para las métricas binarias).
        umbral_alcista / umbral_bajista: percentiles de la probabilidad en validación.
        Con 0.3/0.3 ~30% de las señales serán ALCISTA, ~30% BAJISTA y ~40% MANTENER.
        """
        prob, _, yc, _ = self._predecir(model, val_loader, device)
        fpr, tpr, thr = roc_curve(yc, prob)
        umbral = float(np.clip(thr[np.argmax(tpr - fpr)], 0.0, 1.0))
        return {
            "umbral_optimo": umbral,
            "umbral_alcista": float(np.quantile(prob, 1 - frac_alcista)),
            "umbral_bajista": float(np.quantile(prob, frac_bajista)),
        }

    # ------------------------------------------------------------------ evaluación
    def evaluar_modelo(self, model, loader, device, umbral_decision=0.5, meta=None):
        """Úsalo con el test_loader para el reporte final. `meta` (fecha, ticker) habilita IC y spread."""
        prob, pred_r, yc, yr = self._predecir(model, loader, device)
        prob = np.nan_to_num(prob, nan=0.5)
        pred_r = np.nan_to_num(pred_r, nan=0.0)
        y_pred = (prob > umbral_decision).astype(int)

        cm = confusion_matrix(yc, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        bce = float(nn.functional.binary_cross_entropy(
            torch.tensor(np.clip(prob, 1e-7, 1 - 1e-7)), torch.tensor(yc)).item())

        metricas = {
            'accuracy': float(accuracy_score(yc, y_pred)),
            'precision': float(precision_score(yc, y_pred, zero_division=0)),
            'recall': float(recall_score(yc, y_pred, zero_division=0)),
            'f1_score': float(f1_score(yc, y_pred, zero_division=0)),
            'auc': float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5,
            'mae': float(mean_absolute_error(yr, pred_r)),
            'val_loss': bce,
            'ic_global': float(np.nan_to_num(spearmanr(pred_r, yr)[0])),
            'tasa_base_positivos': float(yc.mean()),
            'tp': int(tp), 'tn': int(tn), 'fp': int(fp), 'fn': int(fn),
        }
        if meta is not None:
            metricas.update(metricas_cartera(meta, prob, pred_r, yr))
        return metricas