# app/routers/auth.py
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