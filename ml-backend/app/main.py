from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import (auth_router, 
                        sectors_router, 
                        empresas_router,
                        rols_router, 
                        usuarios_router, 
                        portafolios_router, 
                        precio_historico_router,
                        resultado_router,
                        ia_router,
                        admin_router)
from app.db.sessions import engine, Base
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIASGIMiddleware
from app.core.limiter import limiter

# Base.metadata.create_all(bind=engine) ya cree la base de datos
# Crear aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para predicción de precios de acciones usando ML",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)


# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción usar CORS_ORIGINS del .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth_router)
app.include_router(sectors_router)
app.include_router(empresas_router)
app.include_router(rols_router)
app.include_router(usuarios_router)
app.include_router(portafolios_router)
app.include_router(precio_historico_router)
app.include_router(resultado_router)
app.include_router(ia_router)
app.include_router(admin_router)


@app.get("/")
def health_check():
    """Endpoint de verificación de salud."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "API funcionando correctamente"
    }