import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
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

class PipelineTrainer:
    def __init__(self, architecture_name: str, log_file: str):
        self.architecture_name = architecture_name
        self.logger = configurar_logger(f"ML.Trainer.{architecture_name}", archivo_log=log_file)

    def ejecutar_entrenamiento(self, model, train_loader, val_loader, device, epochs=50, pos_weight_factor=2.0):
        #Calcular pos_weight dinámicamente basado en datos de entrenamiento
        pos_weight = self._calcular_pos_weight_dinamico(train_loader, device, pos_weight_factor)
        criterion_reg = nn.HuberLoss(delta=0.01)
        criterion_clf = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

        #Optimizador con parámetros mejorados
        optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4, betas=(0.9, 0.999))

        #Scheduler de LR para mejor convergencia
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

        #Early stopping más paciente y con mejor criterio
        early_stopping = EarlyStopping(paciencia=12, delta=0.001, modelo_inicial = model.state_dict())

        self.logger.info("Iniciando entrenamiento mejorado",
                        extra={"architecture": self.architecture_name, "device": device.type.upper(),
                                "batches": len(train_loader), "epochs": epochs, "pos_weight": pos_weight.item()})

        if torch.cuda.is_available():
            self.logger.info("GPU disponible",
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

                p_reg, l_clf = model(x_b)
                loss = criterion_reg(p_reg, yr_b) + criterion_clf(l_clf, yc_b)

                loss.backward()

                # 🆕 MEJORA: Gradient clipping más agresivo
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.5)

                optimizer.step()
                train_loss += loss.item()
                loop.set_postfix(loss=loss.item())

            # Actualizar LR
            scheduler.step()

            # Validación al final de cada epoch
            val_metrics = self.evaluar_modelo(model, val_loader, device)
            val_score = MetricasNormalizadas.calcular_score_global(val_metrics)

            self.logger.info("Epoch completada",
                            extra={"epoch": epoch+1, "train_loss": train_loss/total_batches,
                            "val_accuracy": val_metrics['accuracy'], "val_auc": val_metrics['auc'],
                            "val_f1": val_metrics['f1_score'], "val_score_global": val_score,
                            "lr": scheduler.get_last_lr()[0]})

            # Early stopping con mejor criterio
            early_stopping(-val_score, model)

            if early_stopping.detener:
                self.logger.info("Early stopping activado", extra={"epoch": epoch+1, "mejor_score": early_stopping.mejor_loss})
                break

            mejor_modelo = early_stopping.mejores_pesos

        # Retornar mejores pesos encontrados
        if mejor_modelo is None:
            mejor_modelo = model.state_dict()

        self.logger.info("Entrenamiento completado", extra={"epochs_completadas": epoch+1, "architecture": self.architecture_name})
        return mejor_modelo

    def _calcular_pos_weight_dinamico(self, train_loader, device, factor=2.0):
        """Calcula el peso positivo dinámicamente basado en la distribución de clases"""
        total_positivos = 0
        total_muestras = 0

        for _, _, yc_b in train_loader:
            yc_b = yc_b.to(device)
            total_positivos += yc_b.sum().item()
            total_muestras += yc_b.numel()

        if total_muestras == 0:
            return torch.tensor([factor]).to(device)

        ratio_positivo = total_positivos / total_muestras
        ratio_negativo = 1 - ratio_positivo

        if ratio_positivo == 0:
            pos_weight = torch.tensor([factor]).to(device)
        else:
            pos_weight = torch.tensor([ratio_negativo / ratio_positivo * factor]).to(device)

        return pos_weight

    def evaluar_modelo(self, model, val_loader, device, umbral_decision=0.5):
        """🆕 MEJORA: Umbral de decisión optimizable"""
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

        # Sanitizar las salidas
        y_prob_clf = np.nan_to_num(np.array(y_prob_clf), nan=0.0)
        y_pred_reg = np.nan_to_num(np.array(y_pred_reg), nan=0.0)

        # 🆕 MEJORA: Usar umbral configurable
        y_pred_clf = (y_prob_clf > umbral_decision).astype(int)

        cm = confusion_matrix(y_real_clf, y_pred_clf)
        tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0,0,0,0)

        return {
            'accuracy': float(accuracy_score(y_real_clf, y_pred_clf)),
            'precision': float(precision_score(y_real_clf, y_pred_clf, zero_division=0)),
            'recall': float(recall_score(y_real_clf, y_pred_clf, zero_division=0)),
            'f1_score': float(f1_score(y_real_clf, y_pred_clf, zero_division=0)),
            'auc': float(roc_auc_score(y_real_clf, y_prob_clf)) if len(np.unique(y_real_clf)) > 1 else 0.5,
            'mae': float(mean_absolute_error(y_real_reg, y_pred_reg)),
            'val_loss': 0.0,
            'tp': int(tp),
            'tn': int(tn),
            'fp': int(fp),
            'fn': int(fn)
        }

    def optimizar_umbral_decision(self, model, val_loader, device):
        """🆕 MEJORA: Encuentra el mejor umbral para minimizar FP + FN"""
        model.eval()
        y_real_clf, y_prob_clf = [], []

        with torch.no_grad():
            for xv, _, ycv in val_loader:
                xv = xv.to(device)
                _, logits = model(xv)
                y_prob_clf.extend(torch.sigmoid(logits).cpu().numpy().flatten())
                y_real_clf.extend(ycv.numpy().flatten())

        y_real_clf = np.array(y_real_clf)
        y_prob_clf = np.array(y_prob_clf)

        mejores_umbral = 0.5
        mejor_score = float('inf')

        for umbral in np.arange(0.1, 0.9, 0.05):
            y_pred_clf = (y_prob_clf > umbral).astype(int)
            cm = confusion_matrix(y_real_clf, y_pred_clf)
            if cm.shape == (2, 2):
                tn, fp, fn, tp = cm.ravel()
                score = fp + fn  # Minimizar falsos positivos + falsos negativos
                if score < mejor_score:
                    mejor_score = score
                    mejores_umbral = umbral

        self.logger.info("Umbral optimizado", extra={"umbral": mejores_umbral, "score_min": mejor_score})
        return mejores_umbral

    def ejecutar_validacion_cruzada(self, model_class, data_processor, device, k=5, epochs=50):
        """
        Ejecuta validación cruzada k-fold para el modelo con mejoras.

        Args:
            model_class: Clase del modelo
            data_processor: Instancia del data processor
            device: Dispositivo para entrenamiento
            k: Número de folds para validación cruzada
            epochs: Número de epochs por fold

        Returns:
            dict: Resultados de validación cruzada con métricas promedio
        """
        self.logger.info("Iniciando validación cruzada mejorada", extra={"architecture": self.architecture_name, "k_folds": k, "epochs_por_fold": epochs})

        def train_fold_function(train_data, val_data):
            # Crear modelo para este fold
            model = model_class()
            model.to(device)

            # Preparar dataloaders
            train_loader = data_processor.crear_dataloaders_generico(train_data, batch_size=32, shuffle=True)
            val_loader = data_processor.crear_dataloaders_generico(val_data, batch_size=32, shuffle=False)

            # Entrenar modelo con mejoras
            mejores_pesos = self.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

            # Cargar mejores pesos y evaluar
            model.load_state_dict(mejores_pesos)
            metrics = self.evaluar_modelo(model, val_loader, device)

            return MetricasNormalizadas.calcular_score_global(metrics), metrics

        # Ejecutar validación cruzada
        resultados = validacion_cruzada_k_fold(
            data_processor.df_procesado,
            train_fold_function,
            k=k
        )

        self.logger.info("Validación cruzada completada",
                        extra={"architecture": self.architecture_name, "score_promedio": resultados['score_promedio'],
                        "desviacion_estandar": resultados['desviacion_estandar']})

        return resultados