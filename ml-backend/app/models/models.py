"""
Archivo legacy que agrupa todos los modelos. Mantiene importaciones para
compatibilidad hacia atrás pero está deprecado. Los modelos ahora viven
en archivos individuales bajo `app/models/`.
"""

from app.models.sector import Sector
from app.models.empresa import Empresa
from app.models.resultado import Resultado
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.models.portafolio import Portafolio
from app.models.precio_historico import PrecioHistorico

# Nota: este módulo seguirá existiendo temporalmente para evitar romper
# imports anteriores. Gradualmente migrar los `from app.models.models ...`
# hacia `from app.models import Sector` etc.
