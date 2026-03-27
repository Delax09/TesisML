import gc
import math
import pandas as pd
import tensorflow as tf
from sqlalchemy.orm import Session
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA
from app.ml.engine import MLEngine
from app.services.resultado_service import ResultadoService

def limpiar_numero(valor):
    """
    Convierte los datos de Pandas a float nativo y elimina
    NaNs o Infinitos que bloquean las tablas DECIMAL de PostgreSQL.
    """
    try:
        v = float(valor)
        if math.isnan(v) or math.isinf(v):
            return 0.0
        return v
    except:
        return 0.0

def ejecutar_analisis_diario(db_request=None):
    print("Iniciando procesamiento secuencial de IA...")
    
    db = SessionLocal()
    try:
        modelos_activos = db.query(ModeloIA).filter(ModeloIA.Activo == True).all()
        if not modelos_activos:
            print("No hay modelos de IA activos en la base de datos.")
            return

        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()

        print("Extrayendo y preparando indicadores financieros...")
        datos_preparados = []
        engine_temp = MLEngine(version="dummy") 
        
        # --- CÁLCULO DINÁMICO DE DÍAS ---
        DIAS_INDICADORES = 50
        MARGEN_SEGURIDAD = 10 # Por si hay feriados o fines de semana largos
        
        # Total de días a extraer de la base de datos
        LIMITE_DB = engine_temp.DIAS_MEMORIA_IA + DIAS_INDICADORES + MARGEN_SEGURIDAD
        
        # Mínimo absoluto para que la IA y los indicadores funcionen
        MIN_DIAS_ESTRICTO = engine_temp.DIAS_MEMORIA_IA + DIAS_INDICADORES
        # --------------------------------

        for empresa in empresas: 
            # El límite ahora se ajusta de forma dinámica
            precios = db.query(PrecioHistorico).filter(
                PrecioHistorico.IdEmpresa == empresa.IdEmpresa
            ).order_by(PrecioHistorico.Fecha.desc()).limit(LIMITE_DB).all()

            # Filtro dinámico estricto
            if len(precios) < MIN_DIAS_ESTRICTO: 
                continue

            df = pd.DataFrame([{
                'Close': float(p.PrecioCierre),
                'Volume': float(p.Volumen) if p.Volumen else 0.0,
                'High' : float(p.PrecioCierre),
                'Low': float(p.PrecioCierre)
            } for p in reversed(precios)])

            df_ind = engine_temp.calcular_indicadores(df)
            
            if len(df_ind) >= engine_temp.DIAS_MEMORIA_IA:
                datos_preparados.append({
                    "empresa": empresa,
                    "df_ind": df_ind
                })

        for modelo in modelos_activos:
            print(f"\nCARGANDO MOTOR: {modelo.Nombre} (ID: {modelo.IdModelo})")
            engine = MLEngine(version=modelo.Version) 
            
            if engine.model is None:
                continue

            print(f"Prediciendo con {modelo.Nombre}...")
            for data in datos_preparados:
                empresa = data["empresa"]
                df_ind = data["df_ind"]
                
                pred = engine.predecir(df_ind)
                if pred:
                    pred_limpio = {
                        "prediccion": limpiar_numero(pred['prediccion']),
                        "variacion": limpiar_numero(pred['variacion']),
                        "score": limpiar_numero(pred['score']),
                        "recomendacion": str(pred['recomendacion']),
                        "id_modelo": int(modelo.IdModelo),
                    }
                    features_limpias = {
                        "Close": limpiar_numero(pred['features']['Close']),
                        "RSI": limpiar_numero(pred['features']['RSI']),
                        "MACD": limpiar_numero(pred['features']['MACD']),
                        "ATR": limpiar_numero(pred['features']['ATR']),
                        "EMA20": limpiar_numero(pred['features']['EMA20']),
                        "EMA50": limpiar_numero(pred['features']['EMA50']),
                    }

                    try:
                        ResultadoService.guardar_prediccion(db, empresa.IdEmpresa, pred_limpio, features_limpias)
                    except Exception as e:
                        print(f"Error DB en {empresa.Ticket}: {e}")
                        db.rollback()
                        
            print(f"Predicciones listas para {modelo.Nombre}.")
            
            
            del engine.model
            del engine
            tf.keras.backend.clear_session()
            gc.collect()

        print("\nAnálisis masivo completado exitosamente.")
    finally:
        db.close() 