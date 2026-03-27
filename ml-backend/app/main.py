from contextlib import asynccontextmanager
import tensorflow as tf
import joblib
import os
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
                        admin_router,
                        modelo_ia_router)
from app.db.sessions import engine, Base
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIASGIMiddleware
from app.core.limiter import limiter
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend


# --- NUEVA ESTRUCTURA DE ARRANQUE (LIFESPAN) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    FastAPICache.init(InMemoryBackend())
    
    print("🚀 Cargando modelos de IA en memoria...")
    base_path = os.path.join(os.path.dirname(__file__), "ml", "models")
    try:
        app.state.model_v1 = tf.keras.models.load_model(os.path.join(base_path, "modelo_acciones_v1.keras"))
        app.state.model_v2 = tf.keras.models.load_model(os.path.join(base_path, "modelo_acciones_v2.keras"))
        app.state.scaler = joblib.load(os.path.join(base_path, "scaler.pkl"))
        print("✅ Modelos y escaladores cargados exitosamente.")
    except Exception as e:
        print(f"⚠️ Advertencia: No se pudieron cargar los modelos IA al inicio. Detalle: {e}")
    
    yield # La aplicación cede el control para empezar a recibir usuarios
    
    print("🧹 Apagando servidor y liberando memoria RAM...")
    app.state.model_v1 = None
    app.state.scaler = None

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para predicción de precios de acciones usando ML",
    version="2.0.0",
    lifespan=lifespan
)

# Configuración de límites de peticiones (Seguridad)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
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
app.include_router(modelo_ia_router)


@app.get("/")
def health_check():
    """Endpoint de verificación de salud."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "API funcionando correctamente"
    }