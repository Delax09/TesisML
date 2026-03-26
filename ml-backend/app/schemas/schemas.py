"""
Esquemas Pydantic para validación de datos.
Define las estructuras de entrada y salida para los endpoints.
"""

from decimal import Decimal
from pydantic import Field, computed_field, ConfigDict, BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict, Any

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
    Activo: Optional[bool] = Field(None, description="Indica si el sector está activo o no")

    model_config = {"from_attributes": True}

class SectorSimple(BaseModel):
    NombreSector: str
    model_config = ConfigDict(from_attributes=True)

class SectorOut(SectorBase):
    """Esquema de salida para un sector."""
    IdSector: int = Field(..., description="ID único del sector")
    NombreSector: str = Field(..., description="Nombre del sector")
    Activo: bool = Field(..., description="Indica si el sector esta activo")

    model_config = {"from_attributes": True}


# ========================= EMPRESA SCHEMAS =========================

class EmpresaBase(BaseModel):
    """Esquema base para Empresa con campos comunes."""
    Ticket: str = Field(..., min_length=1, max_length=50, description="Símbolo del ticker de la empresa")
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
    Activo: Optional[bool] = Field(None, description = "Indica si la empresa esta activa")

    model_config = {"from_attributes": True}


class EmpresaOut(EmpresaBase):
    """Esquema de salida para una empresa."""
    IdEmpresa: int = Field(..., description="ID único de la empresa")
    NombreEmpresa: str = Field(..., description="Nombre de la empresa")
    FechaAgregado: datetime = Field(..., description="Fecha de creación del registro")
    IdSector: int = Field(..., description="ID del sector al que pertenece la empresa")
    sector: Optional[SectorSimple] = Field(None, exclude=True)

    @computed_field
    @property
    def NombreSector(self) -> Optional[str]:
        return self.sector.NombreSector if self.sector else None

    model_config = ConfigDict(from_attributes=True)
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
    Nombre: Optional[str] = None
    Apellido: Optional[str] = None
    Email: Optional[str] = None
    PasswordU: Optional[str] = Field(None, min_length=8, alias="PasswordU")
    IdRol: Optional[int] = None
    Activo: Optional[bool] = None

class UsuarioOut(UsuarioBase):
    IdUsuario: int
    Activo: Optional[bool]
    FechaCreacion: Optional[datetime]
    
    rol: Optional[RolOut] = None

    model_config = {"from_attributes": True}
# ========================= Portafolio SCHEMAS =========================

class PortafolioBase(BaseModel):
    FechaAgregado: datetime = Field(..., description = "Fecha de agregado al portafolio")
    IdUsuario: int = Field(..., description = "Id del usuario que agrego la empresa")
    IdEmpresa: int = Field(..., description= "Id de la empresa agregada al portafolio")
    

class PortafolioCreate(PortafolioBase):
    pass

class PortafolioUpdate(BaseModel):
    FechaAgregado: Optional[datetime] = Field(None, description="Fecha de agregado al portafolio")
    IdUsuario: Optional[int] = Field(None, description="Id del usuario que agrego la empresa")
    IdEmpresa: Optional[int] = Field(None, description="Id de la empresa agregada al portafolio")
    Activo: Optional[bool] = None

    model_config = {"from_attributes": True}

class PortafolioOut(BaseModel):
    FechaAgregado: datetime = Field(..., description="Fecha de agregado al portafolio")
    IdUsuario: int = Field(..., description="Id del usuario que agrego la empresa")
    IdEmpresa: int = Field(..., description="Id de la empresa agregada al portafolio")
    IdPortafolio: int = Field(..., description="Id unico del portafolio")
    Activo: bool

    model_config = {"from_attributes": True}


# ========================= PRECIO HISTORICO SCHEMAS =========================

class PrecioHistoricoBase(BaseModel):
    Fecha: datetime = Field(..., description = "Fecha del precio historico")
    PrecioCierre: Decimal = Field(..., description= "Precio de cierre de la empresa")
    Volumen: int = Field(..., description= "Volumen de transaccion")

class PrecioHistoricoCreate(PrecioHistoricoBase):
    pass


class PrecioHistoricoOut(BaseModel):
    IdPrecioHistorico: int = Field(..., description="Id unico del precio historico")
    IdEmpresa: int = Field(..., description="Id de la empresa a la que pertenece el precio historico")
    PrecioCierre: Decimal = Field(..., description="Precio de cierre de mercado")
    Fecha: datetime = Field(..., description="Fecha del precio historico")

# # ========================= RESULTADO SCHEMAS =========================

class ResultadoBase(BaseModel):
    PrecioActual: Decimal = Field(..., description = "Precio actual de la accion al momento del analisis")
    PrediccionIA: Decimal = Field(..., descripton="Precio predicho por el modelo")
    VariacionPCT: Decimal = Field(..., description= "Variacion porcentual esperada")
    RSI: Decimal = Field(..., description = "Relativa Strngth Index") #Indice de Fuerza Relativa
    Score: Decimal = Field(..., description="Puntuacion general del analisis")
    MACD: Decimal = None
    ATR: Decimal = None
    EMA20: Decimal = None
    EMA50: Decimal = None
    Recomendacion: str = Field(..., max_length=50, description="Recomendacion basada en el analisis")
    IdEmpresa: int = Field(..., description="Id de la empresa a la que pertence la prediccion")
    FechaAnalisis: Optional[datetime] = Field(None, description="fecha del analisis")
    IdModeloIA: int = Field(..., description = "Id del modelo a que pertenece el resultado")

class ResultadoCreate(ResultadoBase):
    pass

class ResultadoOut(BaseModel):
    IdResultado: int = Field(..., description="Id del resultado")
    PrecioActual: Decimal = Field(...,description="Precio actual")
    PrediccionIA: Decimal = Field(..., description="Precio predicho por la IA")
    RSI: Decimal = Field(..., description="Relative Strength Index")
    Score: Decimal = Field(..., description="Puntuacion general del analisis")
    Recomendacion: str = Field(..., description="Recomendacion")
    IdEmpresa: int = Field(..., description="Id de la empresa a la que pertence")
    FechaAnalisis: Optional[datetime] = Field(..., description="Fecha del analisis")
    IdModeloIA: int = Field(..., description="Modelo Ejecutado")

    model_config = {"from_attributes": True}

class ModeloIABase(BaseModel):
    Nombre: str = Field(..., description="Nombre del modelo")
    Version: str = Field(..., description="Version del modelo")
    Descripcion: str = Field(..., description="Descripcion breve del modelo")
    Hiperparametros: Optional[Dict]= Field(..., description="Configuracion del modelo")
    Activo: bool = Field(..., description="Modelo activo")

class ModeloIACreate(ModeloIABase):
    pass

class ModeloIAOut(BaseModel):
    IdModelo: int = Field(..., description="Id único del modelo") # <--- AGREGAR ESTA LÍNEA
    Nombre: str = Field(..., description="Nombre del modelo")
    Version: str = Field(..., description="Version del modelo")
    Descripcion: str = Field(..., description="Descripcion breve del modelo")
    Hiperparametros: dict = Field(..., description="Configuracion del modelo")

    model_config = {"from_attributes": True}

#Autenticacion 
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id_usuario: Optional[int] = None
    email: Optional[str] = None