from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada


class Empresa(Base):
    __tablename__ = "Empresa"
    IdEmpresa = Column(Integer, primary_key=True, index=True)
    Ticket = Column(String(50), unique=True, nullable=False)
    NombreEmpresa = Column(String(100), nullable=False)
    IdSector = Column(Integer, ForeignKey("Sector.IdSector"))
    FechaAgregado = Column(DateTime, default=obtener_hora_formateada)

    Activo = Column(Boolean, default = True)
    FechaActualizacion = Column(DateTime, default=obtener_hora_formateada)

    sector = relationship("Sector", back_populates="empresas")
    resultados = relationship("Resultado", back_populates="empresa")
    precios_historicos = relationship("PrecioHistorico", back_populates="empresa")
    portafolios = relationship("Portafolio", back_populates="empresa")
