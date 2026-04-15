# app/routers/admin.py
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.auto.importar_tickers import importar_desde_csv
from app.auto.actualizar_precios import ejecutar_actualizacion_masiva
from app.models.models import UsuarioModelo
from app.models.usuario import Usuario

router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])

@router.post("/importar-tickers")
def api_importar(db: Session = Depends(get_db)):
    importar_desde_csv(db)
    return {"message": "Importación masiva completada exitosamente."}

@router.post("/actualizar-precios")
def api_actualizar_precios(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Se ejecuta en segundo plano para no bloquear el frontend
    background_tasks.add_task(ejecutar_actualizacion_masiva)
    return {"message": "Proceso de actualización iniciado en segundo plano."}

@router.put("/usuarios/{id_usuario}/modelos/{id_modelo}/toggle")
def alternar_modelo_usuario(
    id_usuario: int, 
    id_modelo: int, 
    db: Session = Depends(get_db)
):
    """
    Habilita o deshabilita un modelo para un usuario específico.
    (Versión adaptada a la estructura actual sin get_current_user)
    """
    # 1. (Opcional pero recomendado) Verificar que el usuario exista
    usuario_db = db.query(Usuario).filter(Usuario.IdUsuario == id_usuario).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Buscar la relación en la tabla intermedia
    asignacion = db.query(UsuarioModelo).filter(
        UsuarioModelo.IdUsuario == id_usuario,
        UsuarioModelo.IdModelo == id_modelo
    ).first()

    # Si no existe la relación (ej. modelos agregados después de crear el usuario), la creamos
    if not asignacion:
        asignacion = UsuarioModelo(IdUsuario=id_usuario, IdModelo=id_modelo, Activo=True)
        db.add(asignacion)
    else:
        # Si existe, alternamos su valor (True a False, False a True)
        asignacion.Activo = not asignacion.Activo
        
    db.commit()
    db.refresh(asignacion)
    
    estado = "habilitado" if asignacion.Activo else "deshabilitado"
    return {"message": f"Modelo {estado} exitosamente.", "Activo": asignacion.Activo}