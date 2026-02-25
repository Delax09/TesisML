from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Date, BigInteger, DateTime
from sqlalchemy.orm import relationship
from app.db.sessions import Base 

class Sector(Base):
    __tablename__ = "Sector"
    IdSector = Column(Integer, primary_key=True, index=True)
    NombreSector = Column(String(50), nullable=False)
    
    empresas = relationship("Empresa", back_populates="sector")

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

class Rol(Base):
    __tablename__ = "Rol"
    IdRol = Column(Integer, primary_key=True, index=True)
    NombreRol = Column(String(50), unique=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")

class Usuario(Base):
    __tablename__ = "Usuario"
    IdUsuario = Column(Integer, primary_key=True, index=True)
    NombreUsuario = Column(String(50), unique=True, nullable=False)
    Contraseña = Column(String(255), nullable=False)
    IdRol = Column(Integer, ForeignKey("Rol.IdRol"))
    
    rol = relationship("Rol", back_populates="usuarios")
    portafolios = relationship("Portafolio", back_populates="usuario")

class Portafolio(Base):
    __tablename__ = "Portafolio"
    IdPortafolio = Column(Integer, primary_key=True, index=True)
    NombrePortafolio = Column(String(100), nullable=False)
    IdUsuario = Column(Integer, ForeignKey("Usuario.IdUsuario"))
    
    usuario = relationship("Usuario", back_populates="portafolios")

class PrecioHistorico(Base):
    __tablename__ = "PrecioHistorico"
    IdPrecioHistorico = Column(Integer, primary_key=True, index=True)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))
    Fecha = Column(Date, nullable=False)
    PrecioCierre = Column(DECIMAL, nullable=False)

    empresa = relationship("Empresa", back_populates="precios_historicos")