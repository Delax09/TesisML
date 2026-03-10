"""
Paquete de routers para los endpoints de la aplicación.
"""

from app.routers.sectors import router as sectors_router
from app.routers.empresas import router as empresas_router
from app.routers.rols import router as rols_router
from app.routers.usuarios import router as usuarios_router
from app.routers.portafolios import router as portafolios_router
from app.routers.precio_historicos import router as precio_historico_router
from app.routers.resultados import router as resultado_router


__all__ = ["sectors_router", 
            "empresas_router", 
            "rols_router", 
            "usuarios_router",
            "portafolios_router",
            "precio_historico_router",
            "resultado_router"
]
