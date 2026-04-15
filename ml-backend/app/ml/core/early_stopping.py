"""
Módulo de Parada Temprana (Early Stopping)
Previene el sobreajuste (overfitting) guardando la mejor versión del modelo.
"""
import copy
import numpy as np

class EarlyStopping:
    def __init__(self, paciencia=8, delta=0.002):
        """
        Args:
            paciencia (int): Épocas a esperar sin mejora antes de detenerse.
            delta (float): Reducción mínima del error para considerarse mejora.
        """
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.mejor_loss = np.inf
        self.detener = False
        self.mejores_pesos = None

    def __call__(self, val_loss, modelo):
        # 1. Protección contra colapso matemático
        if np.isnan(val_loss) or np.isinf(val_loss):
            print("EarlyStopping val_loss es NaN/Inf. Deteniendo para salvar los últimos pesos estables.")
            self.detener = True
            return

        # 2. Si hay una mejora real
        if val_loss < self.mejor_loss - self.delta:
            self.mejor_loss = val_loss
            # Guardar en RAM la copia exacta de los pesos óptimos
            self.mejores_pesos = copy.deepcopy(modelo.state_dict())
            self.contador = 0
            
        # 3. Si no hay mejora (ruido o sobreajuste)
        else:
            self.contador += 1
            print(f'EarlyStopping Paciencia: {self.contador}/{self.paciencia} (Mejor histórica: {self.mejor_loss:.4f})')
            if self.contador >= self.paciencia:
                print(f"EarlyStopping Entrenamiento detenido. No hubo mejora en {self.paciencia} épocas seguidas.")
                self.detener = True