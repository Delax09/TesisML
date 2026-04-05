"""
Módulo de entrenamiento RL
Contiene el bucle DQN, la memoria de replay y la evaluación del agente.
"""
import copy
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from tqdm import tqdm
from typing import Any, Dict, List, Tuple

from app.ml.utils import Timer


class ReplayBuffer:
    """Memoria de experiencias para el entrenamiento por refuerzo."""
    def __init__(self, capacidad: int = 20000):
        self.memoria = deque(maxlen=capacidad)

    def guardar(self, estado: np.ndarray, accion: int, recompensa: float,
                siguiente_estado: np.ndarray, precio_real: float):
        self.memoria.append((estado, accion, recompensa, siguiente_estado, precio_real))

    def samplear(self, batch_size: int) -> List[Tuple[Any, ...]]:
        return random.sample(self.memoria, batch_size)


def calcular_recompensa(accion: int, variacion: float) -> float:
    """Aplica la función de recompensa del agente RL."""
    if accion == 2:
        return variacion * 100.0
    if accion == 0:
        return -variacion * 100.0
    return -abs(variacion) * 5.0


def entrenar_dqn_agente(agente: nn.Module,
                        target_net: nn.Module,
                        x_entrenamiento: np.ndarray,
                        y_reg_entrenamiento: np.ndarray,
                        device: torch.device,
                        episodios: int = 10,
                        batch_size: int = 128,
                        gamma: float = 0.95,
                        epsilon_inicial: float = 1.0,
                        epsilon_min: float = 0.05,
                        decay_epsilon: float = 0.995) -> Tuple[Any, float, float]:
    """Entrena el agente DQN y devuelve los mejores pesos y métricas de entrenamiento."""
    optimizer = optim.Adam(agente.parameters(), lr=0.001)
    criterio_q = nn.MSELoss()
    criterio_precio = nn.HuberLoss(delta=1.0)

    memoria = ReplayBuffer()
    epsilon = epsilon_inicial

    mejor_recompensa = -float('inf')
    mejores_pesos = None
    avg_loss = 0.0

    for episodio in range(episodios):
        agente.train()
        recompensa_total = 0.0
        loss_acumulado = 0.0
        pasos_entrenados = 0

        loop_tiempo = tqdm(range(len(x_entrenamiento) - 1),
                            desc=f"Episodio [{episodio+1}/{episodios}]",
                            leave=False)

        for t in loop_tiempo:
            estado = x_entrenamiento[t]
            estado_tensor = torch.tensor([estado], dtype=torch.float32).to(device)
            precio_hoy = y_reg_entrenamiento[t]

            if random.random() <= epsilon:
                accion = random.randint(0, 2)
            else:
                with torch.no_grad():
                    _, q_values = agente(estado_tensor)
                    accion = torch.argmax(q_values).item()

            variacion = precio_hoy - estado[-1][0]
            recompensa = calcular_recompensa(accion, variacion)
            siguiente_estado = x_entrenamiento[t + 1]

            memoria.guardar(estado, accion, recompensa, siguiente_estado, float(precio_hoy))
            recompensa_total += recompensa

            if len(memoria.memoria) >= batch_size:
                batch = memoria.samplear(batch_size)

                b_estados = torch.tensor(np.array([b[0] for b in batch]), dtype=torch.float32).to(device)
                b_acciones = torch.tensor([b[1] for b in batch], dtype=torch.int64).to(device).unsqueeze(1)
                b_recompensas = torch.tensor([b[2] for b in batch], dtype=torch.float32).to(device)
                b_sig_estados = torch.tensor(np.array([b[3] for b in batch]), dtype=torch.float32).to(device)
                b_precios = torch.tensor([b[4] for b in batch], dtype=torch.float32).to(device).unsqueeze(1)

                pred_precios, q_actuales = agente(b_estados)
                q_acciones_tomadas = q_actuales.gather(1, b_acciones).squeeze(1)

                with torch.no_grad():
                    _, q_siguientes = target_net(b_sig_estados)
                    q_max_siguientes = q_siguientes.max(1)[0]
                    q_targets = b_recompensas + (gamma * q_max_siguientes)

                loss_q = criterio_q(q_acciones_tomadas, q_targets)
                loss_precio = criterio_precio(pred_precios, b_precios)
                loss_total = loss_q + loss_precio

                optimizer.zero_grad()
                loss_total.backward()
                optimizer.step()

                loss_acumulado += loss_total.item()
                pasos_entrenados += 1

        if epsilon > epsilon_min:
            epsilon *= decay_epsilon
        target_net.load_state_dict(agente.state_dict())

        avg_loss = loss_acumulado / max(1, pasos_entrenados)
        print(f"Episodio [{episodio+1}/{episodios}] - Recompensa neta: {recompensa_total:.2f} - Loss: {avg_loss:.4f} - Epsilon: {epsilon:.2f}")

        if recompensa_total > mejor_recompensa:
            mejor_recompensa = recompensa_total
            mejores_pesos = copy.deepcopy(agente.state_dict())

    return mejores_pesos, avg_loss, mejor_recompensa


def evaluar_agente_dqn(agente: nn.Module,
                       x_validacion: torch.Tensor,
                       y_clf_validacion: np.ndarray,
                       device: torch.device) -> Dict[str, float]:
    """Evalúa el agente en el conjunto de validación y retorna métricas comparables."""
    y_val_pred_list: List[np.ndarray] = []
    with torch.no_grad():
        for i in range(0, len(x_validacion), 128):
            batch_val = x_validacion[i:i+128]
            _, q_vals = agente(batch_val)
            y_val_pred_list.append(q_vals.cpu().numpy())

    q_totales = np.vstack(y_val_pred_list)
    acciones_elegidas = np.argmax(q_totales, axis=1)

    indices_operados = np.where(acciones_elegidas != 1)[0]
    y_real_operado = y_clf_validacion[indices_operados]
    y_pred_operado = (acciones_elegidas[indices_operados] == 2).astype(int)

    if len(y_real_operado) > 0:
        acc = accuracy_score(y_real_operado, y_pred_operado)
        prec = precision_score(y_real_operado, y_pred_operado, zero_division=0)
        rec = recall_score(y_real_operado, y_pred_operado, zero_division=0)
        f1 = f1_score(y_real_operado, y_pred_operado, zero_division=0)
    else:
        acc = prec = rec = f1 = 0.0

    return {
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1)
    }
