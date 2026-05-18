Markdown
# 📈 TesisML: Sistema de Predicción de Acciones con Machine Learning

![Python](https://img.shields.io/badge/Python-3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)
![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)
![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg)
![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC292B.svg)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg)
![Version](https://img.shields.io/badge/Version-0.2.1-brightgreen.svg)

Este repositorio contiene el código fuente desarrollado para la Tesis de Ingeniería en Informática. El proyecto es un sistema integral (Full-Stack) diseñado para predecir movimientos del mercado de valores utilizando Redes Neuronales Recurrentes (LSTM) y reglas de negocio basadas en Análisis Técnico.

## 📖 Resumen Ejecutivo

El sistema recopila automáticamente datos históricos de las acciones de empresas seleccionadas desde Yahoo Finance, calcula indicadores técnicos clave (RSI, MACD, ATR, EMA20, EMA50) y los procesa a través de un modelo de Inteligencia Artificial (LSTM) entrenado localmente. Finalmente, una API RESTful sirve las predicciones y recomendaciones de inversión (ALCISTA/BAJISTA) a un Dashboard interactivo construido en React.

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en tres capas principales:

1. **Base de Datos (`/ScriptsBaseDatos/`):** * Scripts SQL para la creación de tablas y relaciones en SQL Server.
   * Almacena datos históricos, resultados del modelo y gestión de usuarios.
2. **Backend de IA & API (`/ml-backend/`):** * Escrito en Python utilizando FastAPI y SQLAlchemy.
   * Contiene el pipeline de Machine Learning (entrenamiento e inferencia).
   * Orquesta las tareas automáticas (ETL de precios diarios).
3. **Frontend Dashboard (`/ml-frontend/`):** * Interfaz gráfica de usuario desarrollada con React.
   * Permite visualizar gráficos, resultados diarios y gestionar el portafolio.

## 📂 ¿Cómo moverse por el código? (Estructura de Directorios)

```text
TesisML/
│
├── 📁 ml-backend/                  # Motor del sistema (Python + FastAPI)
│   ├── 📁 app/
│   │   ├── 📁 auto/                # Scripts de automatización
│   │   │   ├── actualizar_precios.py       # Descarga precios de Yahoo Finance
│   │   │   ├── generar_predicciones.py     # Genera predicciones diarias
│   │   │   ├── importar_tickers.py        # Importa tickers a BD
│   │   │   └── Tickers.csv                 # Lista de símbolos bursátiles
│   │   ├── 📁 core/                # Configuración centralizada
│   │   │   └── config.py           # Settings y variables de entorno
│   │   ├── 📁 db/                  # Gestión de base de datos
│   │   │   └── sessions.py         # Connection Pool a SQL Server
│   │   ├── 📁 ml/                  # Lógica de Inteligencia Artificial
│   │   │   ├── 📁 arquitectura/    # Diseño de redes neuronales
│   │   │   ├── 📁 core/            # Funciones base de ML
│   │   │   ├── 📁 models/          # Modelos entrenados (.pth, .pkl)
│   │   │   ├── 📁 pipeline_cnn/    # Pipeline CNN para clasificación
│   │   │   ├── 📁 pipeline_lstm/   # Pipeline LSTM para series temporales
│   │   │   ├── entrenamiento.py    # Script de entrenamiento
│   │   │   └── engine.py           # Motor de inferencia en producción
│   │   ├── 📁 models/              # Modelos ORM de SQLAlchemy
│   │   ├── 📁 routers/             # Endpoints REST de la API
│   │   ├── 📁 schemas/             # Validación de datos (Pydantic)
│   │   ├── 📁 services/            # Lógica de negocio
│   │   ├── 📁 templates/           # Plantillas HTML/Email
│   │   ├── 📁 utils/               # Funciones auxiliares
│   │   ├── main.py                 # Aplicación FastAPI principal
│   │   └── exceptions.py           # Excepciones personalizadas
│   ├── .env                        # Credenciales (No versionado)
│   ├── requirement.txt             # Dependencias de Python
│   └── run.py                      # Punto de entrada alternativo
│
├── 📁 ml-frontend/                 # Dashboard (React + Vite)
│   ├── 📁 src/
│   │   ├── 📁 pages/               # Vistas principales
│   │   ├── 📁 components/          # Componentes reutilizables
│   │   ├── 📁 services/            # Consumo de API (Axios)
│   │   ├── 📁 context/             # Manejo de estado global
│   │   ├── 📁 features/            # Funcionalidades específicas
│   │   ├── 📁 layouts/             # Layouts principales
│   │   ├── 📁 navigation/          # Componentes de navegación
│   │   ├── 📁 constants/           # Constantes de la aplicación
│   │   ├── 📁 utils/               # Funciones auxiliares
│   │   ├── theme.js                # Configuración de temas MUI
│   │   ├── config.js               # Configuración general
│   │   ├── App.jsx                 # Componente raíz
│   │   └── index.jsx               # Punto de entrada
│   ├── vite.config.js              # Configuración de Vite
│   ├── package.json                # Dependencias de Node.js
│   └── README.md                   # Documentación del frontend
│
├── 📁 Docs/                        # Documentación de la tesis
│   ├── 1. INDEX.md                 # Índice de documentación
│   ├── 10_TRAINERS_REFACTORIZADOS.md
│   ├── 11_EXECUTIVE_SUMMARY_TRAINERS.md
│   ├── 12_GUIA_USO_TRAINERS.md
│   └── ...más documentos
│
└── 📁 ScriptsBaseDatos/            # Scripts DDL para SQL Server
    └── BD_Actual.sql               # Schema de base de datos
``` 
## 🚀 Guía de Ejecución Rápida

Sigue estos pasos para levantar el entorno completo desde cero.

### 1️⃣ Configuración de Base de Datos

Ejecuta los scripts ubicados en `ScriptsBaseDatos/` en tu instancia local de SQL Server Management Studio (SSMS).

**Requisitos previos:**
- Habilitar el Puerto TCP/IP 1433
- Autenticación de SQL Server (Modo Mixto)
- Crear usuario `tesis_user` con permisos `db_owner` en la BD `AnalisisAcciones`

### 2️⃣ Configuración del Backend

Navega a la carpeta `ml-backend` y crea un archivo `.env`:

```env
DATABASE_URL=mssql+pyodbc://tesis_user:TuContraseña@127.0.0.1,1433/AnalisisAcciones?driver=ODBC+Driver+17+for+SQL+Server
SECRET_KEY=tu-clave-secreta-segura-aqui
ENVIRONMENT=development
LOG_LEVEL=INFO
```

Instala las dependencias:

```bash
pip install -r requirement.txt
```

> **Nota:** Este proyecto requiere Python 3.10+ y usa PyTorch para los modelos de ML.

### 3️⃣ Ciclo de Vida del Modelo (Orden Obligatorio)

Para que el sistema funcione correctamente, ejecuta estos pasos en orden:

#### Paso A: Obtener Datos Históricos
Descarga el histórico de precios desde Yahoo Finance:

```bash
python -m app.auto.actualizar_precios
```

#### Paso B: Entrenar el Modelo
Entrena la red neuronal (LSTM/CNN) y genera los archivos del modelo:

```bash
python -m app.ml.entrenamiento
```

> ⏱️ **Advertencia:** Este proceso puede tardar varios minutos dependiendo del hardware.

#### Paso C: Generar Predicciones
La IA analiza los datos y genera predicciones diarias:

```bash
python -m app.auto.generar_predicciones
```

#### Paso D: Levantar la API REST
Inicia el servidor FastAPI:

```bash
uvicorn app.main:app --reload
```

La documentación interactiva estará disponible en: **http://127.0.0.1:8000/docs** (Swagger UI)

### 4️⃣ Levantar el Frontend (Dashboard)

Abre una nueva terminal en la carpeta `ml-frontend` e instala dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo Vite:

```bash
npm run dev
```

El Dashboard se abrirá automáticamente en **http://localhost:3000**

> **Nota:** El proyecto está optimizado para correr en `localhost`. Para despliegue en producción, revisa la documentación en la carpeta `Docs/`.

## 📋 Requisitos del Sistema

- **Backend:** Python 3.10+, SQL Server 2019+
- **Frontend:** Node.js 18+, npm/yarn
- **Dependencias Clave:**
  - FastAPI 0.115+
  - SQLAlchemy 2.0+
  - PyTorch 2.0+
  - React 19.2+
  - Vite 5.0+

## 🎯 Características Principales

- 📊 **Análisis Técnico Automático:** Cálculo de indicadores RSI, MACD, ATR, EMA20, EMA50
- 🤖 **Modelos de IA Avanzados:** Pipelines LSTM y CNN para predicción de tendencias
- 💾 **Persistencia en SQL Server:** Almacenamiento de históricos y predicciones
- 🔄 **Descarga Automática:** ETL diario desde Yahoo Finance
- 📱 **Dashboard Interactivo:** Visualización con gráficos en tiempo real
- 🔐 **Seguridad Empresarial:** Autenticación JWT y validación de datos con Pydantic
- ⚡ **Alto Rendimiento:** Caché con Redis, validación con SlowAPI

## 🛠️ Stack Técnico

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework Web | FastAPI | 0.115+ |
| Servidor | Uvicorn | 0.30+ |
| ORM | SQLAlchemy | 2.0+ |
| ML Framework | PyTorch | 2.0+ |
| Fuente de Datos | yfinance | 0.2.43+ |
| Autenticación | python-jose | 3.3+ |
| Validación | Pydantic | 2.9+ |
| Base de Datos | SQL Server | 2019+ |

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | React | 19.2+ |
| Build Tool | Vite | 5.0+ |
| UI Library | Material-UI | 7.3+ |
| Gráficos | Recharts + Lightweight-Charts | 3.8+ / 5.1+ |
| HTTP Client | Axios | 1.13+ |
| State Management | React Query | 5.95+ |
| Formularios | React Hook Form | 7.72+ |
| Notificaciones | React Hot Toast | 2.6+ |

## 📚 Documentación Adicional

Encontrarás documentación detallada en la carpeta `Docs/`:

- **1. INDEX.md** - Índice general del proyecto
- **10_TRAINERS_REFACTORIZADOS.md** - Guía de entrenadores refactorizados
- **11_EXECUTIVE_SUMMARY_TRAINERS.md** - Resumen ejecutivo de entrenadores
- **12_GUIA_USO_TRAINERS.md** - Guía de uso práctica
- **13_OPTIMIZACION_MATRIZ_CONFUSION_MAYO2026.md** - Optimización de matriz de confusión

## 🔧 Solución de Problemas

### Error de conexión a SQL Server
```bash
# Verifica que el servicio SQL Server esté corriendo
# Y que las credenciales en .env sean correctas
```

### Modelos no se cargan
```bash
# Asegúrate de que entrenamiento.py se ejecutó correctamente
# Los archivos .pth (modelos) deben estar en: ml-backend/app/ml/models/
```

### El frontend no carga datos de la API
```bash
# Verifica que uvicorn esté corriendo en http://127.0.0.1:8000
# Revisa la consola del navegador para errores CORS
```

### Redis no está disponible
```bash
# Redis es opcional pero mejora el rendimiento
# Instálalo con: docker run -d -p 6379:6379 redis:latest
# O usa: pip install redis
```

## 🚀 Despliegue en Producción

Para desplegar la aplicación en un servidor:

1. **Backend:** Usa Gunicorn + Nginx como proxy reverso
2. **Frontend:** Ejecuta `npm run build` y sirve desde un CDN o Nginx
3. **Base de Datos:** Configura conexión pool y backups regulares
4. **SSL/TLS:** Implementa certificados de seguridad

Consulta la documentación en `Docs/` para instrucciones detalladas.

## 🤝 Contribución

Si contribuyes al proyecto:

1. Crea una rama desde `main`
2. Realiza tus cambios manteniendo el estilo de código
3. Documenta cambios significativos
4. Realiza commit descriptivos
5. Crea un Pull Request

## 📄 Licencia

Este proyecto fue desarrollado como Tesis de Ingeniería en Informática.

---

**Última actualización:** Mayo 2026  
**Versión Actual:** 0.2.1  
**Mantenedor:** Equipo de Desarrollo TesisML
