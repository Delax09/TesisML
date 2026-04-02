import gc
import math
import pandas as pd
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA
from app.ml.engine import MLEngine
from app.services.resultado_service import ResultadoService

try:
    import tensorflow as tf
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False

def limpiar_numero(valor):
    try:
        v = float(valor)
        return 0.0 if math.isnan(v) or math.isinf(v) else v
    except: return 0.0

def ejecutar_analisis_diario():
    print("🚀 Iniciando procesamiento secuencial de IA...")
    db = SessionLocal()
    try:
        # 1. Aplanamos modelos a diccionarios simples (evita DuplicatePreparedStatement)
        modelos_db = db.query(ModeloIA).filter(ModeloIA.Activo == True).all()
        modelos_activos = [{"id": m.IdModelo, "nombre": m.Nombre, "version": m.Version} for m in modelos_db]
        db.expunge_all()

        # 2. Preparar datos
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        engine_temp = MLEngine(version="dummy")
        LIMITE_DB = engine_temp.DIAS_MEMORIA_IA + 60 # Margen para EMA50 + Feriados
        
        datos_preparados = []
        for emp in empresas:
            precios = db.query(PrecioHistorico).filter(PrecioHistorico.IdEmpresa == emp.IdEmpresa)\
                        .order_by(PrecioHistorico.Fecha.desc()).limit(LIMITE_DB).all()
            if len(precios) < engine_temp.DIAS_MEMORIA_IA + 50: continue

            df = pd.DataFrame([{'Close': float(p.PrecioCierre), 'Volume': float(p.Volumen or 0),
                                'High': float(p.PrecioCierre), 'Low': float(p.PrecioCierre)} for p in reversed(precios)])
            datos_preparados.append({"id": emp.IdEmpresa, "tk": emp.Ticket, "df": engine_temp.calcular_indicadores(df)})

        # 3. Ciclo de modelos
        for mod in modelos_activos:
            print(f"\n⚙️ CARGANDO: {mod['nombre']}")
            engine = MLEngine(version=mod['version'])
            if not engine.model: continue

            for data in datos_preparados:
                pred = engine.predecir(data["df"])
                if pred:
                    pred_l = {k: limpiar_numero(v) for k, v in pred.items() if k != 'recomendacion' and k != 'features'}
                    pred_l['recomendacion'] = pred['recomendacion']
                    pred_l['id_modelo'] = mod['id']
                    feat_l = {k: limpiar_numero(v) for k, v in pred['features'].items()}
                    try:
                        ResultadoService.guardar_prediccion(db, data["id"], pred_l, feat_l)
                    except: db.rollback()
            
            del engine.model
            if IA_AVAILABLE:
                tf.keras.backend.clear_session()
            gc.collect()
        print("\n🎉 Proceso completado.")
    finally: db.close()