# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.auto.generar_predicciones import ejecutar_analisis_diario # Importamos la lógica que crearemos
import json
import os

router = APIRouter(prefix="/api/v1/ia", tags=["IA Engine"])

@router.post("/analizar-todo")
async def analizar_todas_las_empresas(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Inicia el proceso de IA para todas las empresas activas en segundo plano.
    """
    # Usamos BackgroundTasks para que FastAPI responda "OK" de inmediato 
    # mientras el servidor trabaja con TensorFlow por detrás.
    background_tasks.add_task(ejecutar_analisis_diario, db)
    
    return {
        "status": "success",
        "message": "Análisis masivo de IA iniciado. Los resultados se actualizarán en unos minutos."
    }
