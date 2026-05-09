import numpy as np
import torch

class EarlyStopping:
    def __init__(self, paciencia=12, delta=0.01, modelo_inicial=None, modo='max'):
        """
        Args:
            paciencia (int): Épocas a esperar sin mejora antes de detenerse.
            delta (float): Mejora mínima requerida en la métrica.
            modelo_inicial (nn.Module): Estado base en la época 0.
            modo (str): 'max' para maximizar (ej. F1, Score), 'min' para minimizar (ej. Loss).
        """
        self.paciencia = paciencia
        self.delta = delta
        self.contador = 0
        self.modo = modo
        
        # Inicialización dinámica según el modo
        self.mejor_score = -np.inf if modo == 'max' else np.inf
        self.detener = False
        
        self.mejores_pesos = None
        if modelo_inicial is not None:
            self._guardar_pesos(modelo_inicial)

    def __call__(self, metricas_val, modelo):
        """
        Evalúa si el modelo debe detenerse. Soporta diccionarios (Score F1+Recall) 
        o valores numéricos directos (val_loss).
        """
        # 1. Extraer o calcular la métrica actual
        if isinstance(metricas_val, dict):
            # Si pasas el diccionario completo desde evaluar_modelo()
            f1_actual = metricas_val.get('f1_score', 0.0)
            recall_actual = metricas_val.get('recall', 0.0)
            
            if np.isnan(f1_actual) or np.isnan(recall_actual):
                print("\n⚠️ EarlyStopping: Métricas colapsadas (NaN). Deteniendo.")
                self.detener = True
                return
                
            metrica_actual = (f1_actual * 0.6) + (recall_actual * 0.4)
            log_str = f"Score (F1: {f1_actual:.4f}, Rec: {recall_actual:.4f})"
        else:
            # Si pasas un valor numérico único (ej. val_loss)
            metrica_actual = metricas_val
            if np.isnan(metrica_actual) or np.isinf(metrica_actual):
                print("\n⚠️ EarlyStopping: Métrica es NaN/Inf. Deteniendo.")
                self.detener = True
                return
            log_str = "Métrica"

        # 2. Evaluar la mejora según el modo configurado
        if self.modo == 'max':
            mejora = metrica_actual > (self.mejor_score + self.delta)
        else:
            mejora = metrica_actual < (self.mejor_score - self.delta)

        # 3. Actualizar los estados y guardar los pesos clonados
        if mejora:
            self.mejor_score = metrica_actual
            self._guardar_pesos(modelo)
            self.contador = 0
            print(f'   📈 EarlyStopping: ¡Mejora detectada! Nuevo {log_str}: {self.mejor_score:.4f}')
        else:
            self.contador += 1
            print(f'   ⏳ EarlyStopping Paciencia: {self.contador}/{self.paciencia} (Mejor: {self.mejor_score:.4f})')
            
            if self.contador >= self.paciencia:
                print("\n🛑 EarlyStopping: Límite de paciencia alcanzado. Deteniendo el entrenamiento.")
                self.detener = True

    def _guardar_pesos(self, modelo):
        """Clona los pesos a la CPU para evitar desbordar la VRAM"""
        self.mejores_pesos = {k: v.cpu().clone() for k, v in modelo.state_dict().items()}

    def restaurar_mejores_pesos(self, modelo):
        if self.mejores_pesos is not None:
            modelo.load_state_dict(self.mejores_pesos)
            print("✅ Mejores pesos restaurados exitosamente.")
        return modelo