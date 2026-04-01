"""
Configuración centralizada de la aplicación.
Carga variables de entorno desde el archivo .env
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Configuración de la aplicación desde variables de entorno."""
    
    # Información de la aplicación
    PROJECT_NAME: str = "TesisML API"
    VERSION: str = "1.0.0"
    # Base de datos
    DATABASE_URL: str
    # API
    API_V1_STR: str = "/api/v1"
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    # Logging
    LOG_LEVEL: str = "INFO"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FINNHUB_API_KEY: str

    class Config:
        """Configuración de Pydantic Settings."""
        env_file = ".env"
        env_file_encoding = "utf-8"


# Instancia global de configuración
settings = Settings()