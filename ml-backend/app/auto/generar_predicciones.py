import gc
import math
import pandas as pd
import tensorflow as tf
from sqlalchemy.orm import Session
from app.db.sessions import SessionLocal # Importamos el creador de sesiones
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
    print("🚀 Iniciando procesamiento secuencial de IA...")
    
    # SOLUCIÓN 1: Abrir una sesión DB completamente independiente
    # vital para tareas en segundo plano.
    db = SessionLocal()
    try:
        modelos_activos = db.query(ModeloIA).filter(ModeloIA.Activo == True).all()
        if not modelos_activos:
            print("⚠️ No hay modelos de IA activos en la base de datos.")
            return

        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()

        print("📊 Extrayendo y preparando indicadores financieros...")
        datos_preparados = []
        engine_temp = MLEngine(version="dummy") 
        
        for empresa in empresas: 
            precios = db.query(PrecioHistorico).filter(
                PrecioHistorico.IdEmpresa == empresa.IdEmpresa
            ).order_by(PrecioHistorico.Fecha.desc()).limit(300).all() #LIMIT TIENE QUE SER MAYOR QUE LOS DIAS QUE TRAE LA IA

            if len(precios) < 50: 
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
            print(f"\n⚙️ CARGANDO MOTOR: {modelo.Nombre} (ID: {modelo.IdModelo})")
            engine = MLEngine(version=modelo.Version) 
            
            if engine.model is None:
                continue

            print(f"🧠 Prediciendo con {modelo.Nombre}...")
            for data in datos_preparados:
                empresa = data["empresa"]
                df_ind = data["df_ind"]
                
                pred = engine.predecir(df_ind)
                if pred:
                    # SOLUCIÓN 3: Filtro anti-NaN en todos los cálculos
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
                        print(f"❌ Error DB en {empresa.Ticket}: {e}")
                        db.rollback() 
                        
            print(f"✅ Predicciones listas para {modelo.Nombre}.")
            
            del engine.model
            del engine
            tf.keras.backend.clear_session()
            gc.collect()

        print("\n🎉 Análisis diario completado exitosamente.")
    finally:
        db.close()