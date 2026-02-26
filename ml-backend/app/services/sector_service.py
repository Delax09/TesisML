"""
Servicios para la entidad Sector.
Contiene la lógica de negocio separada de los endpoints.
"""

from sqlalchemy.orm import Session
from app.models.models import Sector, Empresa
from app.schemas.schemas import SectorCreate, SectorUpdate
from app.exceptions import ResourceNotFoundError


class SectorService:
    """Servicio para gestionar operaciones de Sector."""

    @staticmethod
    def crear_sector(db: Session, sector_data: SectorCreate) -> Sector:
        """Crea un nuevo sector."""
        nuevo_sector = Sector(NombreSector=sector_data.NombreSector)
        db.add(nuevo_sector)
        db.commit()
        db.refresh(nuevo_sector)
        return nuevo_sector

    @staticmethod
    def obtener_todos_sectores(db: Session) -> list[Sector]:
        """Obtiene todos los sectores."""
        return db.query(Sector).all()

    @staticmethod
    def obtener_sector_por_id(db: Session, sector_id: int) -> Sector:
        """Obtiene un sector por su ID."""
        sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
        if not sector:
            raise ResourceNotFoundError("Sector", sector_id)
        return sector

    @staticmethod
    def obtener_empresas_por_sector(db: Session, sector_id: int) -> list[Empresa]:
        """Obtiene todas las empresas de un sector."""
        sector = SectorService.obtener_sector_por_id(db, sector_id)
        empresas = db.query(Empresa).filter(Empresa.IdSector == sector_id).all()
        return empresas

    @staticmethod
    def actualizar_sector(db: Session, sector_id: int, sector_data: SectorUpdate) -> Sector:
        """Actualiza un sector existente."""
        db_sector = SectorService.obtener_sector_por_id(db, sector_id)

        if sector_data.NombreSector:
            db_sector.NombreSector = sector_data.NombreSector

        db.commit()
        db.refresh(db_sector)
        return db_sector

    @staticmethod
    def eliminar_sector(db: Session, sector_id: int) -> dict:
        """Elimina un sector."""
        db_sector = SectorService.obtener_sector_por_id(db, sector_id)
        db.delete(db_sector)
        db.commit()
        return {"message": f"Sector {sector_id} eliminado correctamente"}
