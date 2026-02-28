"""
Aplicación principal de FastAPI.
Punto de entrada de la aplicación con configuración centralizada.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import (sectors_router, empresas_router,rols_router)

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para predicción de precios de acciones usando ML",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción usar CORS_ORIGINS del .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(sectors_router)
app.include_router(empresas_router)
app.include_router(rols_router)

@app.get("/")
def health_check():
    """Endpoint de verificación de salud."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "API funcionando correctamente"
    }