"""
Módulo ML: Motor de inteligencia artificial para predicción de precios de acciones.
"""

try:
    from app.ml.core.engine import MLEngine
    __all__ = ["MLEngine"]
except ImportError:
    # Si torch o las dependencias fallan, evitamos que el __init__ rompa la app
    __all__ = []