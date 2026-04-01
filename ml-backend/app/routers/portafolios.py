from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import PortafolioCreate, PortafolioOut, PortafolioUpdate, AnalisisPortafolioOut
from app.services.portafolio_service import PortafolioService
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError

router = APIRouter(prefix="/api/v1/portafolios", tags=["Portafolios"])

@router.post("", response_model=PortafolioOut, status_code=201)
def crear_portafolio(portafolio: PortafolioCreate, db: Session = Depends(get_db)):
    try: 
        return PortafolioService.crear_portafolio(db, portafolio)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# RUTA GLOBAL: Trae todos (Útil para el Admin)
@router.get("", response_model=list[PortafolioOut])
def obtener_portafolios(db: Session = Depends(get_db)):
    return PortafolioService.obtener_todos_portafolios(db)

# NUEVA RUTA ESPECÍFICA: Trae el portafolio de un solo usuario (y solo los Activos)
@router.get("/usuario/{usuario_id}", response_model=list[PortafolioOut])
def obtener_portafolios_de_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return PortafolioService.obtener_portafolios_usuario(db, usuario_id)

# RUTA CORREGIDA: Eliminado el error de actualización accidental
@router.get("/{portafolio_id}", response_model=PortafolioOut)
def obtener_portafolio(portafolio_id: int, db: Session = Depends(get_db)):
    try:
        return PortafolioService.obtener_portafolio_por_id(db, portafolio_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{portafolio_id}", response_model=PortafolioOut)
def actualizar_portafolio(portafolio_id: int, portafolio_data: PortafolioUpdate, db: Session = Depends(get_db)):
    try:
        return PortafolioService.actualizar_portafolio(db, portafolio_id, portafolio_data)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{portafolio_id}") 
def eliminar_del_portafolio(portafolio_id: int, db: Session = Depends(get_db)):
    
    exito = PortafolioService.eliminar_portafolio(db=db, portafolio_id=portafolio_id)
    
    if not exito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El registro no existe en el portafolio"
        )
        
    return {"message": "Empresa removida del portafolio (Desactivada)"}

@router.get("/analisis/{usuario_id}", response_model=AnalisisPortafolioOut)
def obtener_analisis_del_portafolio(usuario_id: int, db: Session = Depends(get_db)):
    try:
        return PortafolioService.obtener_analisis_portafolio(db, usuario_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))