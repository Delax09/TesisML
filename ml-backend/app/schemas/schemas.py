from pydantic import BaseModel
from typing import Optional

# Schema para mostrar la información de una empresa
class EmpresaOut(BaseModel):
    IdEmpresa: int
    Ticket: str
    NombreEmpresa: str
    IdSector: int

    class Config:
        orm_mode = True # Esto le dice a Pydantic que lea el objeto de SQLAlchemy