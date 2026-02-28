from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Empresa(Base):
    __tablename__ = "Empresa"
    IdEmpresa = Column(Integer, primary_key=True, index=True)
    Ticket = Column(String(10), unique=True, nullable=False)
    NombreEmpresa = Column(String(100), nullable=False)
    IdSector = Column(Integer, ForeignKey("Sector.IdSector"))
    FechaAgregado = Column(DateTime)

    sector = relationship("Sector", back_populates="empresas")
    resultados = relationship("Resultado", back_populates="empresa")
    precios_historicos = relationship("PrecioHistorico", back_populates="empresa")
