# app/routers/auth.py
from app.schemas.schemas import RecuperarPassword, ResetearPasswordRequest
from app.utils.security import hash_password
from app.utils.email import enviar_correo
from app.services.usuario_service import UsuarioService
from app.exceptions import InvalidDataError
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from fastapi.responses import RedirectResponse
from jose import JWTError,jwt
from app.db.sessions import get_db
from app.core.config import settings
from app.schemas.schemas import Token
from app.models.usuario import Usuario
from app.utils.security import create_access_token, verify_password
from app.core.limiter import limiter
from app.utils.deps import obtener_usuario_actual


router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

##################################################
#################### NO TOCAR ####################
##################################################
@router.post("/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.Email == form_data.username).first()

    if not usuario or not verify_password(form_data.password, usuario.PasswordU):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not usuario.Activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Por favor, verifica tu correo electrónico o contacta al administrador."
        )
        
    # 1. ¡ESTA LÍNEA FALTABA! Generamos el token de acceso
    access_token = create_access_token(data={"sub": str(usuario.IdUsuario), "rol": usuario.IdRol})

    # 2. Crear la cookie HttpOnly con el token generado
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,  # Evita que JS acceda a la cookie (seguridad XSS)
        samesite="lax",
        max_age=3600    # 1 hora, ajusta según tu expiración
    )
    
    # IMPORTANTE: Si tu frontend antes usaba la respuesta del login para guardar
    # datos del usuario en el contexto (ej. nombre, rol), asegúrate de enviarlos aquí.
    return {
        "message": "Login exitoso", 
        "token_type": "bearer",
        "access_token": access_token # Puedes mandarlo también si algún componente aún lo busca en el JSON
    }


# =================================================================
# NUEVOS ENDPOINTS PARA SEGURIDAD Y CIERRE DE SESIÓN
# =================================================================

@router.get("/me")
def obtener_perfil_actual(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    """
    Retorna la información del usuario autenticado basándose estrictamente 
    en la validación de la cookie del backend.
    """
    # Estandarizamos el rol para el frontend (ej: 'admin' o 'usuario')
    nombre_rol_db = usuario_actual.rol.NombreRol.lower() if usuario_actual.rol else 'usuario'
    rol_estandarizado = 'admin' if 'admin' in nombre_rol_db else 'usuario'

    return {
        "id": usuario_actual.IdUsuario,
        "nombre": f"{usuario_actual.Nombre} {usuario_actual.Apellido or ''}".strip(),
        "email": usuario_actual.Email,
        "rol": rol_estandarizado
    }

@router.post("/logout")
def logout(response: Response):
    """
    Invalida la sesión eliminando la cookie del navegador.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Sesión cerrada correctamente"}

# =================================================================

@router.get("/verificar-email/{token}")
def verificar_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        usuario_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if usuario_id is None or token_type != "email_verification":
            raise HTTPException(status_code=400, detail="Token inválido o corrupto.")
            
    except JWTError:
        raise HTTPException(status_code=400, detail="El enlace ha expirado o no es válido.")

    usuario = db.query(Usuario).filter(Usuario.IdUsuario == int(usuario_id)).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
    if usuario.Activo:
        return RedirectResponse(url="http://localhost:3000/login?mensaje=ya_activo")

    usuario.Activo = True
    db.commit()
    
    return RedirectResponse(url="http://localhost:3000/login?mensaje=verificado")

@router.post("/solicitar-recuperacion")
def solicitar_recuperacion(request: RecuperarPassword, db: Session = Depends(get_db)):
    """
    Paso 1: Recibe un email, verifica si existe y envía un token por correo.
    """
    usuario = db.query(Usuario).filter(Usuario.Email == request.email).first()
    
    # Mensaje genérico por seguridad (evita que descubran qué correos existen en tu BD)
    mensaje_exito = {"message": "Si el correo está registrado y activo, recibirás las instrucciones de recuperación."}

    if not usuario or not usuario.Activo:
        return mensaje_exito

    # 1. Crear un token de vida corta (15 minutos)
    token_recuperacion = create_access_token(
        data={"sub": str(usuario.IdUsuario), "type": "password_reset"},
        expires_delta=timedelta(minutes=15)
    )
    
    enlace = f"http://localhost:3000/reset-password?token={token_recuperacion}"
    
    # --- NUEVA PLANTILLA HTML DE RECUPERACIÓN ---
    plantilla_recuperacion = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 20px;">
                <h2 style="color: #d32f2f; margin: 0;">Recuperación de Contraseña</h2>
            </div>
            <div style="padding: 20px 0;">
                <p style="font-size: 16px; color: #333;">Hola <strong>{usuario.Nombre}</strong>,</p>
                <p style="font-size: 16px; color: #333;">Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{enlace}" style="background-color: #d32f2f; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                </div>
                
                <p style="font-size: 13px; color: #d32f2f; text-align: center; font-weight: bold;">Este enlace es válido por solo 15 minutos.</p>
            </div>
            <div style="font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                Si no solicitaste este cambio, por favor ignora este correo.
            </div>
        </div>
    </body>
    </html>
    """
    # 2. Enviar el correo
    enviar_correo(
        destino=usuario.Email,
        asunto="TesisML - Recuperación de Contraseña",
        mensaje=plantilla_recuperacion,
        es_html=True
    )
    
    return mensaje_exito

@router.post("/resetear-password")
def resetear_password(request: ResetearPasswordRequest, db: Session = Depends(get_db)):
    """
    Paso 2: Recibe el token y la nueva contraseña, valida y actualiza la base de datos.
    """
    try:
        # Decodificamos el token
        payload = jwt.decode(request.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        usuario_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if usuario_id is None or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Token inválido o corrupto.")
            
    except JWTError:
        raise HTTPException(status_code=400, detail="El token ha expirado o no es válido.")

    # Buscamos al usuario
    usuario = db.query(Usuario).filter(Usuario.IdUsuario == int(usuario_id), Usuario.Activo == True).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o inactivo.")

    try:
        # Validamos que la nueva contraseña cumpla tus reglas (mayúsculas, números, etc.)
        UsuarioService.validar_password(request.nueva_password)
    except InvalidDataError as e:
        # Atrapamos tu error personalizado y lo mostramos
        raise HTTPException(status_code=400, detail=str(e))

    # Guardamos la nueva contraseña hasheada
    usuario.PasswordU = hash_password(request.nueva_password)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión."}