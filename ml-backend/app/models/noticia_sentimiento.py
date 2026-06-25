from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Date
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada
from datetime import datetime

class NoticiaSentimiento(Base):
    """
    Tabla para almacenar noticias y su análisis de sentimiento.
    Se actualiza diariamente con noticias de la últimas 7 días.
    """
    __tablename__ = "NoticiaSentimiento"
    
    IdNoticia = Column(Integer, primary_key=True, index=True)
    
    # Información de la noticia
    Titular = Column(String(500), nullable=False)
    Resumen = Column(Text, nullable=True)
    URLNoticia = Column(String(1000), nullable=True)
    URLImagen = Column(String(1000), nullable=True)
    Fuente = Column(String(200), nullable=False)
    
    # Ticker asociado
    Ticker = Column(String(20), nullable=False, index=True)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"), nullable=True)
    
    # Análisis de sentimiento
    PuntuacionSentimiento = Column(Float, nullable=False)  # 0.0 (negativo) a 1.0 (positivo)
    ModeloSentimiento = Column(String(50), default="FinBERT", nullable=False)
    ConfidenciaAnalisis = Column(Float, nullable=True)  # Confianza del modelo (0.0-1.0)
    
    # Fechas
    FechaPublicacionNoticia = Column(DateTime, nullable=False)
    FechaAnalisis = Column(DateTime, default=obtener_hora_formateada, nullable=False)
    FechaRegistro = Column(Date, default=func.current_date, nullable=False, index=True)
    
    # Relaciones
    empresa = relationship("Empresa", back_populates="noticias_sentimiento")
    
    def __repr__(self):
        return (f"<NoticiaSentimiento(Ticker={self.Ticker}, "
                f"Sentimiento={self.PuntuacionSentimiento:.2f}, "
                f"Fecha={self.FechaRegistro})>")
