from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Portafolio(Base):
    __tablename__ = "Portafolio"
    IdPortafolio = Column(Integer, primary_key=True, index=True)
    NombrePortafolio = Column(String(100), nullable=False)
    IdUsuario = Column(Integer, ForeignKey("Usuario.IdUsuario"))

    usuario = relationship("Usuario", back_populates="portafolios")
