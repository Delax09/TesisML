# app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.sessions import get_db
# Importamos tus scripts existentes
from app.auto.importar_tickers import importar_desde_csv 
from app.auto.actualizar_precios import actualizar_todos_los_precios

router = APIRouter(prefix="/api/v1/admin", tags=["Administración de Datos"])

@router.post("/importar-tickers")
def run_importar_tickers(db: Session = Depends(get_db)):
    """Ejecuta el script para cargar empresas desde Tickers.csv"""
    try:
        importar_desde_csv(db)
        return {"status": "success", "message": "Tickers importados correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actualizar-precios")
def run_actualizar_precios(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Ejecuta la actualización de precios (Yahoo Finance).
    Usamos BackgroundTasks porque esto puede tardar varios minutos.
    """
    try:
        # Esto permite que la API responda "Iniciado" mientras Python trabaja de fondo
        background_tasks.add_task(actualizar_todos_los_precios, db)
        return {"status": "processing", "message": "Actualización de precios iniciada en segundo plano"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))