"""
Script para ejecutar la aplicación FastAPI.
Ejecutar desde el directorio ml-backend: python -m uvicorn app.main:app --reload
"""

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
