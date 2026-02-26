"""
Paquete principal de la aplicación FastAPI.
Contiene la configuración centralizada de la app.
"""

from fastapi import FastAPI
from app.main import app

__all__ = ["app"]
