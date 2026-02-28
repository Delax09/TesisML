"""
Esquemas Pydantic para validación de datos.
Define las estructuras de entrada y salida para los endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ========================= SECTOR SCHEMAS =========================

class SectorBase(BaseModel):
    """Esquema base para Sector con campos comunes."""
    NombreSector: str = Field(..., min_length=1, max_length=50, description="Nombre del sector")


class SectorCreate(SectorBase):
    """Esquema para crear un nuevo sector."""
    pass


class SectorUpdate(BaseModel):
    """Esquema para actualizar un sector."""
    NombreSector: Optional[str] = Field(None, min_length=1, max_length=50, description="Nombre del sector")

    model_config = {"from_attributes": True}


class SectorOut(SectorBase):
    """Esquema de salida para un sector."""
    IdSector: int = Field(..., description="ID único del sector")
    NombreSector: str = Field(..., description="Nombre del sector")

    model_config = {"from_attributes": True}


# ========================= EMPRESA SCHEMAS =========================

class EmpresaBase(BaseModel):
    """Esquema base para Empresa con campos comunes."""
    Ticket: str = Field(..., min_length=1, max_length=10, description="Símbolo del ticker de la empresa")
    NombreEmpresa: str = Field(..., min_length=1, max_length=100, description="Nombre de la empresa")
    IdSector: int = Field(..., description="ID del sector")


class EmpresaCreate(EmpresaBase):
    """Esquema para crear una nueva empresa."""
    pass


class EmpresaUpdate(BaseModel):
    """Esquema para actualizar una empresa."""
    Ticket: Optional[str] = Field(None, min_length=1, max_length=10, description="Símbolo del ticker")
    NombreEmpresa: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre de la empresa")
    IdSector: Optional[int] = Field(None, description="ID del sector")

    model_config = {"from_attributes": True}


class EmpresaOut(EmpresaBase):
    """Esquema de salida para una empresa."""
    IdEmpresa: int = Field(..., description="ID único de la empresa")
    NombreEmpresa: str = Field(..., description="Nombre de la empresa")
    FechaAgregado: datetime = Field(..., description="Fecha de creación del registro")

    model_config = {"from_attributes": True}

# ========================= Rol SCHEMAS =========================

class RolBase(BaseModel):
    NombreRol: str = Field(..., min_length=1, max_length=50, description="Nombre del rol")

class RolCreate(RolBase):
    pass

class RolUpdate(BaseModel):
    NombreRol: Optional[str] = Field(None, min_length=1, max_length=50, description="Nombre del rol")

    model_config = {"from_attributes": True}

class RolOut(RolBase):
    IdRol: int = Field(..., description="Id unico de rol")
    NombreRol: str = Field(..., description="Nombre del rol")

    model_config = {"from_attributes": True}

# ========================= USUARIO SCHEMAS =========================
