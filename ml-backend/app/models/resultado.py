from sqlalchemy import Column, Integer, DECIMAL, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Resultado(Base):
    __tablename__ = "Resultado"
    IdResultado = Column(Integer, primary_key=True, index=True)
    PrecioActual = Column(DECIMAL, nullable=False)
    PrediccionIA = Column(DECIMAL, nullable=False)
    VariacionPCT = Column(DECIMAL, nullable=False)
    RSI = Column(DECIMAL, nullable=False)
    Score = Column(DECIMAL, nullable=False)
    Recomendacion = Column(String(50))
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))
    FechaAnalisis = Column(DateTime)

    empresa = relationship("Empresa", back_populates="resultados")
