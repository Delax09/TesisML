# app/routers/modelos_ia.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.sessions import get_db
from app.models.modelo_ia import ModeloIA
from app.schemas.schemas import ModeloIAOut, ModeloIAUpdate
from app.utils.deps import obtener_usuario_actual
from app.models.usuario import Usuario
from app.models.models import UsuarioModelo

router = APIRouter(prefix="/api/v1/modelos-ia", tags=["Registro de Modelos IA"])

@router.get("", response_model=List[ModeloIAOut])
def obtener_todos_los_modelos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obtener_usuario_actual) # Protegemos la ruta
):
    """Obtiene todos los modelos (activos e inactivos) para el panel de administración."""
    modelos = db.query(ModeloIA).all()
    return modelos

@router.get("/activos", response_model=List[ModeloIAOut])
def obtener_modelos_activos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene solo los modelos activos (ideal para el filtro del usuario final)."""
    modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True).all()
    return modelos

@router.get("/{id_modelo}", response_model=ModeloIAOut)
def obtener_modelo_por_id(
    id_modelo: int, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene el detalle de un modelo específico."""
    modelo = db.query(ModeloIA).filter(ModeloIA.IdModelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    return modelo


@router.patch("/{id_modelo}", response_model=ModeloIAOut)
def actualizar_estado_modelo(
    id_modelo: int, 
    modelo_data: ModeloIAUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza los datos de un modelo, permitiendo al Admin cambiar su estado (Activo/Inactivo)."""
    
    # Opcional: Podrías validar aquí si current_user.IdRol == 2 (Administrador)
    
    modelo = db.query(ModeloIA).filter(ModeloIA.IdModelo == id_modelo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    # Actualizamos solo el campo enviado (en este caso, Activo)
    if modelo_data.Activo is not None:
        modelo.Activo = modelo_data.Activo
        
    db.commit()
    db.refresh(modelo)
    
    return modelo

@router.get("/usuario/{usuario_id}")
def obtener_modelos_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    """ 
    Retorna solo los modelos IA que el usuario tiene habilitados 
    (Versión rápida pasando el usuario_id por URL)
    """
    
    # Hacemos un JOIN entre ModeloIA y UsuarioModelo
    modelos_habilitados = db.query(ModeloIA).join(
        UsuarioModelo, ModeloIA.IdModelo == UsuarioModelo.IdModelo
    ).filter(
        UsuarioModelo.IdUsuario == usuario_id,
        UsuarioModelo.Activo == True, # El usuario tiene acceso
        ModeloIA.Activo == True       # El modelo no está dado de baja globalmente
    ).all()
    
    return modelos_habilitados