from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import PrecioHistoricoCreate, PrecioHistoricoOut, PrecioGraficoOut
from app.services.precio_historico_service import PrecioHistoricoService
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError

router = APIRouter(prefix="/api/v1/precio_historico", tags=["Precios Historicos"])

@router.get("", response_model=list[PrecioHistoricoOut])
def obtener_todos_precios_historicos(db: Session = Depends(get_db)):
    return PrecioHistoricoService.obtener_todos_precios_historicos(db)

@router.get("/empresa/{empresa_id}", response_model=list[PrecioHistoricoOut])
def obtener_precio_historico_por_empresa(empresa_id: int, db: Session = Depends(get_db)):
    try:
        precios = PrecioHistoricoService.obtener_precio_historico_por_empresa(db, empresa_id)
        return precios
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    
@router.get("/empresa/{empresa_id}/grafico", response_model=list[PrecioGraficoOut])
def get_grafico_data(empresa_id: int, db: Session = Depends(get_db)):
    return PrecioHistoricoService.obtener_precios_con_indicadores(db, empresa_id)