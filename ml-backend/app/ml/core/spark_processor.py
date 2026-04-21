import pandas as pd
from pyspark.sql import Window
from pyspark.sql import functions as F
from pyspark.sql.types import StringType
from app.core.spark_manager import SparkManager
from app.services.fred_spark_service import FredSparkClient
import logging

logger = logging.getLogger(__name__)

def fusionar_datos_con_spark(df_precios_pandas: pd.DataFrame) -> pd.DataFrame:
    """
    Toma el histórico de precios de una empresa, lo cruza con indicadores 
    macroeconómicos del FRED usando Spark, y lo devuelve enriquecido.
    
    Args:
        df_precios_pandas: DataFrame de Pandas con precios (índice puede ser Date)
        
    Returns:
        DataFrame enriquecido con datos de FRED, o el DataFrame original si hay error
    """
    if df_precios_pandas is None or df_precios_pandas.empty:
        logger.warning("DataFrame vacío recibido en fusionar_datos_con_spark")
        return df_precios_pandas

    try:
        spark = SparkManager.get_session()
        
        # 1. Resetear índice si Date está como índice (necesario para la conversión)
        df_trabajo = df_precios_pandas.copy()
        if df_trabajo.index.name == 'Date' or df_trabajo.index.name == 'Fecha':
            df_trabajo = df_trabajo.reset_index()
        
        # Normalizar nombre de columna de fecha
        if 'Date' in df_trabajo.columns:
            df_trabajo = df_trabajo.rename(columns={'Date': 'Fecha'})
        
        # Validar que exista la columna Fecha
        if 'Fecha' not in df_trabajo.columns:
            logger.warning("Columna 'Fecha' no encontrada. Retornando DataFrame sin enriquecer.")
            return df_precios_pandas
        
        # Convertir a string para compatibilidad con Spark
        df_trabajo['Fecha'] = pd.to_datetime(df_trabajo['Fecha']).astype(str)
        
        # 2. Convertir Pandas DF a Spark DF (Ultrarrápido gracias a Apache Arrow)
        df_acciones = spark.createDataFrame(df_trabajo)
        
        # 3. Obtener fecha mínima para optimizar la descarga
        fecha_minima = pd.to_datetime(df_precios_pandas.index.min() if df_precios_pandas.index.name in ['Date', 'Fecha'] 
                                        else df_precios_pandas['Fecha'].min())
        data_inicio = (fecha_minima - pd.Timedelta(days=60)).strftime('%Y-%m-%d')
        
        # 4. Descargar macroeconomía a Spark con fallback seguro
        logger.info(f"Descargando datos FRED desde {data_inicio}...")
        df_fedfunds = FredSparkClient.obtener_serie_spark("FEDFUNDS", start_date=data_inicio)
        
        # Si FRED retorna DataFrame vacío, retornar datos sin enriquecer
        if df_fedfunds.count() == 0:
            logger.warning("FRED retornó datos vacíos. Continuando sin enriquecimiento.")
            return df_precios_pandas
        
        # 5. Operación Join (Left Join para mantener el calendario bursátil)
        df_fusionado = df_acciones.join(df_fedfunds, on="Fecha", how="left")
        
        # 6. Interpolación Forward Fill distribuida (Equivalente al ffill() de Pandas)
        # Como FEDFUNDS es mensual, rellenamos hacia adelante para los días bursátiles
        window_spec = Window.orderBy("Fecha").rowsBetween(Window.unboundedPreceding, Window.currentRow)
        
        df_fusionado = df_fusionado.withColumn(
            "FEDFUNDS", 
            F.last("FEDFUNDS", ignorenulls=True).over(window_spec)
        )
        
        # 7. Si quedan nulos al principio, rellenamos con backfill
        window_spec_bfill = Window.orderBy("Fecha").rowsBetween(Window.currentRow, Window.unboundedFollowing)
        df_fusionado = df_fusionado.withColumn(
            "FEDFUNDS", 
            F.coalesce(F.col("FEDFUNDS"), F.first("FEDFUNDS", ignorenulls=True).over(window_spec_bfill))
        )
        
        # 8. Fillna final para cualquier NULL restante (asignar 0.0 como último recurso)
        df_fusionado = df_fusionado.fillna(0.0, subset=["FEDFUNDS"])
        
        # 9. Ordenar y retornar a Pandas para conectarlo con tu arquitectura NumPy/PyTorch
        df_final_pandas = df_fusionado.orderBy("Fecha").toPandas()
        
        # Restaurar el índice con el formato original si es necesario
        if 'Fecha' in df_final_pandas.columns:
            df_final_pandas['Fecha'] = pd.to_datetime(df_final_pandas['Fecha'])
        
        logger.info(f"Enriquecimiento con Spark completado. Filas: {len(df_final_pandas)}, Columnas: {len(df_final_pandas.columns)}")
        return df_final_pandas
        
    except Exception as e:
        logger.error(f"Error al fusionar datos con Spark: {str(e)}", exc_info=True)
        logger.warning("Retornando DataFrame original sin enriquecimiento de FRED")
        return df_precios_pandas