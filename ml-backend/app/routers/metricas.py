from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from app.db.sessions import get_db
from app.services.metrica_service import MetricaService
from app.schemas import schemas

router = APIRouter(prefix="/api/v1/metricas", tags=["Metricas IA"])

@router.get("/", response_model=List[Any]) # Usamos Any porque estamos devolviendo un dict dinámico con el NombreModelo
def obtener_todas_metricas(limite: int = 50, db: Session = Depends(get_db)):
    return MetricaService.obtener_todas_las_metricas(db, limite)

@router.get("/modelo/{id_modelo}", response_model=List[schemas.MetricasOut])
def obtener_historial_metricas(id_modelo: int, limite: int = 10, db: Session = Depends(get_db)):
    metricas = MetricaService.obtener_metricas_por_modelo(db, id_modelo, limite)
    
    if not metricas:
        return []
        
    return metricas