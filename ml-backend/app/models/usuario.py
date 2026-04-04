from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, text
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada


class Usuario(Base):
    __tablename__ = "Usuario"
    IdUsuario = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String(50), nullable=False)
    Apellido = Column(String(100), nullable=False)
    Email = Column(String(100), unique=True, nullable=False)
    PasswordU = Column(String(255), nullable=False)
    IdRol = Column(Integer, ForeignKey("Rol.IdRol"))

    Activo = Column(Boolean, default=True)
    FechaCreacion = Column(DateTime, default=obtener_hora_formateada)
    rol = relationship("Rol", back_populates="usuarios")
    portafolios = relationship("Portafolio", back_populates="usuario")
