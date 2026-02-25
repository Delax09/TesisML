# app/db/session.py
from sqlalchemy import create_all, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
servidor = 'VICTUSFABIAN'
base_datos = "AnalisisAcciones"

# Conexión a SQL Server local sin usuario/contraseña usando Windows Authentication
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc://@{servidor}/{base_datos}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para obtener la sesión de DB en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()