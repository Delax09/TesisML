```
╔════════════════════════════════════════════════════════════════════════║
║                     🎯 GUÍA DE MANTENIMIENTO                          ║
║              Cómo Mantener la Arquitectura Refactorizada              ║
╚════════════════════════════════════════════════════════════════════════╝
```

# 📋 Guía de Mantenimiento del Proyecto Refactorizado

---

## 🚀 Cómo Agregar Nuevas Funcionalidades

### Resumen Rápido
```
1. Crear Model        (models.py)
2. Crear Schema       (schemas.py)
3. Crear Service      (services/nuevo_service.py)
4. Crear Router       (routers/nuevo.py)
5. Registrar todo     (main.py, __init__.py)
```

### Paso a Paso Detallado

#### 1️⃣ CREAR EL MODELO

Archivo: `app/models/models.py`

```python
class Resultado(Base):
    __tablename__ = "Resultado"
    IdResultado = Column(Integer, primary_key=True, index=True)
    PrecioActual = Column(DECIMAL, nullable=False)
    PrediccionIA = Column(DECIMAL, nullable=False)
    IdEmpresa = Column(Integer, ForeignKey("Empresa.IdEmpresa"))
    
    empresa = relationship("Empresa", back_populates="resultados")
```

#### 2️⃣ CREAR LOS ESQUEMAS

Archivo: `app/schemas/schemas.py`

```python
class ResultadoBase(BaseModel):
    PrecioActual: float
    PrediccionIA: float
    IdEmpresa: int

class ResultadoCreate(ResultadoBase):
    pass

class ResultadoUpdate(BaseModel):
    PrecioActual: Optional[float] = None
    PrediccionIA: Optional[float] = None

class ResultadoOut(ResultadoBase):
    IdResultado: int
    model_config = {"from_attributes": True}
```

#### 3️⃣ CREAR EL SERVICIO

Archivo: `app/services/resultado_service.py`

```python
from sqlalchemy.orm import Session
from app.models.models import Resultado, Empresa
from app.schemas.schemas import ResultadoCreate, ResultadoUpdate
from app.exceptions import ResourceNotFoundError, InvalidDataError

class ResultadoService:
    @staticmethod
    def crear_resultado(db: Session, resultado_data: ResultadoCreate) -> Resultado:
        """Crea un nuevo resultado."""
        # Validar que empresa existe
        empresa = db.query(Empresa).filter(
            Empresa.IdEmpresa == resultado_data.IdEmpresa
        ).first()
        if not empresa:
            raise InvalidDataError("La empresa no existe")
        
        nuevo_resultado = Resultado(**resultado_data.dict())
        db.add(nuevo_resultado)
        db.commit()
        db.refresh(nuevo_resultado)
        return nuevo_resultado
    
    @staticmethod
    def obtener_todos(db: Session) -> list[Resultado]:
        return db.query(Resultado).all()
    
    @staticmethod
    def obtener_por_id(db: Session, resultado_id: int) -> Resultado:
        resultado = db.query(Resultado).filter(
            Resultado.IdResultado == resultado_id
        ).first()
        if not resultado:
            raise ResourceNotFoundError("Resultado", resultado_id)
        return resultado
```

#### 4️⃣ CREAR EL ROUTER

Archivo: `app/routers/resultados.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
from app.schemas.schemas import ResultadoCreate, ResultadoOut
from app.services.resultado_service import ResultadoService
from app.exceptions import ResourceNotFoundError, InvalidDataError

router = APIRouter(prefix="/api/v1/resultados", tags=["Resultados"])

@router.post("", response_model=ResultadoOut, status_code=201)
def crear_resultado(resultado: ResultadoCreate, db: Session = Depends(get_db)):
    try:
        return ResultadoService.crear_resultado(db, resultado)
    except InvalidDataError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=list[ResultadoOut])
def obtener_resultados(db: Session = Depends(get_db)):
    return ResultadoService.obtener_todos(db)

@router.get("/{resultado_id}", response_model=ResultadoOut)
def obtener_resultado(resultado_id: int, db: Session = Depends(get_db)):
    try:
        return ResultadoService.obtener_por_id(db, resultado_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
```

#### 5️⃣ REGISTRAR EN PAQUETES

Archivo: `app/services/__init__.py`

```python
from app.services.sector_service import SectorService
from app.services.empresa_service import EmpresaService
from app.services.resultado_service import ResultadoService  # ← NUEVO

__all__ = ["SectorService", "EmpresaService", "ResultadoService"]
```

Archivo: `app/routers/__init__.py`

```python
from app.routers.sectors import router as sectors_router
from app.routers.empresas import router as empresas_router
from app.routers.resultados import router as resultados_router  # ← NUEVO

__all__ = ["sectors_router", "empresas_router", "resultados_router"]
```

#### 6️⃣ REGISTRAR EN MAIN.PY

Archivo: `app/main.py`

```python
from app.routers import sectors_router, empresas_router, resultados_router

# Registrar routers
app.include_router(sectors_router)
app.include_router(empresas_router)
app.include_router(resultados_router)  # ← NUEVO
```

---

## 📝 Convenciones a Seguir

### Nombres de Archivos
```
✅ sector_service.py       (snake_case)
✅ resultado_service.py    (snake_case)
✅ EmpresaService          (PascalCase para clases)
❌ SectorService.py        (No mezclar)
```

### Nombres de Clases
```
✅ class SectorService      (PascalCase)
✅ class ResultadoService   (PascalCase)
✅ class InvalidDataError   (PascalCase)
❌ class sector_service     (snake_case)
```

### Nombres de Métodos
```
✅ def crear_sector         (snake_case)
✅ def obtener_por_id       (snake_case)
✅ def actualizar_sector    (snake_case)
❌ def crearSector          (camelCase)
```

### Estructura de Rutas
```
✅ /api/v1/sectores        (plural, lowercase)
✅ /api/v1/sectores/{id}   (con ID)
✅ /api/v1/sectores/{id}/empresas  (sub-recursos)
❌ /api/v1/sector          (singular)
❌ /api/v1/Sectores        (PascalCase)
```

---

## 🧪 Cómo Testear

### Estructura de Tests Recomendada

```
ml-backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Configuración común
│   ├── test_services/
│   │   ├── test_sector_service.py
│   │   └── test_empresa_service.py
│   ├── test_routers/
│   │   ├── test_sectors_router.py
│   │   └── test_empresas_router.py
│   └── test_models.py
```

### Ejemplo de Test Unitario

```python
# tests/test_services/test_sector_service.py
import pytest
from app.services.sector_service import SectorService
from app.schemas.schemas import SectorCreate
from app.exceptions import ResourceNotFoundError

def test_crear_sector(db_session):
    """Testa creación de un sector."""
    datos = SectorCreate(NombreSector="Tecnología")
    sector = SectorService.crear_sector(db_session, datos)
    
    assert sector.NombreSector == "Tecnología"
    assert sector.IdSector is not None

def test_obtener_sector_no_existe(db_session):
    """Testa error cuando sector no existe."""
    with pytest.raises(ResourceNotFoundError):
        SectorService.obtener_sector_por_id(db_session, 999)
```

---

## 🐛 Debugging

### Pasos para Debuguear

1. **Verificar la excepción exacta**
```python
# Agregar más detalles
try:
    resultado = SectorService.obtener_sector_por_id(db, sector_id)
except ResourceNotFoundError as e:
    print(f"ERROR DETECTADO: {e.message}")  # Debug
    raise
```

2. **Revisar logs**
```bash
# Con logging configurado
python -m uvicorn app.main:app --reload --log-level DEBUG
```

3. **Inspeccionar datos en BD**
```python
# En el router para debug
@router.get("/debug/{sector_id}")
def debug_sector(sector_id: int, db: Session = Depends(get_db)):
    sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    return {
        "encontrado": sector is not None,
        "sector": sector,
        "datos_raw": str(sector.__dict__) if sector else None
    }
```

---

## 📦 Dependencias Recomendadas

### requirements-dev.txt

```
# Testing
pytest==7.4.0
pytest-cov==4.1.0
pytest-asyncio==0.21.0

# Linting
pylint==2.17.0
black==23.7.0
isort==5.12.0

# Documentación
mkdocs==1.4.3
mkdocs-material==9.1.0

# Debug
ipdb==0.13.13
```

---

## 🔐 Seguridad

### Checklist de Seguridad

- [ ] Validar todas las entradas
- [ ] Sanitizar datos antes de usar en SQL
- [ ] Usar parametrized queries (SQLAlchemy lo hace)
- [ ] No exponer errores internos al cliente
- [ ] Validar autenticación en todos los endpoints
- [ ] Usar HTTPS en producción
- [ ] Configurar CORS adecuadamente
- [ ] Validar autorización (admin, usuario, etc)

### Ejemplo de Validación Segura

```python
# ❌ INSEGURO
def get_sector(sector_id: str):
    query = f"SELECT * FROM Sector WHERE IdSector = {sector_id}"
    # SQL Injection!!!

# ✅ SEGURO (SQLAlchemy)
def get_sector(db: Session, sector_id: int):
    sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    # SQLAlchemy previene SQL injection
```

---

## 📊 Monitoreo

### Métricas Importantes

```
1. Tiempo de respuesta promedio
2. Tasa de errores (5xx, 4xx)
3. Número de requests por segundo
4. Uso de memoria
5. Conexiones a base de datos
```

### Logging Recomendado

```python
import logging

logger = logging.getLogger(__name__)

@staticmethod
def crear_sector(db: Session, sector_data: SectorCreate):
    logger.info(f"Creando sector: {sector_data.NombreSector}")
    try:
        nuevo_sector = Sector(NombreSector=sector_data.NombreSector)
        db.add(nuevo_sector)
        db.commit()
        logger.info(f"Sector creado con ID: {nuevo_sector.IdSector}")
        return nuevo_sector
    except Exception as e:
        logger.error(f"Error al crear sector: {str(e)}")
        raise
```

---

## 🔄 Control de Versiones

### .gitignore Recomendado

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp

# Entorno
.env
.env.local
.env.*.local

# Cache
.pytest_cache/
.coverage
htmlcov/

# Base de datos
*.db
*.sqlite

# Logs
*.log
```

---

## 📈 Mejoras Futuras

### Corto Plazo (1-2 semanas)

- [ ] Agregar autenticación JWT
- [ ] Agregar tests unitarios
- [ ] Agregar CI/CD con GitHub Actions
- [ ] Agregar logging centralizado

### Mediano Plazo (1 mes)

- [ ] Implementar cache Redis
- [ ] Agregar rate limiting
- [ ] Documentación automática de API
- [ ] Tests de carga

### Largo Plazo (2+ meses)

- [ ] Microservicios
- [ ] Event sourcing
- [ ] CQRS pattern
- [ ] GraphQL API

---

## ✅ Checklist de Calidad

Antes de hacer commit:

- [ ] ✅ Sin errores de sintaxis
- [ ] ✅ Código formateado (black/isort)
- [ ] ✅ Sin warnings (pylint)
- [ ] ✅ Tests pasan
- [ ] ✅ Documentación actualizada
- [ ] ✅ Commits con mensajes claros

---

## 📞 Preguntas Frecuentes

### P: ¿Dónde agregar lógica de ML?
**R:** En `app/services/`, en métodos específicos llamados desde los routers.

### P: ¿Cómo manejar transacciones?
**R:** Usa `db.commit()` y `db.rollback()` en los servicios.

### P: ¿Cómo testear sin BD?
**R:** Usa fixtures con SQLite en memoria para tests.

### P: ¿Cómo optimizar queries?
**R:** Usa `.options(selectinload())` en SQLAlchemy para eager loading.

### P: ¿Cómo agregar paginación?
**R:** En los servicios, agregar parámetros `skip` y `limit`.

---

## 🎓 Recursos Útiles

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/14/orm/)
- [Pydantic Validation](https://docs.pydantic.dev/)
- [Testing with Pytest](https://docs.pytest.org/)

---

**Mantén la arquitectura limpia y escalable** 🚀
