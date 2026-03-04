from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.usuario_service import UsuarioService
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError

router = APIRouter(prefix= "/api/v1/usuarios", tags=["Usuarios"])

@router.post("", response_model = UsuarioOut, status_code= 201)
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    try: 
        return UsuarioService.crear_usuario(db, usuario)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("", response_model=list[UsuarioOut])
def obtener_usuarios(db: Session = Depends(get_db)):
    return UsuarioService.obtener_todos_usuarios(db)

@router.get("/{usuario_id}", response_model=UsuarioOut)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    try:
        return UsuarioService.obtener_usuario(db, usuario_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)

@router.get("/email/{email}", response_model = UsuarioOut)
def obtener_usuario_por_email(email: str, db: Session = Depends(get_db)):
    try:
        return UsuarioService.obtener_usuario_por_email(db, email)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)

@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(usuario_id: int, usuario: UsuarioUpdate, db: Session = Depends(get_db)):
    try:
        return UsuarioService.actualizar_usuario(db, usuario_id, usuario)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except InvalidDataError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.delete("/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    try:
        return UsuarioService.eliminar_usuario(db, usuario_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)