from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Portafolio, Empresa, Usuario
from app.schemas.schemas import PortafolioCreate, PortafolioUpdate
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError
from app.utils.horaformateada import obtener_hora_formateada as HoraFormat

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
    def crear_portafolio(db: Session, portafolio: PortafolioCreate):
        # 1. Validamos que el usuario y la empresa realmente existan en la BD
        PortafolioService._validar_usuario_existe(db, portafolio.IdUsuario)
        PortafolioService._validar_empresa_existe(db, portafolio.IdEmpresa)

        # 2. Buscamos si la relación Usuario-Empresa ya existe (activa o inactiva)
        portafolio_existente = db.query(Portafolio).filter(
            Portafolio.IdUsuario == portafolio.IdUsuario,
            Portafolio.IdEmpresa == portafolio.IdEmpresa
        ).first()

        if portafolio_existente:
            # 3. Si existe pero estaba "eliminada" (Activo = False), la revivimos
            if not portafolio_existente.Activo:
                portafolio_existente.Activo = True
                db.commit()
                db.refresh(portafolio_existente)
                return portafolio_existente
            else:
                # Si ya existe y está activa, lanzamos un error de duplicado
                raise DuplicateResourceError("Esta empresa ya se encuentra en tu portafolio activo.")

        # 4. Si no existe en absoluto, creamos el registro desde cero
        nuevo_portafolio = Portafolio(
            IdUsuario=portafolio.IdUsuario,
            IdEmpresa=portafolio.IdEmpresa,
            Activo=True # Por defecto nace activa
        )
        db.add(nuevo_portafolio)
        db.commit()
        db.refresh(nuevo_portafolio)
        
        return nuevo_portafolio

    @staticmethod
    def obtener_todos_portafolios(db: Session) -> list[Portafolio]:
        # CAMBIO: Agregamos el filtro Activo == True
        return db.query(Portafolio).filter(Portafolio.Activo == True).all()

    @staticmethod
    def obtener_portafolios_usuario(db: Session, usuario_id: int) -> list[Portafolio]:
        return db.query(Portafolio).filter(
            Portafolio.IdUsuario == usuario_id,
            Portafolio.Activo == True
        ).all()

    @staticmethod
    def obtener_portafolio_por_id(db: Session, portafolio_id: int) -> Portafolio:
        # CAMBIO: Aseguramos que solo devuelva si está activo
        portafolio = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id,
            Portafolio.Activo == True
        ).first()
        if not portafolio:
            raise ResourceNotFoundError("Portafolio", portafolio_id)
        return portafolio

    @staticmethod
    def actualizar_portafolio(db: Session, portafolio_id: int, portafolio_data: PortafolioUpdate) -> Portafolio:
        portafolio = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id,
            Portafolio.Activo == True
        ).first()
        
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
    def eliminar_portafolio(db: Session, portafolio_id: int):
        # Buscamos el registro directamente por su ID primario
        portafolio_item = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id
        ).first()

        if not portafolio_item:
            return False

        # BORRADO LÓGICO
        portafolio_item.Activo = False
        db.commit()
        db.refresh(portafolio_item)
        
        return True