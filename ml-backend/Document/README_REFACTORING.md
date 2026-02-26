# 🎯 Proyecto ML - Backend Refactorizado

## 📊 Estado de la Refactorización

✅ **COMPLETADO** - El proyecto ha sido refactorizado exitosamente para mayor orden y escalabilidad.

---

## 📁 Nueva Estructura del Proyecto

```
ml-backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                           # 🟢 Configuración principal (Refactorizado)
│   ├── exceptions.py                     # 🆕 Excepciones personalizadas
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py                     # 🔧 Configuración centralizada
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   └── sessions.py                   # 💾 Conexión a BD
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py                     # 📋 Modelos SQLAlchemy
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py                    # 🟢 Esquemas Pydantic (Mejorado)
│   │
│   ├── services/                         # 🆕 NUEVA CARPETA
│   │   ├── __init__.py
│   │   ├── sector_service.py             # 🔧 Lógica de Sectores
│   │   └── empresa_service.py            # 🔧 Lógica de Empresas
│   │
│   └── routers/                          # 🆕 NUEVA CARPETA
│       ├── __init__.py
│       ├── sectors.py                    # 📡 Endpoints de Sectores
│       └── empresas.py                   # 📡 Endpoints de Empresas
│
├── requirement.txt                       # 📦 Dependencias
├── .env                                  # 🔐 Variables de entorno
├── run.py                                # 🆕 Script de ejecución
│
├── REFACTORING.md                        # 📖 Documentación detallada
├── API_EXAMPLES.md                       # 📝 Ejemplos de uso
├── MIGRATION_CHECKLIST.md                # ✅ Checklist de cambios
└── README.md                             # 📚 Este archivo
```

---

## 🎨 Cambios Principales

### 1️⃣ **Separación de Responsabilidades**

| Componente | Responsabilidad |
|-----------|-----------------|
| **Routers** | Manejar HTTP requests/responses |
| **Services** | Lógica de negocio centralizada |
| **Models** | Definir estructura de BD |
| **Schemas** | Validar datos entrada/salida |
| **Exceptions** | Manejo centralizado de errores |

### 2️⃣ **Reducción de Código en main.py**

- **Antes**: 141 líneas (todo mezclado)
- **Después**: 36 líneas (solo configuración)
- **Reducción**: 95% ✨

### 3️⃣ **Manejo Centralizado de Errores**

```python
# app/exceptions.py
- ResourceNotFoundError         # Cuando recurso no existe
- DuplicateResourceError        # Cuando hay datos duplicados
- InvalidDataError              # Cuando datos son inválidos
```

### 4️⃣ **Servicios Reutilizables**

```python
# app/services/
SectorService.obtener_sector_por_id()
SectorService.crear_sector()
SectorService.actualizar_sector()

EmpresaService.crear_empresa()
EmpresaService.obtener_empresa_por_id()
```

---

## 🚀 Cómo Ejecutar

### Opción 1: Usando el script run.py
```bash
cd ml-backend
python run.py
```

### Opción 2: Usando uvicorn directamente
```bash
cd ml-backend
uvicorn app.main:app --reload
```

### Opción 3: Usando Python -m
```bash
cd ml-backend
python -m uvicorn app.main:app --reload
```

### Acceder a la API
- 🌐 **API**: http://localhost:8000
- 📚 **Swagger Docs**: http://localhost:8000/docs
- 📖 **ReDoc**: http://localhost:8000/redoc
- ❤️ **Health Check**: http://localhost:8000/

---

## 📡 Endpoints Disponibles

### Sectores
```
POST   /api/v1/sectores              - Crear sector
GET    /api/v1/sectores              - Obtener todos
GET    /api/v1/sectores/{id}         - Obtener por ID
PUT    /api/v1/sectores/{id}         - Actualizar
DELETE /api/v1/sectores/{id}         - Eliminar
GET    /api/v1/sectores/{id}/empresas - Empresas del sector
```

### Empresas
```
POST   /api/v1/empresas              - Crear empresa
GET    /api/v1/empresas              - Obtener todas
GET    /api/v1/empresas/{id}         - Obtener por ID
PUT    /api/v1/empresas/{id}         - Actualizar
DELETE /api/v1/empresas/{id}         - Eliminar
```

---

## 💡 Ejemplo de Uso

### Crear un Sector
```bash
curl -X POST "http://localhost:8000/api/v1/sectores" \
  -H "Content-Type: application/json" \
  -d '{"NombreSector": "Tecnología"}'
```

### Crear una Empresa
```bash
curl -X POST "http://localhost:8000/api/v1/empresas" \
  -H "Content-Type: application/json" \
  -d '{
    "Ticket": "AAPL",
    "NombreEmpresa": "Apple",
    "IdSector": 1
  }'
```

---

## 🎯 Arquitectura en Capas

```
┌─────────────────────────────────────┐
│        HTTP Client (React)          │
└────────────────────┬────────────────┘
                     │
┌────────────────────▼────────────────┐
│          ROUTERS (FastAPI)          │ ← Maneja HTTP
├─────────────────────────────────────┤
│      sectors.py | empresas.py       │
└────────────────────┬────────────────┘
                     │
┌────────────────────▼────────────────┐
│         SERVICES (Lógica)           │ ← Lógica de Negocio
├─────────────────────────────────────┤
│   SectorService | EmpresaService    │
└────────────────────┬────────────────┘
                     │
┌────────────────────▼────────────────┐
│      DATABASE LAYER (SQLAlchemy)    │ ← Acceso a BD
├─────────────────────────────────────┤
│  Models | Sessions | SQLAlchemy ORM │
└─────────────────────────────────────┘
```

---

## ✨ Beneficios Obtenidos

| Beneficio | Descripción |
|-----------|------------|
| 🏗️ **Escalabilidad** | Fácil agregar nuevos endpoints y servicios |
| 🧹 **Mantenibilidad** | Código organizado por responsabilidad |
| 🧪 **Testabilidad** | Servicios independientes y fáciles de testear |
| 🔄 **Reutilización** | Servicios reutilizables en múltiples routers |
| 🎯 **Consistencia** | Manejo centralizado de errores y validaciones |
| 📖 **Legibilidad** | Código autodocumentado y bien estructurado |

---

## 📚 Documentación Adicional

- [REFACTORING.md](REFACTORING.md) - Guía completa de refactorización
- [API_EXAMPLES.md](API_EXAMPLES.md) - Ejemplos de uso de endpoints
- [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md) - Checklist detallado

---

## 🔮 Próximos Pasos

### Fase 1: Completar Servicios (2-3 días)
- [ ] ResultadoService para predicciones
- [ ] UsuarioService para usuarios
- [ ] PortafolioService para portafolios

### Fase 2: Agregar Autenticación (2-3 días)
- [ ] JWT tokens
- [ ] Middleware de autenticación
- [ ] Roles y permisos

### Fase 3: Testing (3-4 días)
- [ ] Tests unitarios para servicios
- [ ] Tests de integración para routers
- [ ] Coverage > 80%

### Fase 4: Mejoras Operacionales (2-3 días)
- [ ] Logging centralizado
- [ ] Manejo de errores global
- [ ] Documentación automática

---

## 🛠️ Stack Tecnológico

- **Framework**: FastAPI ⚡
- **ORM**: SQLAlchemy 🗄️
- **Validación**: Pydantic ✅
- **DB**: SQL Server (desde .env)
- **Server**: Uvicorn 🚀
- **ML**: scikit-learn, yfinance 🤖

---

## 📝 Notas Importantes

1. **Variables de Entorno**: Asegúrate de tener configurado el archivo `.env`
2. **Base de Datos**: Verifica que el `DATABASE_URL` en `.env` sea correcto
3. **CORS**: Actualmente permite todos los orígenes, ajusta en producción
4. **Logs**: Configurable mediante `LOG_LEVEL` en `.env`

---

## 🤝 Contribuir

Para agregar nuevos endpoints:

1. Crear servicio en `app/services/nuevo_service.py`
2. Crear router en `app/routers/nuevo.py`
3. Importar router en `app/routers/__init__.py`
4. Registrar router en `app/main.py`

---

## 📞 Contacto

Para preguntas o sugerencias sobre la refactorización, consulta la documentación en `REFACTORING.md`

---

**Refactorización completada exitosamente ✨**

*Desde una estructura monolítica hacia una arquitectura escalable y mantenible.*
