from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import NoticiaOut
from app.services.noticias_service import NoticiasService

router = APIRouter(prefix="/api/v1/noticias", tags=["Noticias"])

@router.get("/usuario/{usuario_id}", response_model=list[NoticiaOut])
async def obtener_noticias_del_usuario(usuario_id: int, db: Session = Depends(get_db)):
    try:
        # Nota que aquí usamos "await" porque nuestro servicio consulta una API externa asíncronamente
        noticias = await NoticiasService.obtener_noticias_portafolio(db, usuario_id)
        return noticias
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))