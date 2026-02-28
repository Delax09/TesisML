from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import RolCreate, RolOut, RolUpdate
from app.services.rol_service import RolService
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError

router = APIRouter(prefix="/api/v1/roles", tags=["Roles"])

@router.post("", response_model=RolOut, status_code=201)
def crear_rol(Rol: RolCreate, db: Session = Depends(get_db)):
    try:
        return RolService.crear_rol(db, Rol)
    except InvalidDataError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.get("",response_model= list[RolOut])
def obtener_roles(db: Session = Depends(get_db)):
    return RolService.obtener_roles(db)

@router.get("/{rol_id}", response_model=RolOut)
def obtener_rol(rol_id: int, db: Session = Depends(get_db)):
    try:
        return RolService.obtener_rol_por_id(db, rol_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)

#Obtener usuaaros por rol 

@router.put("/{rol_id}", response_model=RolOut)
def actualizar_rol(rol_id: int, rol_data: RolUpdate, db: Session = Depends(get_db)):
    try:
        return RolService.actualizar_rol(db, rol_id, rol_data)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.delete("/{rol_id}")
def eliminar_rol(rol_id: int, db: Session = Depends(get_db)):
    try:
        return RolService.eliminar_rol(db, rol_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)