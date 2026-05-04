# ✅ Checklist Interactiva - Refactorización Backend

## 📋 Estado General del Proyecto
- [ ] **INICIO**: 4 de Mayo 2026
- [ ] **META**: Backend profesional y escalable
- [ ] **DURACIÓN ESTIMADA**: 4-5 horas de trabajo

---

## FASE 1️⃣: Crear Estructura de Carpetas (5 min)

### Crear directorios base
```bash
# Ejecutar en: C:\Users\fabia\Desktop\Universidad\TesisML\ml-backend
```

- [ ] Crear `app/features/` y sus subdirectorios:
  - [ ] `app/features/auth/`
  - [ ] `app/features/usuarios/`
  - [ ] `app/features/empresas/`
  - [ ] `app/features/portafolios/`
  - [ ] `app/features/precios/`
  - [ ] `app/features/resultados/`
  - [ ] `app/features/metricas/`
  - [ ] `app/features/noticias/`
  - [ ] `app/features/roles/`
  - [ ] `app/features/sectores/`
  - [ ] `app/features/admin/`
  - [ ] `app/features/ia/`
  - [ ] `app/features/contacto/`

- [ ] Crear `app/shared/`
- [ ] Crear `app/ml/models/`
- [ ] Crear `app/ml/services/`
- [ ] Crear `config/`
- [ ] Crear `tests/unit/`
- [ ] Crear `tests/integration/`
- [ ] Crear `scripts/`
- [ ] Crear `docker/`
- [ ] Crear `requirements/`

### Crear archivos __init__.py
- [ ] `app/features/__init__.py`
- [ ] `app/features/auth/__init__.py`
- [ ] `app/features/usuarios/__init__.py`
- [ ] `app/features/empresas/__init__.py`
- [ ] `app/features/portafolios/__init__.py`
- [ ] `app/features/precios/__init__.py`
- [ ] `app/features/resultados/__init__.py`
- [ ] `app/features/metricas/__init__.py`
- [ ] `app/features/noticias/__init__.py`
- [ ] `app/features/roles/__init__.py`
- [ ] `app/features/sectores/__init__.py`
- [ ] `app/features/admin/__init__.py`
- [ ] `app/features/ia/__init__.py`
- [ ] `app/features/contacto/__init__.py`
- [ ] `app/shared/__init__.py`
- [ ] `app/ml/__init__.py`
- [ ] `app/ml/models/__init__.py`
- [ ] `app/ml/services/__init__.py`
- [ ] `config/__init__.py`
- [ ] `tests/__init__.py`
- [ ] `tests/unit/__init__.py`
- [ ] `tests/integration/__init__.py`
- [ ] `scripts/__init__.py`

### Validación FASE 1
```bash
# Verificar que la app aún funciona:
# uvicorn app.main:app --reload
```
- [ ] App inicia sin errores
- [ ] Endpoints responden correctamente

**🎯 FASE 1 COMPLETADA** → ✅ Carpetas creadas

---

## FASE 2️⃣: Core y Shared (30 min)

### 2.1 Crear archivos de Core mejorados

#### `app/core/settings.py` (NUEVO)
- [ ] Crear archivo
- [ ] Implementar Pydantic BaseSettings mejorado
- [ ] Variables: DATABASE_URL, SECRET_KEY, REDIS_URL, DEBUG, etc.

#### `app/core/logger.py` (NUEVO)
- [ ] Crear archivo
- [ ] Implementar logger centralizado
- [ ] Soportar DEBUG y PRODUCTION modes

#### `app/core/security.py` (NUEVO)
- [ ] Crear archivo
- [ ] Funciones de hash de contraseñas
- [ ] Creación y verificación de JWT tokens

### 2.2 Crear archivos de Shared

#### `app/shared/constants.py` (NUEVO)
- [ ] Crear archivo
- [ ] Definir constantes globales del sistema

#### `app/shared/enums.py` (NUEVO)
- [ ] Crear archivo
- [ ] Definir enumeraciones reutilizables (roles, estados, etc.)

#### `app/shared/validators.py` (MEJORAR)
- [ ] Revisar archivo existente
- [ ] Consolidar validadores útiles

#### `app/shared/dependencies.py` (REFACTORIZAR)
- [ ] Crear/refactorizar archivo
- [ ] `get_db()` - Sesión de base de datos
- [ ] `get_current_user()` - Usuario actual
- [ ] `get_admin_user()` - Usuario admin
- [ ] Otras dependencias globales

### 2.3 Crear DB base

#### `app/db/base.py` (NUEVO)
- [ ] Crear archivo
- [ ] Clase Base para modelos SQLAlchemy
- [ ] Timestamp base fields (created_at, updated_at)

### Validación FASE 2
```bash
# Verificar imports funcionen:
# python -c "from app.core.settings import settings; print('OK')"
# python -c "from app.shared.dependencies import get_db; print('OK')"
```
- [ ] No hay import errors
- [ ] App sigue funcionando

**🎯 FASE 2 COMPLETADA** → ✅ Fundamentos listos

---

## FASE 3️⃣: Migrar Features (2-3 horas)

### Orden de migración (menos dependencias primero):

#### LOTE 1: Independientes
```
sectores → roles → noticias → contacto
```

- [ ] **SECTORES**
  - [ ] Copiar schemas a `app/features/sectores/schemas.py`
  - [ ] Copiar models a `app/features/sectores/models.py`
  - [ ] Copiar router a `app/features/sectores/router.py`
  - [ ] Copiar service a `app/features/sectores/service.py`
  - [ ] Crear `app/features/sectores/dependencies.py`
  - [ ] Crear `app/features/sectores/__init__.py`
  - [ ] Actualizar imports en router
  - [ ] Validar endpoint `/api/v1/sectores`

- [ ] **ROLES**
  - [ ] Copiar schemas a `app/features/roles/schemas.py`
  - [ ] Copiar models a `app/features/roles/models.py`
  - [ ] Copiar router a `app/features/roles/router.py`
  - [ ] Copiar service a `app/features/roles/service.py`
  - [ ] Crear `app/features/roles/dependencies.py`
  - [ ] Crear `app/features/roles/__init__.py`
  - [ ] Actualizar imports en router
  - [ ] Validar endpoint `/api/v1/roles`

- [ ] **NOTICIAS**
  - [ ] Copiar schemas a `app/features/noticias/schemas.py`
  - [ ] Copiar models a `app/features/noticias/models.py`
  - [ ] Copiar router a `app/features/noticias/router.py`
  - [ ] Copiar service a `app/features/noticias/service.py`
  - [ ] Crear `app/features/noticias/dependencies.py`
  - [ ] Crear `app/features/noticias/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **CONTACTO**
  - [ ] Copiar schemas a `app/features/contacto/schemas.py`
  - [ ] Copiar router a `app/features/contacto/router.py`
  - [ ] Copiar service a `app/features/contacto/service.py`
  - [ ] Crear `app/features/contacto/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

#### LOTE 2: Con dependencias simples
```
empresas → precios → portafolios → resultados
```

- [ ] **EMPRESAS**
  - [ ] Copiar schemas a `app/features/empresas/schemas.py`
  - [ ] Copiar models a `app/features/empresas/models.py`
  - [ ] Copiar router a `app/features/empresas/router.py`
  - [ ] Copiar service a `app/features/empresas/service.py`
  - [ ] Crear `app/features/empresas/dependencies.py`
  - [ ] Crear `app/features/empresas/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **PRECIOS**
  - [ ] Copiar schemas a `app/features/precios/schemas.py`
  - [ ] Copiar models a `app/features/precios/models.py`
  - [ ] Copiar router a `app/features/precios/router.py`
  - [ ] Copiar service a `app/features/precios/service.py`
  - [ ] Crear `app/features/precios/dependencies.py`
  - [ ] Crear `app/features/precios/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **PORTAFOLIOS**
  - [ ] Copiar schemas a `app/features/portafolios/schemas.py`
  - [ ] Copiar models a `app/features/portafolios/models.py`
  - [ ] Copiar router a `app/features/portafolios/router.py`
  - [ ] Copiar service a `app/features/portafolios/service.py`
  - [ ] Crear `app/features/portafolios/dependencies.py`
  - [ ] Crear `app/features/portafolios/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **RESULTADOS**
  - [ ] Copiar schemas a `app/features/resultados/schemas.py`
  - [ ] Copiar models a `app/features/resultados/models.py`
  - [ ] Copiar router a `app/features/resultados/router.py`
  - [ ] Copiar service a `app/features/resultados/service.py`
  - [ ] Crear `app/features/resultados/dependencies.py`
  - [ ] Crear `app/features/resultados/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

#### LOTE 3: Con dependencias complejas
```
usuarios → auth → metricas → ia → admin
```

- [ ] **USUARIOS**
  - [ ] Copiar schemas a `app/features/usuarios/schemas.py`
  - [ ] Copiar models a `app/features/usuarios/models.py`
  - [ ] Copiar router a `app/features/usuarios/router.py`
  - [ ] Copiar service a `app/features/usuarios/service.py`
  - [ ] Crear `app/features/usuarios/dependencies.py` (depende de roles)
  - [ ] Crear `app/features/usuarios/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **AUTH**
  - [ ] Copiar schemas a `app/features/auth/schemas.py`
  - [ ] Copiar router a `app/features/auth/router.py`
  - [ ] Copiar service a `app/features/auth/service.py`
  - [ ] Crear `app/features/auth/dependencies.py` (depende de usuarios)
  - [ ] Crear `app/features/auth/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **METRICAS**
  - [ ] Copiar schemas a `app/features/metricas/schemas.py`
  - [ ] Copiar models a `app/features/metricas/models.py`
  - [ ] Copiar router a `app/features/metricas/router.py`
  - [ ] Copiar service a `app/features/metricas/service.py`
  - [ ] Crear `app/features/metricas/dependencies.py`
  - [ ] Crear `app/features/metricas/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **IA**
  - [ ] Copiar schemas a `app/features/ia/schemas.py`
  - [ ] Copiar models a `app/features/ia/models.py`
  - [ ] Copiar router a `app/features/ia/router.py`
  - [ ] Copiar service a `app/features/ia/service.py`
  - [ ] Crear `app/features/ia/dependencies.py`
  - [ ] Crear `app/features/ia/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

- [ ] **ADMIN**
  - [ ] Copiar schemas a `app/features/admin/schemas.py`
  - [ ] Copiar router a `app/features/admin/router.py`
  - [ ] Copiar service a `app/features/admin/service.py`
  - [ ] Crear `app/features/admin/dependencies.py`
  - [ ] Crear `app/features/admin/__init__.py`
  - [ ] Actualizar imports
  - [ ] Validar endpoints

### Después de cada feature migrada:
```bash
# Git commit
git add app/features/{feature}
git commit -m "refactor: migrate {feature} to new structure"

# Validar
pytest app/features/{feature}
```

**🎯 FASE 3 COMPLETADA** → ✅ Todas las features migradas

---

## FASE 4️⃣: Unificar Routers (30 min)

### Crear `app/api.py`
- [ ] Crear archivo `app/api.py`
- [ ] Importar todos los routers de features
- [ ] Crear `api_router` principal con prefix `/api/v1`
- [ ] Incluir todos los routers

```python
# Estructura esperada:
# api_router.include_router(auth.router)
# api_router.include_router(usuarios.router)
# ... etc
```

### Refactorizar `app/main.py`
- [ ] Actualizar import: `from app.api import api_router`
- [ ] Cambiar: `app.include_router(api_router)`
- [ ] Eliminar importaciones viejas de routers individuales

### Validación FASE 4
```bash
# Verificar todas las rutas siguen disponibles
# curl http://localhost:8000/api/v1/usuarios
# curl http://localhost:8000/api/v1/empresas
# ... etc
```
- [ ] Todos los endpoints responden
- [ ] URL structure es `/api/v1/{resource}`

**🎯 FASE 4 COMPLETADA** → ✅ Routers unificados

---

## FASE 5️⃣: Config y Requirements (30 min)

### Crear configuración por entorno

#### `config/base.py` (NUEVO)
- [ ] Config base para todos los entornos

#### `config/dev.py` (NUEVO)
- [ ] Config para desarrollo (DEBUG=True, etc)

#### `config/prod.py` (NUEVO)
- [ ] Config para producción (DEBUG=False, etc)

### Reorganizar requirements

#### `requirements/base.txt`
- [ ] Dependencias base (fastapi, sqlalchemy, etc)

#### `requirements/dev.txt`
- [ ] Herramientas de desarrollo (pytest, black, etc)

#### `requirements/prod.txt`
- [ ] Para producción (gunicorn, etc)

#### `requirements/ml.txt`
- [ ] Dependencias de ML (torch, tensorflow, etc)

### Crear archivos de configuración

- [ ] `pyproject.toml`
- [ ] `pytest.ini`
- [ ] `.env.example`
- [ ] `Makefile`

**🎯 FASE 5 COMPLETADA** → ✅ Configuración profesional

---

## FASE 6️⃣: Testing y Cleanup (1 hora)

### Crear estructura de tests

#### `tests/conftest.py` (NUEVO)
- [ ] Fixtures de pytest
- [ ] Base de datos de test

#### `tests/unit/` tests
- [ ] Tests para services (unitarios)

#### `tests/integration/` tests
- [ ] Tests para routers (integración)

### Validar

```bash
# Ejecutar todos los tests
pytest -v

# Ejecutar con cobertura
pytest --cov=app
```

- [ ] Todos los tests pasan
- [ ] Cobertura > 80%

### Cleanup

- [ ] Revisar `app/auto/` - ¿Se puede integrar?
- [ ] Revisar `app/utils/` - ¿Se consolidó en shared?
- [ ] Revisar `app/templates/` - ¿Aún se necesita?
- [ ] Revisar `app/routers/` - ¿Vacía ya?
- [ ] Revisar `app/services/` - ¿Vacía ya?
- [ ] Revisar `app/models/` - ¿Vacía ya?
- [ ] Revisar `app/schemas/` - ¿Vacía ya?
- [ ] Eliminar carpetas antiguas vacías

### Documentación

- [ ] Actualizar `README.md` principal
- [ ] Crear `ARCHITECTURE.md` con nueva estructura
- [ ] Documentar convenciones de código
- [ ] Agregar ejemplos de cómo agregar nueva feature

### Validación final

```bash
# Revisar que todo funciona como antes
# 1. Iniciar app: python run.py
# 2. Probar endpoints con Postman o curl
# 3. Ejecutar: pytest -v
# 4. Revisar logs en app/logs/
```

- [ ] App inicia sin errores
- [ ] Todos los endpoints funcionan
- [ ] Tests pasan
- [ ] No hay warnings

**🎯 FASE 6 COMPLETADA** → ✅ Backend profesional y escalable

---

## 🎉 ¡PROYECTO COMPLETADO!

### Resumen de cambios
```
✅ Estructura: ANTES (Por tipo) → DESPUÉS (Por dominio)
✅ Escalabilidad: Fácil agregar nuevas features
✅ Mantenibilidad: Código limpio y organizado
✅ Testing: Suite de tests completa
✅ Documentación: Guías de mantenimiento
✅ DevOps: Config profesional por entorno
```

### Próximos pasos
1. **Mantener la disciplina**: Nuevas features van en `app/features/`
2. **Code review**: Validar estructura en PRs
3. **Documentación viva**: Actualizar docs con cambios
4. **Métricas**: Monitorear cobertura de tests
5. **Escalabilidad**: Cuando crezca más, considerar microservicios

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| **Tiempo agregar feature** | 2-3h | 30min | < 1h ✅ |
| **Cobertura tests** | 0% | ? | > 80% |
| **Código duplicado** | Alto | Bajo | < 5% |
| **Cohesión** | Media | Alta | 9/10 |
| **Acoplamiento** | Alto | Bajo | 3/10 |

---

**Documentos relacionados:**
- 📋 `REFACTORIZATION_GUIDE.md` - Guía detallada
- 🚀 `QUICK_START.md` - Resumen rápido
- 📊 Esta checklist

**¿Necesitas ayuda con alguna fase?** Contacta al equipo de desarrollo.

---

**Última actualización**: Mayo 4, 2026
**Estado**: Listo para empezar ✅
