"""
Paquete de routers para los endpoints de la aplicación.
"""

from app.routers.sectors import router as sectors_router
from app.routers.empresas import router as empresas_router
from app.routers.rols import router as rols_router

__all__ = ["sectors_router", "empresas_router", "rols_router"]
