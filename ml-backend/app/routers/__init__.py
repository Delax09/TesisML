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
from app.routers.ia import router as ia_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.modelo_ia import router as modelo_ia_router
from app.routers.metricas import router as metricas_router


__all__ = ["sectors_router", 
            "empresas_router", 
            "rols_router", 
            "usuarios_router",
            "portafolios_router",
            "precio_historico_router",
            "resultado_router",
            "ia_router",
            "admin_router",
            "auth_router",
            "modelo_ia_router",
            "metricas_router"
]
