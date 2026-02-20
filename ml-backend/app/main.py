from fastapi import FastAPI
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME)

# Configuración de CORS para que tu React pueda hablar con este backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción pondrás la URL de tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

@app.get(f"{settings.API_V1_STR}/test-data")
def test_data():
    # Ejemplo rápido de cómo usarías yfinance después
    return {"message": "Aquí conectaremos con yfinance y tu modelo de ML"}