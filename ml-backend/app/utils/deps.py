# app/utils/deps.py
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.sessions import get_db
from app.services.usuario_service import UsuarioService
from app.schemas.schemas import TokenData
from app.models.usuario import Usuario

# NUEVA FUNCIÓN: Extrae y limpia el token de la cookie
def obtener_token_de_cookie(request: Request) -> str:
    # Busca la cookie llamada "access_token"
    token_completo = request.cookies.get("access_token")
    
    if not token_completo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado (Cookie no encontrada)"
        )
    
    # El token viene como "Bearer eyJ...", lo separamos por el espacio
    try:
        scheme, token = token_completo.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Esquema inválido")
        return token
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido en la cookie"
        )

# Modificamos la dependencia para que use nuestra nueva función
def obtener_usuario_actual(
    token: str = Depends(obtener_token_de_cookie), # <-- CAMBIO AQUÍ
    db: Session = Depends(get_db)
) -> Usuario:
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Desencriptamos el token usando nuestra SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        usuario_id: int = payload.get("sub")
        
        # OJO: En tu payload veo que guardaste "sub" como string ("5"), 
        # así que lo convertimos a entero por seguridad si tu DB usa INT
        if usuario_id is None:
            raise credentials_exception
        token_data = TokenData(id_usuario=int(usuario_id))
        
    except JWTError:
        raise credentials_exception
        
    # Buscamos al usuario en la BD para asegurar que sigue existiendo y está activo
    usuario = UsuarioService.obtener_usuario_por_id(db, usuario_id=token_data.id_usuario)
    if usuario is None or not usuario.Activo:
        raise credentials_exception
        
    return usuario 