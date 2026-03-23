# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.auto.generar_predicciones import ejecutar_analisis_diario
from app.ml.entrenamiento import entrenar_y_guardar
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
@router.get("/metricas")
def obtener_metricas_modelo():
    ruta_metricas = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "metricas.json")

    try:
        with open(ruta_metricas, "r") as f:
            metricas = json.load(f)
            return metricas
    except FileNotFoundError:
        return {"Error": "Metricas no encontradas"}
    
@router.post("/entrenar-modelo-lstm")
async def entrenar_modelo_lstm(background_task: BackgroundTasks):
    background_task.add_task(entrenar_y_guardar)

    return {
        "status": "Success",
        "message": "Entreamiento de LSTM iniciado"
    }