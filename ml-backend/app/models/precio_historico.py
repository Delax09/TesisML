from sqlalchemy import Column, Integer, DECIMAL, ForeignKey, Date, BigInteger, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada

class PrecioHistorico(Base):
    __tablename__ = "PrecioHistorico"
    
    IdPrecioHistorico = Column(Integer, primary_key=True, index=True)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"), nullable=False)
    Fecha = Column(Date, nullable=False)
    PrecioCierre = Column(DECIMAL(18, 4), nullable=False)
    Volumen = Column(BigInteger, nullable=False)
    FechaRegistro = Column(DateTime, default=obtener_hora_formateada)

    SMA_20 = Column(DECIMAL(18,4), nullable=True)
    Banda_Superior = Column(DECIMAL(18,4), nullable = True)
    Banda_Inferior = Column(DECIMAL(18,4), nullable = True)

    # Relación inversa con Empresa
    empresa = relationship("Empresa", back_populates="precios_historicos")
