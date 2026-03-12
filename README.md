Aquí tienes una propuesta completa y profesional para el archivo README.md principal de tu repositorio. Este documento no solo sirve como resumen de tu tesis, sino también como una guía práctica (y obligatoria en Ingeniería de Software) para que cualquier persona (o profesor) sepa cómo moverse, instalar y ejecutar el proyecto de principio a fin.

Puedes copiar este contenido y guardarlo en el archivo README.md que está en la carpeta raíz (TesisML/README.md).

Markdown
# 📈 TesisML: Sistema de Predicción de Acciones con Machine Learning

![Python](https://img.shields.io/badge/Python-3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)
![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC292B.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.18-FF6F00.svg)

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
├── 📁 ml-backend/                  # Motor del sistema (Python)
│   ├── 📁 app/
│   │   ├── 📁 auto/                # Scripts de automatización (descarga de precios y orquestador)
│   │   ├── 📁 core/                # Configuración de variables de entorno y seguridad
│   │   ├── 📁 db/                  # Configuración del Connection Pool a SQL Server
│   │   ├── 📁 ml/                  # Lógica de Inteligencia Artificial
│   │   │   ├── entrenamiento.py    # Script de entrenamiento de la red LSTM
│   │   │   ├── engine.py           # Motor de inferencia en producción
│   │   │   └── 📁 models/          # Aquí se guardan el modelo (.keras) y el scaler (.pkl)
│   │   ├── 📁 models/              # Modelos ORM de SQLAlchemy (Tablas BD)
│   │   ├── 📁 routers/             # Endpoints de la API (FastAPI)
│   │   ├── 📁 schemas/             # Validación de datos (Pydantic)
│   │   └── 📁 services/            # Lógica de negocio y consultas a BD
│   ├── .env                        # Credenciales de conexión a BD (No versionado)
│   ├── run.py                      # Punto de entrada secundario
│   └── requirement.txt             # Dependencias de Python
│
├── 📁 ml-frontend/                 # Panel de Visualización (React)
│   ├── 📁 src/
│   │   ├── 📁 components/          # Componentes visuales (Gráficos, Tablas, Paneles)
│   │   ├── 📁 services/            # Consumo de la API Backend (Axios/Fetch)
│   │   └── App.js                  # Componente raíz
│   └── package.json                # Dependencias de Node.js
│
└── 📁 ScriptsBaseDatos/            # Scripts DDL para restaurar la base de datos
🚀 Guía de Ejecución Rápida
Sigue estos pasos para levantar el entorno completo desde cero.

1. Configuración de Base de Datos
Ejecuta los scripts ubicados en ScriptsBaseDatos/ en tu instancia local de SQL Server Management Studio (SSMS).

Asegúrate de habilitar el Puerto TCP/IP 1433 y la Autenticación de SQL Server (Modo Mixto).

Crea un usuario llamado tesis_user (o el que definas) y otórgale permisos db_owner sobre la base de datos AnalisisAcciones.

2. Configuración del Backend
Abre una terminal y navega hasta la carpeta ml-backend.

Instala las dependencias:

Bash
pip install -r requirement.txt
Crea un archivo .env en la raíz de ml-backend con tu cadena de conexión:

Fragmento de código
DATABASE_URL=mssql+pyodbc://tesis_user:TuContraseña@127.0.0.1,1433/AnalisisAcciones?driver=ODBC+Driver+17+for+SQL+Server
3. Ciclo de Vida del Modelo (El Orden Correcto)
Para que el sistema funcione, debes ejecutar los procesos en este estricto orden matemático:

Paso A: Obtener Datos (Materia Prima)
Descarga el histórico de las acciones.

Bash
python -m app.auto.actualizar_precios
Paso B: Entrenar a la IA (Aprendizaje)
Entrena la red LSTM y genera los archivos "cerebro" (.keras y .pkl). Este proceso puede tardar varios minutos.

Bash
python -m app.ml.entrenamiento
Paso C: Inferencia Diaria (Producción)
La IA analiza los datos descargados, cruza la información con el modelo y guarda su veredicto.

Bash
python -m app.auto.generar_predicciones
Paso D: Levantar la API
Enciende el servidor para que el Frontend pueda comunicarse.

Bash
uvicorn app.main:app --reload
(La documentación Swagger de la API estará disponible en: http://127.0.0.1:8000/docs)

4. Levantar el Frontend (Dashboard)
Abre otra terminal y navega hacia ml-frontend.

Instala las dependencias de Node:

Bash
npm install
Inicia la aplicación React:

Bash
npm start
El Dashboard se abrirá automáticamente en tu navegador en http://localhost:3000.
