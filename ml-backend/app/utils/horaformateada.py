from datetime import datetime
import pytz 

def obtener_hora_formateada() -> str:
    # Forma correcta de aplicar la zona horaria
    chilean_tz = pytz.timezone('America/Santiago')
    chilean_time = datetime.now(chilean_tz)
    # Es mejor devolver también la hora para campos DateTime
    return chilean_time.strftime("%Y-%m-%d %H:%M:%S")