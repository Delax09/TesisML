# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.auto.generar_predicciones import ejecutar_analisis_diario
from app.ml.entrenamiento import entrenar_y_guardar
from fastapi import Request
import json
import os

router = APIRouter(prefix="/api/v1/ia", tags=["IA Engine"])

@router.post("/analizar-todo")
async def analizar_todas_las_empresas(request: Request,
                                        background_tasks: BackgroundTasks, 
                                        db: Session = Depends(get_db)):
    model_v1 = request.app.state.model_v1
    scaler = request.app.state.scaler
    # Usamos BackgroundTasks para que FastAPI responda "OK" de inmediato 
    # mientras el servidor trabaja con TensorFlow por detrás.
    background_tasks.add_task(ejecutar_analisis_diario, db, model_v1, scaler)
    
    return {
        "status": "success",
        "message": "Análisis masivo de IA iniciado."
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
    
@router.post("/entrenar-modelo/{id_modelo}", status_code=status.HTTP_202_ACCEPTED)
def entrenar_modelo_individual(
    id_modelo: int,
    background_tasks: BackgroundTasks,
    # current_user: Usuario = Depends(obtener_usuario_actual) # Descomenta esto si tu ruta está protegida con JWT
):
    """Inicia el entrenamiento en segundo plano de un solo modelo específico."""
    background_tasks.add_task(entrenar_y_guardar, id_modelo_especifico=id_modelo)
    return {"message": f"Entrenamiento del modelo ID {id_modelo} iniciado en segundo plano."}