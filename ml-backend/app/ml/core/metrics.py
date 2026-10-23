"""Sistema robusto de métricas normalizadas"""

import numpy as np
from typing import Dict, List
from sklearn.preprocessing import MinMaxScaler
import json
from datetime import datetime
import pandas as pd
from scipy.stats import spearmanr
class MetricasNormalizadas:
    """Calcula y normaliza métricas en rango [0, 1]"""

    # Rangos esperados (para normalización)
    RANGOS_METRICAS = {
        'accuracy': (0.5, 1.0),      # Mínimo útil: 50%
        'precision': (0.0, 1.0),
        'recall': (0.0, 1.0),
        'f1_score': (0.0, 1.0),
        'auc': (0.5, 1.0),
        'mae': (0.0, 0.1),           # Máximo error aceptable: 10%
    }

    @staticmethod
    def normalizar_metrica(nombre: str, valor: float) -> float:
        """Normaliza métrica al rango [0, 1]"""
        if nombre not in MetricasNormalizadas.RANGOS_METRICAS:
            return valor  # Retorna sin cambios si no está en rangos

        min_val, max_val = MetricasNormalizadas.RANGOS_METRICAS[nombre]

        if max_val == min_val:
            return 0.5

        normalizado = (valor - min_val) / (max_val - min_val)
        return np.clip(normalizado, 0, 1)

    @staticmethod
    def calcular_score_global(metricas: Dict[str, float]) -> float:
        """Calcula puntuación global ponderada (0-100)"""
        pesos = {
            'accuracy': 0.05,
            'f1_score': 0.45,
            'auc': 0.25,
            'mae': 0.25,  # Invertido: menos MAE = mejor
        }

        score_total = 0
        for metrica, peso in pesos.items():
            if metrica in metricas:
                valor_norm = MetricasNormalizadas.normalizar_metrica(metrica, metricas[metrica])

                # Invertir MAE (menos es mejor)
                if metrica == 'mae':
                    valor_norm = 1 - valor_norm

                score_total += valor_norm * peso

        return score_total * 100

    @staticmethod
    def generar_reporte_comparativo(
        historial_modelos: Dict[str, Dict[str, float]]
    ) -> str:
        """Genera reporte comparativo entre modelos"""

        reporte = {
            "timestamp": datetime.now().isoformat(),
            "modelos": {}
        }

        for nombre_modelo, metricas in historial_modelos.items():
            metricas_norm = {
                k: MetricasNormalizadas.normalizar_metrica(k, v)
                for k, v in metricas.items()
            }

            score_global = MetricasNormalizadas.calcular_score_global(metricas)

            reporte["modelos"][nombre_modelo] = {
                "metricas_originales": metricas,
                "metricas_normalizadas": metricas_norm,
                "score_global": score_global
            }

        # Ordenar por score
        ranking = sorted(
            reporte["modelos"].items(),
            key=lambda x: x[1]["score_global"],
            reverse=True
        )

        reporte["ranking"] = [nombre for nombre, _ in ranking]

        return json.dumps(reporte, indent=2, ensure_ascii=False)
    
    def metricas_cartera(meta, prob, pred_reg, y_reg, min_activos: int = 10) -> Dict[str, float]:
        df = meta[['fecha']].copy()
        df['prob'], df['pred'], df['real'] = prob, pred_reg, y_reg
        ics, spreads = [], []
        for _, g in df.groupby('fecha'):
            if len(g) < min_activos:
                continue
            ic = spearmanr(g['pred'], g['real'])[0]
            if ic == ic:   # descarta NaN
                ics.append(ic)
            q = g['prob'].rank(pct=True)
            spreads.append(g.loc[q >= 0.8, 'real'].mean() - g.loc[q <= 0.2, 'real'].mean())
        ics = np.array(ics)
        return {
            'ic_medio': float(ics.mean()) if len(ics) else 0.0,
            'ic_ir': float(ics.mean() / ics.std()) if len(ics) > 1 and ics.std() > 0 else 0.0,
            'spread_q5_q1': float(np.nanmean(spreads)) if len(spreads) else 0.0,
        }