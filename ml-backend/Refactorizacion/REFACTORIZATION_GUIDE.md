# 📋 Guía de Refactorización del Backend - Arquitectura Profesional

## 📌 Objetivo
Reorganizar el backend de FastAPI con una **arquitectura limpia y escalable** basada en Domain-Driven Design (DDD), facilitando mantenibilidad, testabilidad y escalabilidad.

---

## 🏗️ Nueva Estructura Propuesta

```
ml-backend/
│
├── app/
│   ├── core/                          # Configuración y utilidades globales
│   │   ├── __init__.py
│   │   ├── config.py                  # (MOVER de app/core/config.py) - Settings y validación
│   │   ├── settings.py                # (NUEVO) - Pydantic BaseSettings mejorado
│   │   ├── logger.py                  # (NUEVO) - Logging centralizado
│   │   ├── exceptions.py              # (MOVER de app/exceptions.py) - Excepciones globales
│   │   ├── limiter.py                 # (MOVER de app/core/limiter.py) - Rate limiting
│   │   └── security.py                # (NUEVO) - Funciones de seguridad
│   │
│   ├── features/                      # 🎯 Dominio de negocio por feature
│   │   ├── __init__.py
│   │   │
│   │   ├── auth/                      # Autenticación
│   │   │   ├── __init__.py
│   │   │   ├── models.py              # Modelos SQLAlchemy
│   │   │   ├── schemas.py             # Pydantic schemas
│   │   │   ├── router.py              # Rutas FastAPI
│   │   │   ├── service.py             # Lógica de negocio
│   │   │   └── dependencies.py        # Dependencias de esta feature
│   │   │
│   │   ├── usuarios/                  # Gestión de usuarios
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── empresas/                  # Gestión de empresas
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── portafolios/               # Portfolios de inversión
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── precios/                   # Precios históricos
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── resultados/                # Resultados de operaciones
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── metricas/                  # Métricas e indicadores
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── noticias/                  # Noticias financieras
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── roles/                     # Gestión de roles
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── sectores/                  # Sectores económicos
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── admin/                     # Panel administrativo
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── ia/                        # Inteligencia Artificial
│   │   │   ├── __init__.py
│   │   │   ├── models.py              # Modelos DB para IA
│   │   │   ├── schemas.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── dependencies.py
│   │   │
│   │   └── contacto/                  # Formularios de contacto
│   │       ├── __init__.py
│   │       ├── schemas.py
│   │       ├── router.py
│   │       └── service.py
│   │
│   ├── shared/                        # Código compartido
│   │   ├── __init__.py
│   │   ├── dependencies.py            # Dependencias globales (DB session, auth, etc)
│   │   ├── utils.py                   # Funciones utilitarias
│   │   ├── validators.py              # Validadores reutilizables
│   │   ├── constants.py               # (NUEVO) - Constantes globales
│   │   └── enums.py                   # (NUEVO) - Enumeraciones
│   │
│   ├── db/                            # Capa de base de datos
│   │   ├── __init__.py
│   │   ├── base.py                    # (NUEVO) - Base model para SQLAlchemy
│   │   ├── sessions.py                # (MOVER de app/db/sessions.py)
│   │   └── migrations/                # (FUTURO) - Alembic migrations
│   │
│   ├── ml/                            # Modelos de Inteligencia Artificial
│   │   ├── __init__.py
│   │   ├── models/                    # Modelos entrenados
│   │   │   ├── __init__.py
│   │   │   ├── loader.py              # Cargador de modelos
│   │   │   └── predictor.py           # Predictor genérico
│   │   └── services/                  # Servicios de ML
│   │       ├── __init__.py
│   │       └── training.py            # Lógica de entrenamiento
│   │
│   ├── api.py                         # (NUEVO) - Router principal que integra todas las features
│   ├── main.py                        # (REFACTORIZADO) - Application factory
│   ├── __init__.py
│   │
│   └── (DEPRECATED - A eliminar)
│       ├── auto/                      # Mover a features/ o services/
│       ├── utils/                     # Revisar y integrar a shared/
│       └── templates/                 # Revisar si aún se necesita
│
├── config/                            # 🔧 Configuración por entorno
│   ├── __init__.py
│   ├── base.py                        # Config base
│   ├── dev.py                         # Development
│   ├── prod.py                        # Production
│   └── test.py                        # Testing
│
├── tests/                             # 🧪 Suite de pruebas
│   ├── __init__.py
│   ├── conftest.py                    # Fixtures de pytest
│   ├── unit/
│   │   ├── __init__.py
│   │   └── features/
│   └── integration/
│       ├── __init__.py
│       └── features/
│
├── scripts/                           # 📝 Scripts útiles
│   ├── __init__.py
│   ├── create_superuser.py            # (NUEVO) - Crear super usuario
│   ├── seed_database.py               # (NUEVO) - Poblar BD
│   └── init_cache.py                  # (NUEVO) - Inicializar cache
│
├── docker/                            # 🐳 Dockerización
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── docker-compose.yml
│
├── requirements/                      # 📦 Dependencias separadas
│   ├── base.txt                       # Base (usado por todos)
│   ├── dev.txt                        # Desarrollo
│   ├── prod.txt                       # Producción
│   ├── test.txt                       # Testing
│   └── ml.txt                         # ML (torch, tensorflow, etc)
│
├── .env.example                       # Template de variables de entorno
├── pyproject.toml                     # (NUEVO) - Configuración moderna
├── pytest.ini                         # (NUEVO) - Config de pytest
├── Makefile                           # (NUEVO) - Comandos útiles
├── REFACTORIZATION_GUIDE.md           # Este archivo
├── logs/
└── data/
```

---

## 📊 Mapeo de Migraciones

### Archivos a MOVER:
| Origen | Destino | Cambios |
|--------|---------|---------|
| `app/exceptions.py` | `app/core/exceptions.py` | Sin cambios |
| `app/core/config.py` | `app/core/config.py` | Puede quedarse |
| `app/core/limiter.py` | `app/core/limiter.py` | Puede quedarse |
| `app/db/sessions.py` | `app/db/sessions.py` | Puede quedarse |
| `app/routers/auth.py` | `app/features/auth/router.py` | Refactorizar |
| `app/routers/usuarios.py` | `app/features/usuarios/router.py` | Refactorizar |
| `app/routers/empresas.py` | `app/features/empresas/router.py` | Refactorizar |
| `app/routers/portafolios.py` | `app/features/portafolios/router.py` | Refactorizar |
| `app/routers/precio_historicos.py` | `app/features/precios/router.py` | Refactorizar |
| `app/routers/resultados.py` | `app/features/resultados/router.py` | Refactorizar |
| `app/routers/metricas.py` | `app/features/metricas/router.py` | Refactorizar |
| `app/routers/noticias.py` | `app/features/noticias/router.py` | Refactorizar |
| `app/routers/rols.py` | `app/features/roles/router.py` | Refactorizar |
| `app/routers/sectors.py` | `app/features/sectores/router.py` | Refactorizar |
| `app/routers/admin.py` | `app/features/admin/router.py` | Refactorizar |
| `app/routers/ia.py` | `app/features/ia/router.py` | Refactorizar |
| `app/routers/contacto.py` | `app/features/contacto/router.py` | Refactorizar |
| `app/routers/modelo_ia.py` | `app/features/ia/models.py` | Refactorizar |

### Archivos a CREAR (nuevos):
| Archivo | Propósito |
|---------|----------|
| `app/features/*/schemas.py` | Pydantic models (extraído de `app/schemas/schemas.py`) |
| `app/features/*/models.py` | SQLAlchemy models (extraído de `app/models/`) |
| `app/features/*/service.py` | Lógica de negocio (extraído de `app/services/`) |
| `app/features/*/dependencies.py` | Inyección de dependencias por feature |
| `app/shared/dependencies.py` | Dependencias globales |
| `app/db/base.py` | Clase base para modelos |
| `app/api.py` | APIRouter que agrupa todas las rutas |
| `config/base.py`, `dev.py`, `prod.py` | Configuración por entorno |
| `tests/` | Estructura de pruebas |
| `scripts/` | Scripts de utilidad |
| `pyproject.toml` | Configuración moderna de Python |
| `Makefile` | Automatización de tareas |

### Archivos a REVISAR/CONSOLIDAR:
| Ruta | Acción |
|------|--------|
| `app/auto/` | Revisar funcionalidad y consolidar en features o servicios |
| `app/utils/` | Integrar funciones útiles a `app/shared/utils.py` |
| `app/templates/` | Revisar si aún se necesita (puede ser deprecated) |
| `app/ml/` | Reorganizar en `app/ml/models/` y `app/ml/services/` |

---

## 🔄 Plan de Implementación Paso a Paso

### FASE 1: Preparación (Sin romper código actual)
**Objetivo**: Crear la nueva estructura sin eliminar la antigua aún.

```bash
# 1.1 Crear estructura de carpetas
mkdir -p app/features/{auth,usuarios,empresas,portafolios,precios,resultados,metricas,noticias,roles,sectores,admin,ia,contacto}
mkdir -p app/shared
mkdir -p app/ml/models app/ml/services
mkdir -p config
mkdir -p tests/{unit,integration}
mkdir -p scripts
mkdir -p docker
mkdir -p requirements

# 1.2 Crear __init__.py en todas las carpetas
```

### FASE 2: Estructurar Core y Shared
**Objetivo**: Preparar utilidades comunes.

1. **Crear `app/core/settings.py`** - Settings mejorados con Pydantic
2. **Crear `app/core/logger.py`** - Logging centralizado
3. **Crear `app/core/security.py`** - Funciones de seguridad
4. **Crear `app/shared/dependencies.py`** - Dependencias globales
5. **Crear `app/shared/constants.py`** - Constantes
6. **Crear `app/shared/enums.py`** - Enumeraciones
7. **Crear `app/db/base.py`** - Clase base SQLAlchemy

### FASE 3: Migrar Features (Una por una)
**Objetivo**: Mover cada feature a su estructura propia.

Para **CADA feature** (auth, usuarios, empresas, etc.):
1. Crear carpeta en `app/features/{feature}/`
2. Mover/refactorizar `schemas` → `app/features/{feature}/schemas.py`
3. Mover/refactorizar `models` → `app/features/{feature}/models.py`
4. Mover `router` → `app/features/{feature}/router.py`
5. Mover `service` → `app/features/{feature}/service.py`
6. Crear `dependencies.py` con dependencias específicas
7. Crear `__init__.py`

**Orden recomendado de migración** (independientes primero):
1. `sectores` (pocas dependencias)
2. `roles` (pocas dependencias)
3. `noticias` (independiente)
4. `empresas` (sin dependencias complejas)
5. `precios` (depende de empresas)
6. `portafolios` (depende de empresas, usuarios)
7. `resultados` (depende de portafolios)
8. `usuarios` (depende de roles)
9. `auth` (depende de usuarios)
10. `metricas` (depende de resultados)
11. `ia` (depende de portafolios, precios)
12. `admin` (depende de múltiples)
13. `contacto` (independiente)

### FASE 4: Refactorizar Main y API
**Objetivo**: Centralizar rutas y mejorar la aplicación.

1. **Crear `app/api.py`** - APIRouter que agrupa todas las features
2. **Refactorizar `app/main.py`** - Application factory mejorada
3. **Actualizar imports en `run.py`**

### FASE 5: Configuración y Testing
**Objetivo**: Preparar entornos y tests.

1. **Crear `config/` con archivos por entorno**
2. **Refactorizar `requirements/` en múltiples archivos**
3. **Crear estructura de `tests/`**
4. **Crear `pyproject.toml`**
5. **Crear `Makefile`**

### FASE 6: Limpieza y Documentación
**Objetivo**: Eliminar código antiguo y documentar.

1. **Revisar carpetas deprecated** (`app/auto/`, `app/utils/`, `app/templates/`)
2. **Eliminar código antiguo**
3. **Documentar nuevas convenciones**
4. **Actualizar README del proyecto**

---

## 🎯 Patrones a Implementar

### 1. **Estructura de cada Feature**
```python
# app/features/usuarios/router.py
from fastapi import APIRouter, Depends
from app.shared.dependencies import get_db
from .schemas import UsuarioCreate, UsuarioResponse
from .service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.post("/", response_model=UsuarioResponse)
async def crear_usuario(
    usuario: UsuarioCreate,
    db = Depends(get_db)
):
    service = UsuarioService(db)
    return service.create(usuario)
```

### 2. **Service Layer**
```python
# app/features/usuarios/service.py
from sqlalchemy.orm import Session
from .models import Usuario
from .schemas import UsuarioCreate

class UsuarioService:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, usuario: UsuarioCreate):
        # Lógica de negocio
        pass
```

### 3. **Dependencies Injection**
```python
# app/shared/dependencies.py
from fastapi import Depends
from app.db.sessions import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme)):
    # Lógica de autenticación
    pass
```

### 4. **Agregación de Routers**
```python
# app/api.py
from fastapi import APIRouter
from app.features.auth import router as auth_router
from app.features.usuarios import router as usuarios_router
# ... más features

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(usuarios_router)
# ... más routers
```

---

## 📝 Checklist de Implementación

### FASE 1: Preparación
- [ ] Crear estructura de carpetas
- [ ] Crear todos los `__init__.py`

### FASE 2: Core y Shared
- [ ] Crear `app/core/settings.py`
- [ ] Crear `app/core/logger.py`
- [ ] Crear `app/core/security.py`
- [ ] Crear `app/shared/dependencies.py`
- [ ] Crear `app/shared/constants.py`
- [ ] Crear `app/shared/enums.py`
- [ ] Crear `app/db/base.py`

### FASE 3: Migrar Features
- [ ] Sectores
- [ ] Roles
- [ ] Noticias
- [ ] Empresas
- [ ] Precios
- [ ] Portafolios
- [ ] Resultados
- [ ] Usuarios
- [ ] Auth
- [ ] Métricas
- [ ] IA
- [ ] Admin
- [ ] Contacto

### FASE 4: API y Main
- [ ] Crear `app/api.py`
- [ ] Refactorizar `app/main.py`
- [ ] Actualizar `run.py`

### FASE 5: Config y Testing
- [ ] Crear `config/` por entorno
- [ ] Reorganizar `requirements/`
- [ ] Crear estructura de `tests/`
- [ ] Crear `pyproject.toml`
- [ ] Crear `Makefile`

### FASE 6: Limpieza
- [ ] Revisar `app/auto/`
- [ ] Revisar `app/utils/`
- [ ] Revisar `app/templates/`
- [ ] Eliminar código deprecated
- [ ] Documentar cambios

---

## 🚀 Comandos Útiles (Post-Refactorización)

```bash
# Crear base de datos
make db-init

# Ejecutar tests
make test

# Ejecutar en desarrollo
make run-dev

# Build para producción
make build-prod

# Linter y formateo
make lint
make format
```

---

## ⚠️ Consideraciones Importantes

1. **No romper la aplicación actual**: Validar después de cada fase
2. **Git commits pequeños**: Hacer commit después de cada feature migrada
3. **Pruebas manuales**: Validar endpoints después de cada cambio
4. **Documentación viva**: Actualizar docs mientras se refactoriza
5. **Reversibilidad**: Mantener versión anterior hasta confirmar que todo funciona

---

## 📖 Referencias de Prácticas

- **Clean Architecture**: [robert-c-martin.com](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- **DDD (Domain-Driven Design)**: [martinfowler.com](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- **FastAPI Best Practices**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)
- **Python Project Structure**: [docs.python-guide.org](https://docs.python-guide.org/)

---

## 📞 Preguntas Frecuentes

### ¿Puedo hacer esto gradualmente sin parar la aplicación?
**Sí**, las fases están diseñadas para ser implementadas sin romper la app.

### ¿Necesito cambiar la base de datos?
**No**, la estructura de BD permanece igual. Solo reorganizamos el código.

### ¿Qué pasa con los archivos viejos?
Se mantienen hasta confirmar que todo funciona, luego se eliminan.

### ¿Cómo afecta esto al frontend?
**No**, los endpoints siguen siendo los mismos. La URL `/api/v1/usuarios` sigue funcionando.

---

**Autor**: Refactorización Profesional  
**Fecha**: Mayo 2026  
**Estado**: Guía de Implementación Completa
