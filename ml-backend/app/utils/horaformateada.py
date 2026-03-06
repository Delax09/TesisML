from datetime import datetime
import pytz 


#Solo traigo la fecha
# Hasta llega a un acuerdo de que guardar en la base de datos

def obtener_hora_formateada() -> str:
    utc_now = datetime.utcnow()
    chilean_tz = pytz.timezone('America/Santiago')
    chilean_time = utc_now.replace(chilean_tz)
    return chilean_time.strftime("%Y-%m-%d")