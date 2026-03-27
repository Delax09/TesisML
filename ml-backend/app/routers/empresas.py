"""
Rutas (endpoints) para la gestión de Empresas.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import EmpresaCreate, EmpresaOut, EmpresaUpdate
from app.services.empresa_service import EmpresaService
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError
from fastapi_cache.decorator import cache

router = APIRouter(prefix="/api/v1/empresas", tags=["Empresas"])


@router.post("", response_model=EmpresaOut, status_code=201)
def crear_empresa(empresa: EmpresaCreate, db: Session = Depends(get_db)):
    """Crea una nueva empresa."""
    try:
        return EmpresaService.crear_empresa(db, empresa)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[EmpresaOut])
def obtener_empresas(db: Session = Depends(get_db)):
    """Obtiene todas las empresas."""
    return EmpresaService.obtener_todas_empresas(db)

@router.get("/activas", response_model=list[EmpresaOut])
@cache(expire=600)
def obtener_empresas_activas(db: Session = Depends(get_db)):
    return EmpresaService.obtener_empresas_activas(db)


@router.get("/{empresa_id}", response_model=EmpresaOut)
def obtener_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """Obtiene una empresa por ID."""
    try:
        return EmpresaService.obtener_empresa_por_id(db, empresa_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.put("/{empresa_id}", response_model=EmpresaOut)
def actualizar_empresa(empresa_id: int, empresa_data: EmpresaUpdate, db: Session = Depends(get_db)):
    """Actualiza una empresa existente."""
    try:
        return EmpresaService.actualizar_empresa(db, empresa_id, empresa_data)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{empresa_id}")
def desactivar_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """Desactiva una empresa."""
    try:
        return EmpresaService.desactivar_empresa(db, empresa_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
