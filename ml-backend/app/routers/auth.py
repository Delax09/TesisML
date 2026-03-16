# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request # Añadir Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.sessions import get_db
from app.core.config import settings
from app.schemas.schemas import Token
from app.models.usuario import Usuario
from app.utils.security import create_access_token, verify_password
from app.core.limiter import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

@router.post("/login", response_model=Token)
@limiter.limit("5/minute") # LÍMITE: 5 peticiones por minuto
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.Email == form_data.username,
        Usuario.Activo == True
    ).first()
    
    if not usuario or not verify_password(form_data.password, usuario.PasswordU):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(usuario.IdUsuario), "rol": usuario.IdRol}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}