# Estructura Refactorizada del Proyecto

## Nueva Estructura de Carpetas

```
ml-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Punto de entrada, registra routers
│   ├── exceptions.py              # Excepciones personalizadas
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # Configuración centralizada
│   ├── db/
│   │   ├── __init__.py
│   │   └── sessions.py            # Configuración de BD
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py              # Modelos SQLAlchemy
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py             # Esquemas Pydantic
│   ├── services/                  # NUEVA CARPETA
│   │   ├── __init__.py
│   │   ├── sector_service.py      # Lógica de negocio para Sectores
│   │   └── empresa_service.py     # Lógica de negocio para Empresas
│   └── routers/                   # NUEVA CARPETA
│       ├── __init__.py
│       ├── sectors.py             # Endpoints de Sectores
│       └── empresas.py            # Endpoints de Empresas
├── requirement.txt
├── .env
└── main.py                        # Script para ejecutar la app (opcional)
```

## Cambios Realizados

### 1. **Separación de Responsabilidades**
   - **Routes (Routers)**: Solo manejan las HTTP requests/responses
   - **Services**: Contienen toda la lógica de negocio
   - **Models**: Define las tablas de la BD
   - **Schemas**: Valida los datos de entrada/salida

### 2. **Excepciones Personalizadas** (`app/exceptions.py`)
   - `ResourceNotFoundError`: Cuando un recurso no existe
   - `DuplicateResourceError`: Cuando se intenta crear datos duplicados
   - `InvalidDataError`: Para datos inválidos

### 3. **Servicios** (`app/services/`)
   - **SectorService**: Gestiona todas las operaciones de Sector
   - **EmpresaService**: Gestiona todas las operaciones de Empresa
   - Contienen validaciones centralizadas
   - Fáciles de testear

### 4. **Routers** (`app/routers/`)
   - **sectors.py**: Endpoints `/api/v1/sectores`
   - **empresas.py**: Endpoints `/api/v1/empresas`
   - Manejan errores y convierten excepciones a HTTP responses
   - Código limpio y legible

### 5. **Main.py** (Refactorizado)
   - Solo tiene configuración de la app
   - Registra los routers
   - Configura CORS
   - Health check endpoint

### 6. **Schemas** (Mejorados)
   - Eliminada duplicación de `EmpresaUpdate`
   - Agregados descriptores en Fields
   - Validaciones de longitud

## Ventajas de esta Refactorización

✅ **Escalabilidad**: Fácil agregar nuevos endpoints y servicios
✅ **Mantenibilidad**: Código organizado y separado por responsabilidad
✅ **Testabilidad**: Servicios fáciles de testear sin Dependencies
✅ **Reutilización**: Servicios pueden usarse en múltiples routers
✅ **Consistencia**: Manejo centralizado de errores
✅ **Documentación**: Código autodocumentado con docstrings

## Próximos Pasos Recomendados

1. **Agregar más Servicios**
   - `ResultadoService` para predicciones
   - `UsuarioService` para autenticación
   - `PortafolioService` para gestión de portafolios

2. **Agregar Routers**
   - `routers/resultados.py`
   - `routers/usuarios.py`
   - `routers/portafolios.py`

3. **Agregar Capas Adicionales**
   - Agregar logging centralizado
   - Implementar autenticación JWT
   - Agregar validación más robusta

4. **Testing**
   - Crear archivo `requirements-dev.txt` con pytest
   - Crear carpeta `tests/` con tests unitarios

5. **Documentación**
   - Actualizar README.md
   - Agregar swagger automático (está incluido en FastAPI)
   - Documentar variables de entorno

## Cómo Usar la Nueva Estructura

### Crear un nuevo servicio:
```python
# app/services/nuevo_service.py
class NuevoService:
    @staticmethod
    def crear_recurso(db: Session, data: SchemaCreate):
        # lógica aquí
        pass
```

### Crear un nuevo router:
```python
# app/routers/nuevo.py
from fastapi import APIRouter
from app.services import NuevoService

router = APIRouter(prefix="/api/v1/nuevo", tags=["Nuevo"])

@router.post("", response_model=SchemaOut)
def crear(data: SchemaCreate, db: Session = Depends(get_db)):
    try:
        return NuevoService.crear_recurso(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Registrar el router en main.py:
```python
from app.routers import nuevo_router
app.include_router(nuevo_router)
```
