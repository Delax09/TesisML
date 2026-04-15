from sqlalchemy import Column, Integer, String, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.db.sessions import Base

class ModeloIA(Base):
    __tablename__ = 'ModeloIA'

    IdModelo = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String(100), nullable=False)
    Version = Column(String(10), nullable=False)
    Descripcion = Column(Text)
    Hiperparametros = Column(JSON)
    Activo = Column(Boolean, default=True)

    resultados = relationship("Resultado", back_populates="modelo_ia")
    usuarios_asignados = relationship("UsuarioModelo", back_populates="modelo", cascade="all, delete-orphan")