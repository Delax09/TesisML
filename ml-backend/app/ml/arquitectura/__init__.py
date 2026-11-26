"""
Arquitecturas de redes neuronales para predicción.
`crear_modelo` es el único punto de construcción: lo usan el entrenamiento y la inferencia,
así ambos arman exactamente la misma red.
"""

import torch
import torch.nn as nn

from app.ml.arquitectura.v1_lstm import ModeloLSTM_v1, obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import ModeloBidireccional_v2, obtener_modelo_v2
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3, obtener_modelo_v3
from app.ml.arquitectura.v4_lstm_cnn import ModeloLSTMCNN_v4, obtener_modelo_v4


class EnsambleModelos(nn.Module):
    """Promedia las salidas (regresión y logits) de varios modelos entrenados con semillas distintas."""

    def __init__(self, miembros):
        super().__init__()
        self.miembros = nn.ModuleList(miembros)

    def forward(self, x):
        salidas = [m(x) for m in self.miembros]
        p_reg = torch.stack([s[0] for s in salidas]).mean(dim=0)
        logits = torch.stack([s[1] for s in salidas]).mean(dim=0)
        return p_reg, logits


def _crear_individual(version: str, num_features: int, dias_pasados: int, hidden_size: int, num_capas: int):
    if version == "v1":
        return obtener_modelo_v1(dias_pasados, num_features, hidden_size=hidden_size, num_layers=num_capas)
    if version == "v2":
        return obtener_modelo_v2(dias_pasados, num_features, hidden_size=hidden_size, num_layers=num_capas)
    if version == "v3":
        return obtener_modelo_v3(dias_pasados, num_features)
    if version == "v4":
        return obtener_modelo_v4(dias_pasados, num_features, hidden_size=hidden_size, num_layers=num_capas)
    raise ValueError(f"Versión de modelo desconocida: {version}")


def crear_modelo(version: str, num_features: int, dias_pasados: int,
                 hidden_size: int = 32, num_capas: int = 1, n_semillas: int = 1) -> nn.Module:
    """Con n_semillas > 1 devuelve un EnsambleModelos (estructura necesaria para cargar sus pesos)."""
    if n_semillas <= 1:
        return _crear_individual(version, num_features, dias_pasados, hidden_size, num_capas)
    return EnsambleModelos([_crear_individual(version, num_features, dias_pasados, hidden_size, num_capas)
                            for _ in range(n_semillas)])


__all__ = [
    "ModeloLSTM_v1", "obtener_modelo_v1",
    "ModeloBidireccional_v2", "obtener_modelo_v2",
    "ModeloCNN_v3", "obtener_modelo_v3",
    "ModeloLSTMCNN_v4", "obtener_modelo_v4",
    "EnsambleModelos", "crear_modelo",
]
