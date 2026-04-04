# ml-backend/app/models/portafolio.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.sessions import Base
from app.utils.horaformateada import obtener_hora_formateada

class Portafolio(Base):
    __tablename__ = "Portafolio"
    
    IdPortafolio = Column(Integer, primary_key=True, index=True, autoincrement=True)
    IdUsuario = Column(Integer, ForeignKey("Usuario.IdUsuario"), nullable=False)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"), nullable=False)
    FechaAgregado = Column(DateTime(timezone=True), default=obtener_hora_formateada)
    Activo = Column(Boolean, default=True) 

    # Relaciones (Mantenlas tal cual las tengas)
    usuario = relationship("Usuario", back_populates="portafolios")
    empresa = relationship("Empresa", back_populates="portafolios")