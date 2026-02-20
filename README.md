Directorio del Proyecto

stock-ml-project/
│
├── backend/                    # API con FastAPI
│   ├── app/
│   │   ├── api/                # Rutas de la API
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/  # predict.py, stocks.py, users.py
│   │   │   │   └── api_router.py
│   │   ├── core/               # Configuración (config.py, security.py)
│   │   ├── db/                 # Conexión a SQL Server (session.py, base.py)
│   │   ├── models/             # Modelos de SQLAlchemy (Tablas DB)
│   │   ├── schemas/            # Schemas de Pydantic (Validación de entrada/salida)
│   │   ├── services/           # Lógica de negocio (Llamadas al modelo ML)
│   │   └── main.py             # Punto de entrada de FastAPI
│   ├── ml/                     # Módulo de Machine Learning
│   │   ├── notebooks/          # EDA y experimentos (.ipynb)
│   │   ├── training/           # Scripts de entrenamiento (.py)
│   │   ├── saved_models/       # Modelos exportados (.pkl, .h5, .joblib)
│   │   └── preprocessing/      # Limpieza y normalización de datos de tickers
│   ├── .env                    # Variables de entorno (DB_URL, API_KEYS)
│   ├── requirements.txt        # Dependencias de Python
│   └── Dockerfile              # Empaquetado del Backend
│
├── frontend/                   # Interfaz con React + Vite
│   ├── public/                 # Assets estáticos
│   ├── src/
│   │   ├── assets/             # CSS global e imágenes
│   │   ├── components/         # Componentes UI (Cards, Gráficos, Navbar)
│   │   ├── hooks/              # Custom hooks (useStocks, usePredictions)
│   │   ├── services/           # Clientes API (axios.ts para conectar al backend)
│   │   ├── types/              # Interfaces de TypeScript
│   │   ├── utils/              # Formateadores de moneda y fechas
│   │   ├── App.tsx             # Rutas y estructura principal
│   │   └── main.tsx            # Renderizado inicial
│   ├── index.html
│   ├── tailwind.config.js      # Configuración de estilos
│   ├── package.json            # Dependencias de Node.js
│   └── vite.config.ts          # Configuración de Vite (Proxy y build)
│
├── docs/                       # Documentación de la tesis, diagramas y manuales
├── .gitignore                  # Excluye venv/, node_modules/, .env, y modelos pesados
├── docker-compose.yml          # Orquestación de Backend + Frontend + SQL Server
└── README.md                   # Instrucciones generales del proyecto
