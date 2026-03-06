from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Portafolio, Empresa, Usuario
from app.schemas.schemas import PortafolioCreate, PortafolioUpdate
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError
from app.utils import obtener_hora_formateada as HoraFormat

class PortafolioService:
    @staticmethod
    def _validar_usuario_existe(db: Session, usuario_id: int) -> Usuario:
        usuario = db.query(Usuario).filter(Usuario.IdUsuario == usuario_id).first()
        if not usuario:
            raise InvalidDataError("El usuario especificado no existe")
        return usuario
    
    
    @staticmethod
    def _validar_empresa_existe(db: Session, empresa_id: int) -> Empresa:
        empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
        if not empresa:
            raise InvalidDataError("La empresa especificada no existe")
        return empresa
    
    @staticmethod
    def crear_portafolio(db: Session, portafolio_data: PortafolioCreate) -> Portafolio:
        PortafolioService._validar_empresa_existe(db, portafolio_data.IdEmpresa)
        PortafolioService._validar_usuario_existe(db, portafolio_data.IdUsuario)

        nuevo_portafolio = Portafolio(
            IdUsuario = portafolio_data.IdUsuario,
            IdEmpresa = portafolio_data.IdEmpresa,
            FechaAgregado = HoraFormat()
        )
        db.add(nuevo_portafolio)
        db.commit()
        db.refresh(nuevo_portafolio)
        return nuevo_portafolio

    @staticmethod
    def obtener_todos_portafolios(db: Session) -> list[Portafolio]:
        return db.query(Portafolio).all()

    @staticmethod
    def obtener_portafolio_por_id(db: Session, portafolio_id: int) -> Portafolio:
        portafolio_id = db.query(Portafolio).filter(Portafolio.IdPortafolio == portafolio_id).first()
        if not portafolio_id:
            raise ResourceNotFoundError("Portafolio", portafolio_id)
        return portafolio_id

    @staticmethod
    def actualizar_portafolio(db: Session, portafolio_id: int, portafolio_data: PortafolioUpdate) -> Portafolio:
        portafolio = db.query(Portafolio).filter(Portafolio.IdPortafolio == portafolio_id).first()
        if not portafolio:
            raise ResourceNotFoundError("Portafolio", portafolio_id)

        if portafolio_data.IdEmpresa:
            PortafolioService._validar_empresa_existe(db, portafolio_data.IdEmpresa)
            portafolio.IdEmpresa = portafolio_data.IdEmpresa

        if portafolio_data.IdUsuario:
            PortafolioService._validar_usuario_existe(db, portafolio_data.IdUsuario)
            portafolio.IdUsuario = portafolio_data.IdUsuario

        db.commit()
        db.refresh(portafolio)
        return portafolio

    @staticmethod
    def eliminar_portafolio(db: Session, portafolio_id: int, usuario_id: int, empresa_id: int) -> dict:
        portafolio = db.query(Portafolio).filter(Portafolio.IdPortafolio == portafolio_id).first()
        if not portafolio:
            raise ResourceNotFoundError("Portafolio", portafolio_id)

        if portafolio.IdUsuario != usuario_id or portafolio.IdEmpresa != empresa_id:
            raise InvalidDataError("El usuario o la empresa no coinciden con el portafolio")

        db.delete(portafolio)
        db.commit()
        return {"message": "Portafolio eliminado exitosamente"}


