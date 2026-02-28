from sqlalchemy.orm import Session
from app.models import Rol
from app.schemas import RolCreate, RolUpdate
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError

class RolService: 
    #Crear un nuevo rol
    @staticmethod
    def crear_rol(db: Session, rol_data: RolCreate) -> Rol:
        nuevo_rol = Rol(NombreRol = rol_data.NombreRol)
        db.add(nuevo_rol)
        db.commit()
        db.refresh(nuevo_rol)
        return nuevo_rol
    
    #obtener todos los roles
    @staticmethod
    def obtener_roles(db: Session) -> list[Rol]:
        return db.query(Rol).all()
    
    #Obtener rol por id
    @staticmethod
    def obtener_rol_por_id(db: Session, rol_id: int) -> Rol:
        rol = db.query(Rol).filter(Rol.IdRol == rol_id).first()
        if not rol:
            raise ResourceNotFoundError("Rol", rol_id)
        return rol
    
    #Actualizar rol
    @staticmethod
    def actualizar_rol(db: Session, rol_id: int, rol_data: RolUpdate) -> Rol:
        db_rol = RolService.obtener_rol_por_id(db, rol_id)

        if rol_data.NombreRol:
            db_rol.NombreRol = rol_data.NombreRol
        
        db.commit()
        db.refresh(db_rol)
        return db_rol
    
    #Eliminar rol
    @staticmethod
    def eliminar_rol(db: Session, rol_id: int) -> dict:
        
        if db.query(Rol).filter(Rol.IdRol == rol_id).first() is None:
            raise ResourceNotFoundError("Rol", rol_id)
        db_rol = RolService.obtener_rol_por_id(db, rol_id)
        db.delete(db_rol)
        db.commit()
        return {"message": f"Rol {rol_id} eliminado correctamente"}