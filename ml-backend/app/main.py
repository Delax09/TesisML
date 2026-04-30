from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    
    
    # CARGAN LOS MODELOS IA QUE ESTAN ENTRENADOS CON LOS DATOS DE LA BASE DE DATOS
    # Los modelos que se ejecutan local no se cargan para evitar problemas de entrenamiento 
    if IA_AVAILABLE:
        print("🚀 Cargando modelos de IA en memoria (Modo Local)...")
        base_path = os.path.join(os.path.dirname(__file__), "ml", "models")
        try:
            app.state.model_v1 = torch.load(os.path.join(base_path, "modelo_acciones_v1.pth"))
            app.state.model_v2 = torch.load(os.path.join(base_path, "modelo_acciones_v2.pth"))
            app.state.model_v3 = torch.load(os.path.join(base_path, "modelo_acciones_v3.pth"))
            app.state.scaler = joblib.load(os.path.join(base_path, "scaler.pkl"))
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


# --- MIDDLEWARE DE PROTECCIÓN ANTI-CSRF (ASGI PURO) ---
class CSRFProtectionMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Si no es una petición HTTP (ej. WebSockets), dejamos pasar
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Instanciamos Request SOLO con el scope para leer headers/cookies 
        # sin interferir con el cuerpo (body) de la petición original
        request = Request(scope)

        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if request.url.path != "/api/v1/auth/login":
                csrf_cookie = request.cookies.get("csrf_token")
                csrf_header = request.headers.get("x-csrf-token")

                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    response = JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token inválido o ausente. Petición rechazada por seguridad."}
                    )
                    # Retornamos la respuesta de error directamente
                    return await response(scope, receive, send)

        # Si todo está bien, continuamos con la aplicación
        return await self.app(scope, receive, send)


# --- MIDDLEWARE: CABECERAS DE SEGURIDAD (ASGI PURO) ---
class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"strict-transport-security", b"max-age=31536000; includeSubDomains"))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"content-security-policy", b"default-src 'self'"))
            await send(message)

        await self.app(scope, receive, send_wrapper)



# Configuración de límites de peticiones (Seguridad)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)

if settings.ENVIRONMENT != "development":
    print("🔒 Modo Producción: Activando middlewares de seguridad (CSRF, CSP, HSTS)...")
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CSRFProtectionMiddleware)
else:
    print("🔓 Modo Desarrollo: Middlewares de seguridad estrictos desactivados (Swagger UI habilitado).")

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