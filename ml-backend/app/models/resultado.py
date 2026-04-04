from sqlalchemy import Column, Integer, DECIMAL, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.sessions import Base
from sqlalchemy.sql import func
from app.utils.horaformateada import obtener_hora_formateada

class Resultado(Base):
    __tablename__ = "Resultado"
    IdResultado = Column(Integer, primary_key=True, index=True)
    PrecioActual = Column(DECIMAL, nullable=False)
    PrediccionIA = Column(DECIMAL, nullable=False)
    VariacionPCT = Column(DECIMAL, nullable=False)
    RSI = Column(DECIMAL, nullable=False)
    Score = Column(DECIMAL, nullable=False)
    MACD = Column(DECIMAL, nullable=False)
    ATR = Column(DECIMAL, nullable=False)
    EMA20 = Column(DECIMAL, nullable=False)
    EMA50 = Column(DECIMAL, nullable=False)
    Recomendacion = Column(String(50))
    ProbAlcista = Column(DECIMAL, nullable= True)
    FechaAnalisis = Column(DateTime, default=obtener_hora_formateada)

    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))
    IdModelo = Column(Integer, ForeignKey("ModeloIA.IdModelo"))

    empresa = relationship("Empresa", back_populates="resultados")
    modelo_ia = relationship("ModeloIA", back_populates="resultados")
