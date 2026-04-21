import logging
from pyspark.sql import SparkSession

logger = logging.getLogger(__name__)

class SparkManager:
    _spark = None

    @classmethod
    def get_session(cls, app_name="TesisML_Engine") -> SparkSession:
        if cls._spark is None:
            logger.info("Inicializando Apache Spark Session...")
            cls._spark = (SparkSession.builder 
                .appName(app_name) 
                # Ajusta la memoria según la capacidad de tu entorno (ej. 2g = 2 Gigabytes)
                .config("spark.driver.memory", "2g") 
                # Habilita Apache Arrow para conversiones Pandas <-> Spark ultrarrápidas
                .config("spark.sql.execution.arrow.pyspark.enabled", "true") 
                # Evita que Spark reserve todos los núcleos si hay otras APIs corriendo
                .config("spark.master", "local[*]") 
                .getOrCreate())
            
            # Reducir el nivel de logs internos de Spark para no saturar tu terminal
            cls._spark.sparkContext.setLogLevel("WARN")
            
        return cls._spark

    @classmethod
    def close_session(cls):
        if cls._spark:
            cls._spark.stop()
            cls._spark = None