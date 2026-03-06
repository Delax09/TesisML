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
    IdSector: int = Field(..., description="ID del sector al que pertenece la empresa")

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

class UsuarioBase(BaseModel):
    Nombre: str =Field(..., min_length=1, max_length = 50, description = "Nombre de usuario")
    Apellido : str = Field(..., min_length = 1, max_length = 100, description = "Apellido de usuario")
    Email : str = Field(..., min_length = 1, max_length=100, description = "Correo electronico del usuario") #Unico
    PasswordU : str = Field(..., min_length=1, max_length=72, description="Password del usuario (máx 72 caracteres)")
    IdRol : int = Field(..., description="Id del rol del usuario")

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioUpdate(BaseModel):
    Email: Optional[str] = Field(None, min_length=1, max_length=100, description="Correo electronico del usuario")
    PasswordU: Optional[str] = Field(None, min_length=1, max_length=72, description="Password del usuario (máx 72 caracteres)")
    IdRol: Optional[int] = Field(None, description="Id del rol del usuario")
    
    model_config = {"from_attributes": True}

class UsuarioOut(BaseModel):
    IdUsuario: int = Field(..., description="Id unico del usuario")
    Nombre: str = Field(..., description="Nombre del usuario")
    Apellido: str = Field(..., description="Apellido del usuario")
    Email: str = Field(..., description="Correo electronico del usuario")
    IdRol: int = Field(..., description="Id del rol del usuario")

    model_config = {"from_attributes": True}

# ========================= Portafolio SCHEMAS =========================

class PortafolioBase(BaseModel):
    FechaCreacion: datetime = Field(..., description = "Fecha de agregado al portafolio")
    IdUsuario: int = Field(..., description = "Id del usuario que agrego la empresa")
    IdEmpresa: int = Field(..., description= "Id de la empresa agregada al portafolio")
    

class PortafolioCreate(PortafolioBase):
    pass

class PortafolioUpdate(BaseModel):
    FechaCreacion: Optional[datetime] = Field(None, description="Fecha de agregado al portafolio")
    IdUsuario: Optional[int] = Field(None, description="Id del usuario que agrego la empresa")
    IdEmpresa: Optional[int] = Field(None, description="Id de la empresa agregada al portafolio")

    model_config = {"from_attributes": True}

class PortafolioOut(BaseModel):
    FechaCreacion: datetime = Field(..., description="Fecha de agregado al portafolio")
    IdUsuario: int = Field(..., description="Id del usuario que agrego la empresa")
    IdEmpresa: int = Field(..., description="Id de la empresa agregada al portafolio")
    IdPortafolio: int = Field(..., description="Id unico del portafolio")

    model_config = {"from_attributes": True}
