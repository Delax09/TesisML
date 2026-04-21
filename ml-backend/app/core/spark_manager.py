import logging
from pyspark.sql import SparkSession

logger = logging.getLogger(__name__)

class SparkManager:
    """Gestor centralizado de la sesión de Apache Spark"""
    _spark = None

    @classmethod
    def get_session(cls, app_name="TesisML_Engine") -> SparkSession:
        """
        Obtiene o inicializa la sesión global de Spark.
        
        Args:
            app_name: Nombre de la aplicación Spark
            
        Returns:
            Instancia de SparkSession configurada
        """
        if cls._spark is None:
            try:
                logger.info("Inicializando Apache Spark Session...")
                cls._spark = (SparkSession.builder 
                    .appName(app_name) 
                    # Memoria del driver (ajustar según capacidad disponible)
                    .config("spark.driver.memory", "2g") 
                    # Habilita Apache Arrow para conversiones Pandas <-> Spark ultrarrápidas
                    .config("spark.sql.execution.arrow.pyspark.enabled", "true") 
                    # Usa todos los núcleos disponibles
                    .config("spark.master", "local[*]") 
                    # Configuraciones de optimización
                    .config("spark.sql.adaptive.enabled", "true")
                    .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
                    .getOrCreate())
                
                # Reducir el nivel de logs internos de Spark
                cls._spark.sparkContext.setLogLevel("WARN")
                logger.info(f"Spark Session iniciada exitosamente")
                
            except Exception as e:
                logger.error(f"Error al inicializar Spark Session: {str(e)}", exc_info=True)
                raise
            
        return cls._spark

    @classmethod
    def close_session(cls):
        """Cierra la sesión de Spark de forma segura"""
        try:
            if cls._spark:
                logger.info("Cerrando Apache Spark Session...")
                cls._spark.stop()
                cls._spark = None
                logger.info("Spark Session cerrada exitosamente")
        except Exception as e:
            logger.error(f"Error al cerrar Spark Session: {str(e)}", exc_info=True)