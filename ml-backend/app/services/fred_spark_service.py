import httpx
from datetime import datetime
from pyspark.sql.types import StructType, StructField, DateType, FloatType
from app.core.config import settings
from app.core.spark_manager import SparkManager

class FredSparkClient:
    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

    @classmethod
    def obtener_serie_spark(cls, series_id: str, start_date: str = "2000-01-01"):
        """Descarga datos del FRED y los convierte directamente a un DataFrame de Spark"""
        params = {
            "series_id": series_id,
            "api_key": settings.FRED_API_KEY,
            "file_type": "json",
            "observation_start": start_date
        }
        
        with httpx.Client() as client:
            response = client.get(cls.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json().get("observations", [])
            
            # Filtrar y limpiar datos corruptos o valores '.' (sin dato)
            registros_limpios = []
            for obs in data:
                try:
                    fecha = datetime.strptime(obs['date'], '%Y-%m-%d').date()
                    valor = float(obs['value'])
                    registros_limpios.append((fecha, valor))
                except ValueError:
                    continue # Ignorar días sin cotización oficial

            # Definir esquema estricto para Spark
            esquema = StructType([
                StructField("Fecha", DateType(), False),
                StructField(series_id, FloatType(), True)
            ])

            # Paralelizar
            spark = SparkManager.get_session()
            df_spark = spark.createDataFrame(registros_limpios, schema=esquema)
            
            return df_spark