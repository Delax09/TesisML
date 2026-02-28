from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Rol(Base):
    __tablename__ = "Rol"
    IdRol = Column(Integer, primary_key=True, index=True)
    NombreRol = Column(String(50), unique=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")
