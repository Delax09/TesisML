"""
Ejemplos de uso de la API refactorizada.
Estos son ejemplos de cómo usar los endpoints.
"""

# ====================== EJEMPLOS DE SECTORES ======================

# 1. Crear un sector
POST /api/v1/sectores
{
  "NombreSector": "Tecnología"
}

# Response:
{
  "IdSector": 1,
  "NombreSector": "Tecnología"
}


# 2. Obtener todos los sectores
GET /api/v1/sectores

# Response:
[
  {
    "IdSector": 1,
    "NombreSector": "Tecnología"
  },
  {
    "IdSector": 2,
    "NombreSector": "Financiero"
  }
]


# 3. Obtener un sector por ID
GET /api/v1/sectores/1

# Response:
{
  "IdSector": 1,
  "NombreSector": "Tecnología"
}


# 4. Actualizar un sector
PUT /api/v1/sectores/1
{
  "NombreSector": "Tecnología e Innovación"
}

# Response:
{
  "IdSector": 1,
  "NombreSector": "Tecnología e Innovación"
}


# 5. Obtener empresas de un sector
GET /api/v1/sectores/1/empresas

# Response:
[
  {
    "IdEmpresa": 1,
    "Ticket": "APPLE",
    "NombreEmpresa": "Apple Inc.",
    "IdSector": 1,
    "FechaAgregado": "2024-01-15T10:30:00"
  }
]


# 6. Eliminar un sector
DELETE /api/v1/sectores/1

# Response:
{
  "message": "Sector 1 eliminado correctamente"
}


# ====================== EJEMPLOS DE EMPRESAS ======================

# 1. Crear una empresa
POST /api/v1/empresas
{
  "Ticket": "AAPL",
  "NombreEmpresa": "Apple Inc.",
  "IdSector": 1
}

# Response:
{
  "IdEmpresa": 1,
  "Ticket": "AAPL",
  "NombreEmpresa": "Apple Inc.",
  "IdSector": 1,
  "FechaAgregado": "2024-01-15T10:30:00"
}


# 2. Obtener todas las empresas
GET /api/v1/empresas

# Response:
[
  {
    "IdEmpresa": 1,
    "Ticket": "AAPL",
    "NombreEmpresa": "Apple Inc.",
    "IdSector": 1,
    "FechaAgregado": "2024-01-15T10:30:00"
  },
  {
    "IdEmpresa": 2,
    "Ticket": "MSFT",
    "NombreEmpresa": "Microsoft Corporation",
    "IdSector": 1,
    "FechaAgregado": "2024-01-15T10:35:00"
  }
]


# 3. Obtener una empresa por ID
GET /api/v1/empresas/1

# Response:
{
  "IdEmpresa": 1,
  "Ticket": "AAPL",
  "NombreEmpresa": "Apple Inc.",
  "IdSector": 1,
  "FechaAgregado": "2024-01-15T10:30:00"
}


# 4. Actualizar una empresa
PUT /api/v1/empresas/1
{
  "NombreEmpresa": "Apple Computer Inc.",
  "IdSector": 1
}

# Response:
{
  "IdEmpresa": 1,
  "Ticket": "AAPL",
  "NombreEmpresa": "Apple Computer Inc.",
  "IdSector": 1,
  "FechaAgregado": "2024-01-15T10:30:00"
}


# 5. Eliminar una empresa
DELETE /api/v1/empresas/1

# Response:
{
  "message": "Empresa AAPL eliminada correctamente"
}


# ====================== CÓDIGOS DE ERROR ======================

# 404 - Recurso no encontrado
{
  "detail": "Sector con ID 999 no encontrado"
}

# 400 - Duplicado
{
  "detail": "Ticket 'AAPL' ya existe para Empresa"
}

# 400 - Datos inválidos
{
  "detail": "El sector especificado no existe"
}
