"""
Módulo de Parada Temprana (Early Stopping)
Previene el sobreajuste (overfitting) guardando la mejor versión del modelo.
"""
import numpy as np
import torch

class EarlyStopping:
    def __init__(self, paciencia=8, delta=0.002, modelo_inicial=None):
        """
        Args:
            paciencia (int): Épocas a esperar sin mejora antes de detenerse.
            delta (float): Reducción mínima del error para considerarse mejora.
            modelo_inicial (nn.Module, opcional): Permite guardar el estado base en la época 0.
        """
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.mejor_loss = np.inf
        self.detener = False
        
        # Guardar el estado inicial (si se provee) por si el modelo explota de inmediato
        self.mejores_pesos = None
        if modelo_inicial is not None:
            self._guardar_pesos(modelo_inicial)

    def __call__(self, val_loss, modelo):
        # 1. Protección contra colapso matemático (Exploding Gradients)
        if np.isnan(val_loss) or np.isinf(val_loss):
            print("\n⚠️ EarlyStopping: val_loss es NaN/Inf. Deteniendo para salvar pesos estables.")
            self.detener = True
            return

        # 2. Si hay una mejora real
        if val_loss < self.mejor_loss - self.delta:
            self.mejor_loss = val_loss
            self._guardar_pesos(modelo)
            self.contador = 0
            
        # 3. Si no hay mejora (ruido o sobreajuste)
        else:
            self.contador += 1
            print(f'   ⏳ EarlyStopping Paciencia: {self.contador}/{self.paciencia} (Mejor: {self.mejor_loss:.4f})')
            if self.contador >= self.paciencia:
                print("\n🛑 EarlyStopping: Límite de paciencia alcanzado. Deteniendo el entrenamiento.")
                self.detener = True

    def _guardar_pesos(self, modelo):
        """
        🔥 FIX OPTIMIZACIÓN: Guarda los pesos clonados y enviados a la CPU.
        Evita que se fragmente o se desborde la memoria VRAM de la tarjeta gráfica (Memory Leak).
        """
        self.mejores_pesos = {k: v.cpu().clone() for k, v in modelo.state_dict().items()}

    def restaurar_mejores_pesos(self, modelo):
        """
        Método de conveniencia para restaurar el modelo sin ensuciar el trainer.py
        """
        if self.mejores_pesos is not None:
            modelo.load_state_dict(self.mejores_pesos)
            print("✅ Mejores pesos restaurados exitosamente desde EarlyStopping.")
        else:
            print("⚠️ EarlyStopping no tenía pesos guardados. Manteniendo el estado actual.")
        return modelo