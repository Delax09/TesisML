"""
Servicios para la entidad Empresa.
Contiene la lógica de negocio separada de los endpoints.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Empresa, Sector
from app.schemas.schemas import EmpresaCreate, EmpresaUpdate
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError


class EmpresaService:
    """Servicio para gestionar operaciones de Empresa."""

    @staticmethod
    def _validar_sector_existe(db: Session, sector_id: int) -> Sector:
        """Valida que un sector exista."""
        sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
        if not sector:
            raise InvalidDataError("El sector especificado no existe")
        return sector

    @staticmethod
    def _validar_ticket_unico(db: Session, ticket: str, empresa_id: int = None) -> None:
        """Valida que el ticket sea único."""
        query = db.query(Empresa).filter(Empresa.Ticket == ticket)
        if empresa_id:
            query = query.filter(Empresa.IdEmpresa != empresa_id)
        
        if query.first():
            raise DuplicateResourceError("Empresa", "Ticket", ticket)

    @staticmethod
    def crear_empresa(db: Session, empresa_data: EmpresaCreate) -> Empresa:
        """Crea una nueva empresa."""
        # Validaciones
        EmpresaService._validar_sector_existe(db, empresa_data.IdSector)
        EmpresaService._validar_ticket_unico(db, empresa_data.Ticket)

        nueva_empresa = Empresa(
            Ticket=empresa_data.Ticket,
            NombreEmpresa=empresa_data.NombreEmpresa,
            IdSector=empresa_data.IdSector,
            FechaAgregado=datetime.utcnow()
        )

        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)
        return nueva_empresa

    @staticmethod
    def obtener_todas_empresas(db: Session) -> list[Empresa]:
        """Obtiene todas las empresas."""
        return db.query(Empresa).all()

    @staticmethod
    def obtener_empresa_por_id(db: Session, empresa_id: int) -> Empresa:
        """Obtiene una empresa por su ID."""
        empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
        if not empresa:
            raise ResourceNotFoundError("Empresa", empresa_id)
        return empresa

    @staticmethod
    def actualizar_empresa(db: Session, empresa_id: int, empresa_data: EmpresaUpdate) -> Empresa:
        """Actualiza una empresa existente."""
        db_empresa = EmpresaService.obtener_empresa_por_id(db, empresa_id)

        # Validar ticket si se está actualizando
        if empresa_data.Ticket and empresa_data.Ticket != db_empresa.Ticket:
            EmpresaService._validar_ticket_unico(db, empresa_data.Ticket, empresa_id)

        # Validar sector si se está actualizando
        if empresa_data.IdSector and empresa_data.IdSector != db_empresa.IdSector:
            EmpresaService._validar_sector_existe(db, empresa_data.IdSector)

        # Actualizar campos
        update_data = empresa_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_empresa, key, value)

        db.commit()
        db.refresh(db_empresa)
        return db_empresa

    @staticmethod
    def eliminar_empresa(db: Session, empresa_id: int) -> dict:
        """Elimina una empresa."""
        db_empresa = EmpresaService.obtener_empresa_por_id(db, empresa_id)
        ticket = db_empresa.Ticket
        db.delete(db_empresa)
        db.commit()
        return {"message": f"Empresa {ticket} eliminada correctamente"}
