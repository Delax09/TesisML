# 🔄 FLUJO DE DATOS DE LA APLICACIÓN REFACTORIZADA

## Diagrama de Flujo - Crear una Empresa

```
┌───────────────────────────────────────────────────────────────────┐
│                       Cliente (Frontend)                          │
│                                                                   │
│  POST http://localhost:8000/api/v1/empresas                      │
│  {                                                               │
│    "Ticket": "AAPL",                                            │
│    "NombreEmpresa": "Apple Inc.",                               │
│    "IdSector": 1                                                │
│  }                                                              │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│              app/routers/empresas.py (Endpoint)                  │
│                                                                   │
│  @app.post("/api/v1/empresas")                                  │
│  def crear_empresa(empresa: EmpresaCreate, db: Session):        │
│      try:                                                        │
│          return EmpresaService.crear_empresa(db, empresa)       │
│      except DuplicateResourceError as e:                        │
│          raise HTTPException(400, e.message)                    │
│                                                                   │
│  ✅ Responsabilidad: HTTP + Error Handling                      │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│          app/services/empresa_service.py (Lógica)                │
│                                                                   │
│  @staticmethod                                                   │
│  def crear_empresa(db, empresa_data):                            │
│      # Validar sector existe                                     │
│      EmpresaService._validar_sector_existe(db, id_sector)       │
│                                                                   │
│      # Validar ticket único                                      │
│      EmpresaService._validar_ticket_unico(db, ticket)           │
│                                                                   │
│      # Crear empresa                                             │
│      empresa = Empresa(...)                                      │
│      db.add(empresa)                                             │
│      db.commit()                                                 │
│      return empresa                                              │
│                                                                   │
│  ✅ Responsabilidad: Lógica de Negocio + Validaciones          │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼ (Si hay error)
┌───────────────────────────────────────────────────────────────────┐
│           app/exceptions.py (Manejo de Errores)                  │
│                                                                   │
│  ❌ ResourceNotFoundError     → 404 Not Found                   │
│  ❌ DuplicateResourceError    → 400 Bad Request                 │
│  ❌ InvalidDataError          → 400 Bad Request                 │
│                                                                   │
│  ✅ Responsabilidad: Centralizar errores                        │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼ (Si es exitoso)
┌───────────────────────────────────────────────────────────────────┐
│          app/db/sessions.py (Acceso a BD)                        │
│                                                                   │
│  SessionLocal = sessionmaker(bind=engine)                       │
│  db.add(empresa)                                                 │
│  db.commit()                                                     │
│                                                                   │
│  ✅ Responsabilidad: Persistencia de datos                      │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│        app/models/models.py (Tabla en BD)                        │
│                                                                   │
│  class Empresa(Base):                                            │
│      __tablename__ = "Empresa"                                   │
│      IdEmpresa = Column(Integer, primary_key=True)             │
│      Ticket = Column(String(10), unique=True)                   │
│      NombreEmpresa = Column(String(100))                        │
│      IdSector = Column(Integer, ForeignKey)                     │
│      FechaAgregado = Column(DateTime)                           │
│                                                                   │
│  ✅ Responsabilidad: Mapeo de tablas                            │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│              SQL Server (Database)                                │
│                                                                   │
│  INSERT INTO Empresa (Ticket, NombreEmpresa, IdSector)         │
│  VALUES ('AAPL', 'Apple Inc.', 1)                              │
│                                                                   │
│  ✅ Responsabilidad: Almacenar datos                            │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│         app/schemas/schemas.py (Serialización)                   │
│                                                                   │
│  class EmpresaOut(BaseModel):                                   │
│      IdEmpresa: int                                              │
│      Ticket: str                                                 │
│      NombreEmpresa: str                                          │
│      IdSector: int                                               │
│      FechaAgregado: datetime                                     │
│                                                                   │
│  ✅ Responsabilidad: Convertir a JSON                           │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│                    HTTP Response (JSON)                           │
│                                                                   │
│  Status: 201 Created                                             │
│  {                                                               │
│    "IdEmpresa": 1,                                              │
│    "Ticket": "AAPL",                                            │
│    "NombreEmpresa": "Apple Inc.",                               │
│    "IdSector": 1,                                               │
│    "FechaAgregado": "2024-01-15T10:30:00"                      │
│  }                                                               │
│                                                                   │
│  ✅ Responsabilidad: Devolver respuesta HTTP                    │
└──────────────┬────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Cliente (Frontend)                            │
│                                                                   │
│  Recibe respuesta JSON                                           │
│  La procesa y la muestra en la UI                               │
│                                                                   │
│  ✅ Responsabilidad: Mostrar datos al usuario                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📊 Flujo de Error - Ticket Duplicado

```
Cliente envía:
{
  "Ticket": "AAPL",        (Ya existe)
  "NombreEmpresa": "Apple",
  "IdSector": 1
}
       │
       ▼
┌──────────────────────────────────────┐
│    empresas.py (Router)              │
│  criar_empresa() → EmpresaService    │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ empresa_service.py                   │
│ _validar_ticket_unico()              │
│                                      │
│ query = db.query(Empresa)            │
│      .filter(Ticket == "AAPL")       │
│                                      │
│ if query.first() exists:             │
│   ❌ Lanza DuplicateResourceError    │
│     "Ticket 'AAPL' duplicado"        │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ empresas.py (Catch Exception)        │
│                                      │
│ except DuplicateResourceError as e:  │
│   raise HTTPException(               │
│     status_code=400,                 │
│     detail=e.message                 │
│   )                                  │
└──────────────────────────────────────┘
       │
       ▼
Cliente recibe:
Status: 400 Bad Request
{
  "detail": "Ticket 'AAPL' ya existe para Empresa"
}
```

---

## 🎯 Ventajas del Flujo Refactorizado

### 1. **Separación Clara**
```
Router         → Maneja HTTP
Service        → Lógica de negocio
Model          → Mapeo a BD
Schema         → Validación de datos
Exceptions     → Manejo de errores
```

### 2. **Validaciones Centralizadas**
```
Todas las validaciones en un lugar
→ Fácil de entender
→ Fácil de reutilizar
→ Fácil de testear
```

### 3. **Manejo de Errores Consistente**
```
Mismo error = Mismo formato de respuesta
Mismo error = Mismo código HTTP
Fácil de documentar
```

### 4. **Testabilidad**
```
Puedo testear SectorService sin HTTP
Puedo testear Router sin lógica de negocio
Puedo testear Validaciones aisladas
```

---

## 🔄 Patrón Request-Response

```
1. REQUEST
   Client → POST /api/v1/empresas
   Headers: Content-Type: application/json
   Body: {datos}

2. VALIDATION (Schema)
   Pydantic valida structure
   Valida tipos de datos
   Valida constraints

3. ROUTE HANDLER
   Recibe request validado
   Llama al servicio
   Maneja excepciones

4. SERVICE LOGIC
   Validaciones de negocio
   Consultas a BD
   Transformaciones

5. DATABASE
   Persistencia
   Transacciones
   Integridad

6. RESPONSE SERIALIZATION
   Convert Model → Schema
   Convert Python → JSON

7. RESPONSE
   Status Code
   Headers
   Body: {json}

8. CLIENT
   Recibe response
   Lo procesa
   Muestra al usuario
```

---

## 📈 Escalabilidad del Patrón

```
Cuando agregues una nueva entidad:

1. Crear modelo en models.py
2. Crear schema en schemas.py
3. Crear servicio en services/nuevo_service.py
4. Crear router en routers/nuevo.py
5. Registrar en routers/__init__.py
6. Registrar en main.py

¡Listo! Sigue el mismo patrón.
```

---

## ✅ Checklist de Flujo

- ✅ Request viene con datos
- ✅ Schema valida estructura
- ✅ Router recibe datos validados
- ✅ Service ejecuta lógica
- ✅ Service valida reglas de negocio
- ✅ Database persiste datos
- ✅ Schema serializa respuesta
- ✅ Cliente recibe JSON

¡Cada paso hace su trabajo! 🚀
