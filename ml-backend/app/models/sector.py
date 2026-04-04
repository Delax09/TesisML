from sqlalchemy import Column, Integer, String, DateTime, Boolean, text
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada


class Sector(Base):
    __tablename__ = "Sector"
    IdSector = Column(Integer, primary_key=True, index=True)
    NombreSector = Column(String(50), nullable=False)
    Activo = Column(Boolean, default=True)
    FechaCreacion = Column(DateTime, default=obtener_hora_formateada)

    empresas = relationship("Empresa", back_populates="sector")
