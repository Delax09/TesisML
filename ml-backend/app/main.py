from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Importaciones de Caché (Redis e In-Memory)
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from redis import asyncio as aioredis

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
                        modelo_ia_router,
                        noticias,
                        metricas_router,
                        contacto_router)
from app.db.sessions import engine, Base
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIASGIMiddleware
from app.core.limiter import limiter

try:
    import torch
    import tensorflow as tf
    import joblib
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False


# --- NUEVA ESTRUCTURA DE ARRANQUE (LIFESPAN CON REDIS) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    
    # 1. INICIALIZAR CACHÉ (INTENTO CON REDIS, FALLBACK A RAM)
    print("🔄 Intentando conectar a Caché...")
    try:
        # Usa la URL de Redis (localhost para dev, o la de Upstash en producción)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        
        # Hacemos un ping rápido para verificar que el servidor Redis responda
        await redis.ping() 
        FastAPICache.init(RedisBackend(redis), prefix="tesisml-cache")
        print("⚡ ¡Caché REDIS conectado exitosamente y listo para acelerar consultas!")
        
    except Exception as e:
        print(f"⚠️ No se pudo conectar a Redis ({e}). Cambiando a Caché de RAM Interna (Fallback).")
        # Si Redis falla, no dejamos que la app muera, usamos la memoria del servidor
        FastAPICache.init(InMemoryBackend(), prefix="tesisml-ram")
    
    
    # 2. CARGAR MODELOS DE IA
    if IA_AVAILABLE:
        print("🚀 Cargando modelos de IA en memoria (Modo Local)...")
        base_path = os.path.join(os.path.dirname(__file__), "ml", "models")
        try:
            app.state.model_v1 = torch.load(os.path.join(base_path, "modelo_acciones_v1.pth"))
            app.state.model_v2 = torch.load(os.path.join(base_path, "modelo_acciones_v2.pth"))
            app.state.model_v3 = torch.load(os.path.join(base_path, "modelo_acciones_v3.pth"))
            app.state.scaler = joblib.load(os.path.join(base_path, "scaler.pkl"))
            app.state.scaler_cnn = joblib.load(os.path.join(base_path, "scaler_cnn.pkl"))
            print("✅ Modelos y escaladores cargados exitosamente.")
        except Exception as e:
            print(f"⚠️ Error cargando modelos locales: {e}")
    else:
        print("⚠️ Modo Producción: IA desactivada. Operando solo como API de Base de Datos.")
        app.state.model_v1 = None
        app.state.model_v2 = None
        app.state.model_v3 = None # Añadido el v3 por seguridad
        app.state.scaler = None
        
    yield 
    
    # 3. LIMPIEZA AL APAGAR
    print("🧹 Apagando servidor y liberando memoria RAM...")
    app.state.model_v1 = None
    app.state.model_v2 = None
    app.state.model_v3 = None
    app.state.scaler = None

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para predicción de precios de acciones usando ML",
    version="2.0.0",
    lifespan=lifespan
)

# --- NUEVO MIDDLEWARE: CABECERAS DE SEGURIDAD (ASGI PURO) ---
class SecurityHeadersMiddleware:
    """
    Middleware ASGI puro para inyectar cabeceras de seguridad HTTP
    sin interferir con SlowAPI ni CORSMiddleware.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                # En ASGI, las cabeceras deben ser tuplas de bytes en minúsculas
                headers.append((b"strict-transport-security", b"max-age=31536000; includeSubDomains"))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"content-security-policy", b"default-src 'self'"))
            await send(message)

        await self.app(scope, receive, send_wrapper)

# Agregar el Middleware de Seguridad
app.add_middleware(SecurityHeadersMiddleware)

# Configuración de límites de peticiones (Seguridad)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)

# Configuración de límites de peticiones (Seguridad)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)

# Configuración de CORS dinámica y segura
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS, # ← Ahora usa la variable del .env
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # ← Métodos restringidos
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
app.include_router(metricas_router)
app.include_router(noticias.router)
app.include_router(contacto_router)

@app.get("/")
def health_check():
    """Endpoint de verificación de salud."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "API funcionando correctamente"
    }