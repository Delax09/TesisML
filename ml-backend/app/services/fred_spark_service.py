import httpx
from datetime import datetime
from pyspark.sql.types import StructType, StructField, DateType, FloatType, StringType
from app.core.config import settings
from app.core.spark_manager import SparkManager
import logging

logger = logging.getLogger(__name__)

class FredSparkClient:
    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

    @classmethod
    def obtener_serie_spark(cls, series_id: str, start_date: str = "2000-01-01"):
        """
        Descarga datos del FRED y los convierte directamente a un DataFrame de Spark
        
        Args:
            series_id: ID de la serie FRED (ej: "FEDFUNDS")
            start_date: Fecha de inicio en formato 'YYYY-MM-DD'
            
        Returns:
            DataFrame de Spark con columnas [Fecha, series_id]
            En caso de error, retorna DataFrame vacío
        """
        try:
            if not settings.FRED_API_KEY or settings.FRED_API_KEY == "":
                logger.warning("FRED_API_KEY no configurada. Retornando DataFrame vacío.")
                spark = SparkManager.get_session()
                esquema = StructType([
                    StructField("Fecha", StringType(), False),
                    StructField(series_id, FloatType(), True)
                ])
                return spark.createDataFrame([], schema=esquema)
            
            params = {
                "series_id": series_id,
                "api_key": settings.FRED_API_KEY,
                "file_type": "json",
                "observation_start": start_date
            }
            
            with httpx.Client(timeout=30.0) as client:
                response = client.get(cls.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json().get("observations", [])
                
                # Filtrar y limpiar datos corruptos o valores '.' (sin dato)
                registros_limpios = []
                for obs in data:
                    try:
                        fecha_str = obs['date']
                        valor_str = obs['value']
                        
                        # Saltar si el valor está marcado como '.'
                        if valor_str == '.':
                            continue
                            
                        valor = float(valor_str)
                        registros_limpios.append((fecha_str, valor))
                    except (ValueError, KeyError):
                        continue  # Ignorar datos corruptos

                logger.info(f"FRED {series_id}: Descargados {len(registros_limpios)} registros")

                # Definir esquema estricto para Spark (usar STRING para fecha, convertir después)
                esquema = StructType([
                    StructField("Fecha", StringType(), False),
                    StructField(series_id, FloatType(), True)
                ])

                # Paralelizar
                spark = SparkManager.get_session()
                df_spark = spark.createDataFrame(registros_limpios, schema=esquema)
                
                return df_spark
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al descargar FRED {series_id}: {e.response.status_code} - {e}")
            spark = SparkManager.get_session()
            esquema = StructType([
                StructField("Fecha", StringType(), False),
                StructField(series_id, FloatType(), True)
            ])
            return spark.createDataFrame([], schema=esquema)
        except Exception as e:
            logger.error(f"Error inesperado al obtener serie FRED {series_id}: {str(e)}")
            spark = SparkManager.get_session()
            esquema = StructType([
                StructField("Fecha", StringType(), False),
                StructField(series_id, FloatType(), True)
            ])
            return spark.createDataFrame([], schema=esquema)