import re
from sqlalchemy.orm import Session
from app.models import Usuario, Rol
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate, RolUpdate
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError
from app.utils.security import hash_password, verify_password

class UsuarioService: 
    @staticmethod
    def _validar_rol_existe(db: Session, rol_id: int) -> None:
        rol = db.query(Rol).filter(Rol.IdRol == rol_id).first()
        if not rol:
            raise InvalidDataError("El rol especificado no existe")
        return rol
    
    @staticmethod
    def _validar_email_unico(db: Session, email: str, usuario_id: int = None) -> None:
        query = db.query(Usuario).filter(Usuario.Email == email)
        if usuario_id:
            query = query.filter(Usuario.IdUsuario != usuario_id)
        
        if query.first():
            raise DuplicateResourceError("Usuario", "Email", email)
    
    @staticmethod
    def validar_formato_email(email: str) -> None:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, email):
            raise InvalidDataError("El formato del email es inválido")
        return True
    
    @staticmethod
    def crear_usuario(db: Session, usuario: UsuarioCreate) -> Usuario:
        # Validaciones
        UsuarioService.validar_formato_email(usuario.Email)
        UsuarioService._validar_email_unico(db, usuario.Email)
        UsuarioService._validar_rol_existe(db, usuario.IdRol)
        
        # Crear usuario con contraseña hasheada
        db_usuario = Usuario(
            Nombre=usuario.Nombre,
            Apellido=usuario.Apellido,
            Email=usuario.Email,
            PasswordU=hash_password(usuario.PasswordU),  # Hashear contraseña
            IdRol=usuario.IdRol
        )
        
        db.add(db_usuario)
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    
    @staticmethod
    def obtener_usuario_por_id(db: Session, usuario_id: int) -> Usuario:
        usuario = db.query(Usuario).filter(Usuario.IdUsuario == usuario_id).first()
        if not usuario:
            raise ResourceNotFoundError("Usuario", usuario_id)
        return usuario
    
    @staticmethod
    def obtener_usuario_por_email(db: Session, email: str) -> Usuario:
        usuario = db.query(Usuario).filter(Usuario.Email == email).first()
        if not usuario:
            raise ResourceNotFoundError("Usuario", email)
        return usuario
    
    @staticmethod
    def obtener_todos_usuarios(db: Session) -> list[Usuario]:
        return db.query(Usuario).all()
    
    @staticmethod
    def actualizar_usuario(db: Session, usuario_id: int, usuario_update: UsuarioUpdate) -> Usuario:
        db_usuario = UsuarioService.obtener_usuario_por_id(db, usuario_id)
        
        # Validar email si se está actualizando
        if usuario_update.Email and usuario_update.Email != db_usuario.Email:
            UsuarioService.validar_formato_email(usuario_update.Email)
            UsuarioService._validar_email_unico(db, usuario_update.Email, usuario_id)
            db_usuario.Email = usuario_update.Email
        
        # Validar rol si se está actualizando
        if usuario_update.IdRol:
            UsuarioService._validar_rol_existe(db, usuario_update.IdRol)
            db_usuario.IdRol = usuario_update.IdRol
        
        # Actualizar otros campos
        if usuario_update.Nombre:
            db_usuario.Nombre = usuario_update.Nombre
        if usuario_update.Apellido:
            db_usuario.Apellido = usuario_update.Apellido
        
        # Hashear contraseña si se proporciona nueva
        if usuario_update.PasswordU:
            db_usuario.PasswordU = hash_password(usuario_update.PasswordU)
        
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    
    @staticmethod
    def eliminar_usuario(db: Session, usuario_id: int) -> bool:
        db_usuario = UsuarioService.obtener_usuario_por_id(db, usuario_id)
        db.delete(db_usuario)
        db.commit()
        return True
    
    @staticmethod
    def verificar_contraseña(db: Session, email: str, password: str) -> bool:
        usuario = UsuarioService.obtener_usuario_por_email(db, email)
        return verify_password(password, usuario.PasswordU)
