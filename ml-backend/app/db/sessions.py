# app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,          # Aumenta el número de conexiones simultáneas permitidas
    max_overflow=10,       # Permite 10 conexiones extra si hay un pico de peticiones
    pool_timeout=30,       # Tiempo máximo de espera para obtener una conexión
    pool_pre_ping=True,    # VERIFICACIÓN CLAVE: Comprueba si la conexión está viva antes de usarla
    pool_recycle=1800      # Recicla las conexiones cada 30 minutos para evitar desconexiones por inactividad
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependencia para obtener la sesión de DB en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()