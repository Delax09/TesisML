from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Usuario(Base):
    __tablename__ = "Usuario"
    IdUsuario = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String(50), nullable=False)
    Apellido = Column(String(100), nullable=False)
    Email = Column(String(100), unique=True, nullable=False)
    Contraseña = Column(String(255), nullable=False)
    IdRol = Column(Integer, ForeignKey("Rol.IdRol"))

    rol = relationship("Rol", back_populates="usuarios")
    portafolios = relationship("Portafolio", back_populates="usuario")
