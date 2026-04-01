from datetime import datetime
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.models.rol import Rol
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError
from app.utils.security import hash_password, verify_password
import re
from app.utils.security import create_access_token
from datetime import timedelta

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
    def validar_password(password: str) -> None:
        caracteres = ["*", "/", ".", "%", "+", "-"]
        if len(password) < 6 or len(password) > 32:
            raise InvalidDataError("Debe tener 8 y 32 caracteres")
        if not any(char.isdigit() for char in password):
            raise InvalidDataError("Debe contener algún número")
        if not any(char.isupper() for char in password):
            raise InvalidDataError("Debe tener alguna mayuscula")
        if not any(char in caracteres for char in password):
            raise InvalidDataError("Debe contener algun caracter especial")

    # =========================================================================
    # OPERACIONES CRUD (CON FILTRO DE ACTIVO)
    # =========================================================================
    @staticmethod
    def crear_usuario(db: Session, usuario: UsuarioCreate) -> Usuario:
        # Validaciones de integridad
        UsuarioService.validar_formato_email(usuario.Email)
        UsuarioService._validar_email_unico(db, usuario.Email)
        UsuarioService._validar_rol_existe(db, usuario.IdRol)
        UsuarioService.validar_password(usuario.PasswordU)
        
        db_usuario = Usuario(
            Nombre=usuario.Nombre,
            Apellido=usuario.Apellido,
            Email=usuario.Email,
            PasswordU=hash_password(usuario.PasswordU),
            IdRol=usuario.IdRol,
            Activo=False,                      
            FechaCreacion=datetime.utcnow(),  
        )
        
        db.add(db_usuario)
        db.commit()
        db.refresh(db_usuario)

        #Logica de verificacion
        token_verificacion = create_access_token(
            data={"sub": str(db_usuario.IdUsuario), "type": "email_verification"},
            expires_delta=timedelta(hours=24)
        )

        enlace =f"http://localhost:8000/api/v1/auth/verificar-email/{token_verificacion}"

        # --- NUEVA PLANTILLA HTML DE BIENVENIDA ---
        plantilla_bienvenida = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; border-bottom: 2px solid #1976d2; padding-bottom: 20px;">
                    <h2 style="color: #1976d2; margin: 0;">¡Bienvenido a TesisML!</h2>
                </div>
                <div style="padding: 20px 0;">
                    <p style="font-size: 16px; color: #333;">Hola <strong>{db_usuario.Nombre} {db_usuario.Apellido}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Gracias por registrarte. Para activar tu cuenta y comenzar a usar nuestras herramientas de IA, por favor confirma tu correo:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{enlace}" style="background-color: #1976d2; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verificar mi Cuenta</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">Este enlace expira en 24 horas.</p>
                </div>
                <div style="font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    Si no creaste esta cuenta, puedes ignorar este mensaje.
                </div>
            </div>
        </body>
        </html>
        """
        from app.utils.email import enviar_correo
        enviar_correo(
            destino = db_usuario.Email,
            asunto = "Bienvenido a TesisML - Verifica tu cuenta",
            mensaje= plantilla_bienvenida,
            es_html=True)

        return db_usuario
    
    @staticmethod
    def obtener_usuario_por_id(db: Session, usuario_id: int) -> Usuario:
        
        usuario = db.query(Usuario).filter(
            Usuario.IdUsuario == usuario_id,
            Usuario.Activo == True
        ).first()
        
        if not usuario:
            raise ResourceNotFoundError("Usuario", usuario_id)
        return usuario
    
    @staticmethod
    def obtener_todos_usuarios(db: Session) -> list[Usuario]:
        return db.query(Usuario).all()
    
    def obtener_usuario_email(db: Session, usuario_email: str) -> Usuario:
        usuario = db.query(Usuario).filter(
            Usuario.Email == usuario_email,
            Usuario.Activo == True
        ).first()

        if not usuario:
            raise ResourceNotFoundError("Usuario", usuario_email)
        return usuario
        
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
            if campo not in ["Email", "IdRol", "PasswordU"]:
                setattr(db_usuario, campo, valor)
        
        if usuario_update.PasswordU:
            UsuarioService.validar_largo_password(usuario_update.PasswordU)
            db_usuario.PasswordU = hash_password(usuario_update.PasswordU)
        
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