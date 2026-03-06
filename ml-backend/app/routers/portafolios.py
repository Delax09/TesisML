from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import PortafolioCreate, PortafolioOut, PortafolioUpdate
from app.services.portafolio_service import PortafolioService
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError

router = APIRouter(prefix="/api/v1/portafolios", tags=["Portafolios"])

