from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.sessions import Base


class Sector(Base):
    __tablename__ = "Sector"
    IdSector = Column(Integer, primary_key=True, index=True)
    NombreSector = Column(String(50), nullable=False)

    empresas = relationship("Empresa", back_populates="sector")
