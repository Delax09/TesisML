"""
Rutas (endpoints) para la gestión de Sectores.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import SectorCreate, SectorOut, SectorUpdate, EmpresaOut
from app.services.sector_service import SectorService
from app.exceptions import ResourceNotFoundError

router = APIRouter(prefix="/api/v1/sectores", tags=["Sectores"])


@router.post("", response_model=SectorOut, status_code=201)
def crear_sector(sector: SectorCreate, db: Session = Depends(get_db)):
    """Crea un nuevo sector."""
    try:
        return SectorService.crear_sector(db, sector)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[SectorOut])
def obtener_sectores(db: Session = Depends(get_db)):
    """Obtiene todos los sectores."""
    return SectorService.obtener_todos_sectores(db)


@router.get("/{sector_id}", response_model=SectorOut)
def obtener_sector(sector_id: int, db: Session = Depends(get_db)):
    """Obtiene un sector por ID."""
    try:
        return SectorService.obtener_sector_por_id(db, sector_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.get("/{sector_id}/empresas", response_model=list[EmpresaOut])
def obtener_empresas_por_sector(sector_id: int, db: Session = Depends(get_db)):
    """Obtiene todas las empresas de un sector."""
    try:
        return SectorService.obtener_empresas_por_sector(db, sector_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.put("/{sector_id}", response_model=SectorOut)
def actualizar_sector(sector_id: int, sector_data: SectorUpdate, db: Session = Depends(get_db)):
    """Actualiza un sector existente."""
    try:
        return SectorService.actualizar_sector(db, sector_id, sector_data)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{sector_id}")
def eliminar_sector(sector_id: int, db: Session = Depends(get_db)):
    """Elimina un sector."""
    try:
        return SectorService.eliminar_sector(db, sector_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
