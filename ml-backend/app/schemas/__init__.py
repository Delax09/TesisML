"""
Módulo de esquemas Pydantic.
Define las estructuras de validación de datos.
"""

from app.schemas.schemas import (
    SectorBase, SectorCreate, SectorUpdate, SectorOut,
    EmpresaBase, EmpresaCreate, EmpresaUpdate, EmpresaOut
)

__all__ = [
    "SectorBase", "SectorCreate", "SectorUpdate", "SectorOut",
    "EmpresaBase", "EmpresaCreate", "EmpresaUpdate", "EmpresaOut"
]
