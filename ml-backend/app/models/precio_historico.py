from sqlalchemy import Column, Integer, Date, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class PrecioHistorico(Base):
    __tablename__ = "PrecioHistorico"
    IdPrecioHistorico = Column(Integer, primary_key=True, index=True)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))
    Fecha = Column(Date, nullable=False)
    PrecioCierre = Column(DECIMAL, nullable=False)

    empresa = relationship("Empresa", back_populates="precios_historicos")
