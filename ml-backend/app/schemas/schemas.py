from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Schema sector 
class SectorBase(BaseModel):
    NombreSector: str

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    NombreSector: Optional[str] = None

    model_config = {"from_attributes": True}

class SectorOut(SectorBase):
    IdSector: int

    model_config = {
        "from_attributes": True
    }

# Schema para mostrar la información de una empresa
class EmpresaBase(BaseModel):
    Ticket: str
    NombreEmpresa: str
    IdSector: int

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaUpdate(BaseModel):
    Ticket: Optional[str] = None
    NombreEmpresa: Optional[str] = None
    IdSector: Optional[int] = None

class EmpresaOut(EmpresaBase):
    IdEmpresa: int 
    FechaAgregado: datetime 

    model_config = {"from_attributes": True}

class EmpresaUpdate(BaseModel):
    Ticket: Optional[str] = None
    NombreEmpresa: Optional[str] = None
    IdSector: Optional[int] = None

    model_config = {"from_attributes": True}