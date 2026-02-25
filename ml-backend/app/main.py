from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.models.models import Empresa
from app.schemas.schemas import EmpresaOut
from app.core.config import settings

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

@app.get(f"{settings.API_V1_STR}/empresas", response_model=list[EmpresaOut])
def Obtener_empresa(db:Session = Depends(get_db)):
    # Ejemplo rápido de cómo usarías yfinance después
    empresas = db.query(Empresa).all()
    return empresas