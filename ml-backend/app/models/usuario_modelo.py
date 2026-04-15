from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.sessions import Base # O de donde importes 'Base'

class UsuarioModelo(Base):
    __tablename__ = "UsuarioModelo"

    IdUsuario = Column(Integer, ForeignKey("Usuario.IdUsuario", ondelete="CASCADE"), primary_key=True)
    IdModelo = Column(Integer, ForeignKey("ModeloIA.IdModelo", ondelete="CASCADE"), primary_key=True)
    Activo = Column(Boolean, default=True)
    FechaAsignacion = Column(DateTime, default=datetime.utcnow)

    # Relaciones directas (Opcional, útil para cargar datos anidados)
    usuario = relationship("Usuario", back_populates="modelos_asignados")
    modelo = relationship("ModeloIA", back_populates="usuarios_asignados")