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

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
    access_token = create_access_token(data={"sub": str(usuario.IdUsuario), "rol": usuario.IdRol})
    return {"access_token": access_token, "token_type": "bearer"}

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
    
    # 2. Enviar el correo
    enviar_correo(
        destino=usuario.Email,
        asunto="TesisML - Recuperación de Contraseña",
        mensaje=(
            f"Hola {usuario.Nombre},\n\n"
            "Has solicitado restablecer tu contraseña.\n\n"
            f"Copia y pega el siguiente token en la API para cambiar tu contraseña (es válido por 15 minutos):\n\n"
            f"{token_recuperacion}\n\n"
            "Si no fuiste tú, por favor ignora este correo."
        )
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