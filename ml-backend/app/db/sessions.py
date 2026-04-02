from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

# Forzamos la desactivación de prepared statements en SQLAlchemy y Psycopg3
engine = create_engine(
    settings.DATABASE_URL,
    execution_options={
        "prepared_statement_cache_size": 0 # Apaga el caché de SQLAlchemy
    },
    connect_args={
        "prepare_threshold": None
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()