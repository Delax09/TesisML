import pandas as pd
from pyspark.sql import Window
from pyspark.sql import functions as F
from app.core.spark_manager import SparkManager
from app.services.fred_spark_service import FredSparkClient

def fusionar_datos_con_spark(df_precios_pandas: pd.DataFrame) -> pd.DataFrame:
    """
    Toma el histórico de precios de una empresa, lo cruza con indicadores 
    macroeconómicos del FRED usando Spark, y lo devuelve enriquecido.
    """
    if df_precios_pandas.empty:
        return df_precios_pandas

    spark = SparkManager.get_session()
    
    # 1. Convertir Pandas DF a Spark DF (Ultrarrápido gracias a Apache Arrow)
    # Asumimos que df_precios_pandas tiene una columna 'Fecha'
    df_acciones = spark.createDataFrame(df_precios_pandas)
    
    # Obtener fecha mínima para optimizar la descarga
    fecha_minima = pd.to_datetime(df_precios_pandas['Fecha'].min())
    data_inicio = (fecha_minima - pd.Timedelta(days=60)).strftime('%Y-%m-%d')
    
    # 2. Descargar macroeconomía a Spark
    df_fedfunds = FredSparkClient.obtener_serie_spark("FEDFUNDS", start_date=data_inicio)
    
    # 3. Operación Join (Left Join para mantener el calendario bursátil)
    df_fusionado = df_acciones.join(df_fedfunds, on="Fecha", how="left")
    
    # 4. Interpolación Forward Fill distribuida (Equivalente al ffill() de Pandas)
    # Como FEDFUNDS es mensual, rellenamos hacia adelante para los días bursátiles
    window_spec = Window.orderBy("Fecha").rowsBetween(Window.unboundedPreceding, Window.currentRow)
    
    df_fusionado = df_fusionado.withColumn(
        "FEDFUNDS", 
        F.last("FEDFUNDS", ignorenulls=True).over(window_spec)
    )
    
    # Si quedan nulos al principio, rellenamos con backfill
    window_spec_bfill = Window.orderBy("Fecha").rowsBetween(Window.currentRow, Window.unboundedFollowing)
    df_fusionado = df_fusionado.withColumn(
        "FEDFUNDS", 
        F.coalesce(F.col("FEDFUNDS"), F.first("FEDFUNDS", ignorenulls=True).over(window_spec_bfill))
    )
    
    # Ordenar y retornar a Pandas para conectarlo con tu arquitectura NumPy/PyTorch
    df_final_pandas = df_fusionado.orderBy("Fecha").toPandas()
    
    return df_final_pandas