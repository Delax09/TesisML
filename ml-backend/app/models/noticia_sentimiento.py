from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.db.sessions import Base

class NoticiaSentimiento(Base):
    """
    Tabla para almacenar noticias y su análisis de sentimiento.
    Ajustada a la estructura actual de la base de datos.
    """
    __tablename__ = "NoticiaSentimiento"
    
    IdNoticia = Column(Integer, primary_key=True, index=True)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"), nullable=False)
    FechaPublicacion = Column(DateTime, nullable=False)
    Titular = Column(String(500), nullable=False)
    Contenido = Column(Text, nullable=True)
    Sentimiento = Column(Float, nullable=True)
    Etiqueta = Column(String(50), nullable=True)
    UrlFuente = Column(String(1000), nullable=True)

    empresa = relationship("Empresa", back_populates="noticias_sentimiento")

    def __repr__(self):
        return (f"<NoticiaSentimiento(IdEmpresa={self.IdEmpresa}, "
                f"Sentimiento={self.Sentimiento}, "
                f"FechaPublicacion={self.FechaPublicacion})>")
