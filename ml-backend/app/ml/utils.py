"""
Modulo de Utilidades para Entrenamiento ML
Contiene funciones de monitoreo, logging y utilidades generales
"""
import psutil
import torch
import time
from typing import Dict, Any


def monitorear_recursos() -> Dict[str, Any]:
    """Monitorea el uso de recursos del sistema"""
    try:
        memoria = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)

        info = {
            'cpu_percent': cpu_percent,
            'memoria_usada_gb': memoria.used / (1024**3),
            'memoria_total_gb': memoria.total / (1024**3),
            'memoria_percent': memoria.percent
        }

        if torch.cuda.is_available():
            info['gpu_mem_allocated'] = torch.cuda.memory_allocated() / (1024**3)
            info['gpu_mem_reserved'] = torch.cuda.memory_reserved() / (1024**3)

        return info
    except Exception as e:
        return {'error': f'No se pudo monitorear recursos: {str(e)}'}


def imprimir_estadisticas_entrenamiento(info_recursos: Dict[str, Any], epoch: int,
                                      loss: float, val_loss: float, tiempo_epoch: float = None):
    """Imprime estadisticas detalladas del entrenamiento"""
    print(f"Epoch {epoch}: Loss={loss:.4f}, Val={val_loss:.4f}")
    print(f"CPU: {info_recursos.get('cpu_percent', '?'):.1f}% | "
          f"RAM: {info_recursos.get('memoria_usada_gb', '?'):.1f}/{info_recursos.get('memoria_total_gb', '?'):.1f}GB")

    if 'gpu_mem_allocated' in info_recursos:
        print(f"GPU: {info_recursos['gpu_mem_allocated']:.2f}GB allocated, "
              f"{info_recursos['gpu_mem_reserved']:.2f}GB reserved")

    if tiempo_epoch:
        print(f"Tiempo epoch: {tiempo_epoch:.2f}s")
    print("-" * 50)


def mostrar_resumen_entrenamiento(historial: Dict[str, list], tiempo_total: float,
                                recursos_iniciales: Dict[str, Any], recursos_finales: Dict[str, Any]):
    """Muestra un resumen completo del entrenamiento"""
    print("\n" + "="*60)
    print("RESUMEN DEL ENTRENAMIENTO")
    print("="*60)

    print(f"Tiempo total: {tiempo_total:.2f}s")
    print(f"Epochs completados: {len(historial['loss'])}")

    if historial['loss']:
        mejor_loss = min(historial['val_loss'])
        mejor_epoch = historial['val_loss'].index(mejor_loss) + 1
        print(f"Mejor validacion loss: {mejor_loss:.4f} (epoch {mejor_epoch})")

        print(f"Loss final - Train: {historial['loss'][-1]:.4f}, Val: {historial['val_loss'][-1]:.4f}")
        print(f"MAE final - Train: {historial['mae'][-1]:.4f}, Val: {historial['val_mae'][-1]:.4f}")

    print("\nRECURSOS UTILIZADOS:")
    print(f"CPU inicial: {recursos_iniciales.get('cpu_percent', '?'):.1f}%")
    print(f"RAM inicial: {recursos_iniciales.get('memoria_usada_gb', '?'):.1f}GB")
    print(f"CPU final: {recursos_finales.get('cpu_percent', '?'):.1f}%")
    print(f"RAM final: {recursos_finales.get('memoria_usada_gb', '?'):.1f}GB")

    if 'gpu_mem_allocated' in recursos_finales:
        print(f"GPU memoria: {recursos_finales['gpu_mem_allocated']:.2f}GB allocated")

    print("="*60)


class Timer:
    """Clase utilitaria para medir tiempos de ejecucion"""
    def __init__(self, description: str = ""):
        self.description = description
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        if self.description:
            print(f"Iniciando: {self.description}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if self.description:
            print(f"{self.description} completado en {elapsed:.2f}s")
        return False