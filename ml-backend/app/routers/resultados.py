from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import ResultadoOut
from app.services.resultado_service import ResultadoService
from app.services.empresa_service import EmpresaService
from app.exceptions import ResourceNotFoundError

router = APIRouter(prefix="/api/v1/resultados", tags=["Resultados"])

@router.get("", response_model=list[ResultadoOut])
def obtener_resultados(db: Session = Depends(get_db)):
    return ResultadoService.obtener_todos_resultados(db)

@router.get("/empresa/{empresa_id}", response_model=list[ResultadoOut])
def obtener_resultado_por_empresa(empresa_id: int, db: Session = Depends(get_db)):
    try:
        return ResultadoService.obtener_resultados_por_empresa(db, empresa_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)

