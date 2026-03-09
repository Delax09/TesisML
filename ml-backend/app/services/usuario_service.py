import re
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.models.rol import Rol
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError
from app.utils.security import hash_password, verify_password

class UsuarioService: 
    # =========================================================================
    # VALIDACIONES PRIVADAS
    # =========================================================================
    @staticmethod
    def _validar_rol_existe(db: Session, rol_id: int) -> None:
        rol = db.query(Rol).filter(Rol.IdRol == rol_id).first()
        if not rol:
            raise InvalidDataError("El rol especificado no existe")
    
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
    
    @staticmethod
    def validar_largo_password(password: str) -> None:
        if len(password) < 8 or len(password) > 32:
            raise InvalidDataError("La contraseña debe tener entre 8 y 32 caracteres")

    # =========================================================================
    # OPERACIONES CRUD (CON FILTRO DE ACTIVO)
    # =========================================================================
    @staticmethod
    def crear_usuario(db: Session, usuario: UsuarioCreate) -> Usuario:
        # Validaciones de integridad
        UsuarioService.validar_formato_email(usuario.Email)
        UsuarioService._validar_email_unico(db, usuario.Email)
        UsuarioService._validar_rol_existe(db, usuario.IdRol)
        UsuarioService.validar_largo_password(usuario.PasswordHash)
        
        db_usuario = Usuario(
            Nombre=usuario.Nombre,
            Apellido=usuario.Apellido,
            Email=usuario.Email,
            PasswordHash=hash_password(usuario.PasswordHash),
            IdRol=usuario.IdRol,
            Activo=True,                      # Nuevo campo
            FechaCreacion=datetime.utcnow(),  # Nuevo campo
            IntentosFallidos=0                # Nuevo campo
        )
        
        db.add(db_usuario)
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    
    @staticmethod
    def obtener_usuario_por_id(db: Session, usuario_id: int) -> Usuario:
        # Solo obtenemos usuarios activos (Soft Delete)
        usuario = db.query(Usuario).filter(
            Usuario.IdUsuario == usuario_id,
            Usuario.Activo == True
        ).first()
        
        if not usuario:
            raise ResourceNotFoundError("Usuario", usuario_id)
        return usuario
    
    @staticmethod
    def obtener_todos_usuarios(db: Session) -> list[Usuario]:
        return db.query(Usuario).filter(Usuario.Activo == True).all()

    @staticmethod
    def actualizar_usuario(db: Session, usuario_id: int, usuario_update: UsuarioUpdate) -> Usuario:
        db_usuario = UsuarioService.obtener_usuario_por_id(db, usuario_id)
        
        if usuario_update.Email and usuario_update.Email != db_usuario.Email:
            UsuarioService.validar_formato_email(usuario_update.Email)
            UsuarioService._validar_email_unico(db, usuario_update.Email, usuario_id)
            db_usuario.Email = usuario_update.Email
        
        if usuario_update.IdRol:
            UsuarioService._validar_rol_existe(db, usuario_update.IdRol)
            db_usuario.IdRol = usuario_update.IdRol
        
        # Actualización de campos básicos
        for campo, valor in usuario_update.dict(exclude_unset=True).items():
            if campo not in ["Email", "IdRol", "PasswordHash"]:
                setattr(db_usuario, campo, valor)
        
        if usuario_update.PasswordHash:
            UsuarioService.validar_largo_password(usuario_update.PasswordHash)
            db_usuario.PasswordHash = hash_password(usuario_update.PasswordHash)
        
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    
    @staticmethod
    def eliminar_usuario(db: Session, usuario_id: int) -> bool:
        """Implementa Soft Delete desactivando el registro."""
        db_usuario = UsuarioService.obtener_usuario_por_id(db, usuario_id)
        db_usuario.Activo = False  # Marcamos como inactivo en lugar de borrar
        db.commit()
        return True

    # =========================================================================
    # LÓGICA DE AUTENTICACIÓN Y SEGURIDAD
    # =========================================================================
    @staticmethod
    def verificar_y_autenticar(db: Session, email: str, password: str) -> Usuario:
        """Autentica al usuario y actualiza su último login."""
        usuario = db.query(Usuario).filter(
            Usuario.Email == email,
            Usuario.Activo == True
        ).first()
        
        if not usuario or not verify_password(password, usuario.PasswordHash):
            # Aquí podrías implementar el incremento de IntentosFallidos si el usuario existe
            raise InvalidDataError("Credenciales inválidas o cuenta desactivada")
        
        # Actualizamos la auditoría de acceso
        usuario.UltimoLogin = datetime.utcnow()
        usuario.IntentosFallidos = 0
        db.commit()
        
        return usuario