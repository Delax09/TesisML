from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import PortafolioCreate, PortafolioOut, PortafolioUpdate
from app.services.portafolio_service import PortafolioService
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError

router = APIRouter(prefix="/api/v1/portafolios", tags=["Portafolios"])

@router.post("", response_model= PortafolioOut, status_code=201)
def crear_portafolio(portafolio: PortafolioCreate, db: Session = Depends(get_db)):
    try: 
        return PortafolioService.crear_portafolio(db, portafolio)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateResourceError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=list[PortafolioOut])
def obtener_portafolios(db: Session = Depends(get_db)):
    return PortafolioService.obtener_todos_portafolios(db)

@router.get("/{portafolio_id}", response_model=PortafolioOut)
def obtener_portafolio(portafolio_id: int,portafolio_data: PortafolioUpdate, db: Session = Depends(get_db)):
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
def eliminar_portafolio(portafolio_id: int, db: Session = Depends(get_db)):
    try:
        return PortafolioService.eliminar_portafolio(db, portafolio_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
