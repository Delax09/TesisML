from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Portafolio(Base):
    __tablename__ = "Portafolio"
    IdPortafolio = Column(Integer, primary_key=True, index=True)
    FechaAgregado = Column(String, nullable=False) 
    IdUsuario = Column(Integer, ForeignKey("Usuario.IdUsuario"))
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))

    usuario = relationship("Usuario", back_populates="portafolios")
    empresa = relationship("Empresa", back_populates="portafolios")
