"""
Módulo de modelos SQLAlchemy.
Define todas las tablas de la base de datos.
"""

from app.models.sector import Sector
from app.models.empresa import Empresa
from app.models.resultado import Resultado
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.models.portafolio import Portafolio
from app.models.precio_historico import PrecioHistorico

__all__ = [
    "Sector", "Empresa", "Resultado", "Rol", 
    "Usuario", "Portafolio", "PrecioHistorico"
]
