import gc
import math
import pandas as pd
import logging
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA
from app.ml.engine import MLEngine
from app.services.resultado_service import ResultadoService

logger = logging.getLogger(__name__)

def limpiar_numero(valor):
    try:
        v = float(valor)
        return 0.0 if math.isnan(v) or math.isinf(v) else v
    except: 
        return 0.0

def ejecutar_analisis_diario(modelo_id = None):
    print("🚀 Iniciando procesamiento secuencial de IA...")
    db = SessionLocal()
    try:
        logger.info("📦 Inicializando MLEngine...")


        # 1. Aplanamos modelos a diccionarios simples (evita DuplicatePreparedStatement)
        modelos_db = db.query(ModeloIA).filter(ModeloIA.Activo == True)
        if modelo_id:
            modelo_db = modelos_db.filter(ModeloIA.IdModelo == modelo_id)
        modelos_activos = [{"id": m.IdModelo, "nombre": m.Nombre, "version": m.Version} for m in modelos_db]
        print(f"📊 Modelos activos encontrados: {len(modelos_activos)}")
        db.expunge_all()

        # 2. Preparar datos
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"🏢 Empresas activas encontradas: {len(empresas)}")

        try:
            engine_temp = MLEngine(version="dummy")
        except Exception as e:
            logger.error(f"❌ Error inicializando MLEngine: {e}")
            return {"status": "error", "mensaje": str(e)}

        LIMITE_DB = engine_temp.DIAS_MEMORIA_IA + 60 # Margen para EMA50 + Feriados

        datos_preparados = []
        for emp in empresas:
            try:
                precios = db.query(PrecioHistorico).filter(PrecioHistorico.IdEmpresa == emp.IdEmpresa)\
                            .order_by(PrecioHistorico.Fecha.desc()).limit(LIMITE_DB).all()

                if len(precios) < engine_temp.DIAS_MEMORIA_IA + 50:
                    print(f"⚠️ Empresa {emp.Ticket}: insuficientes datos ({len(precios)} < {engine_temp.DIAS_MEMORIA_IA + 50})")
                    continue

                df = pd.DataFrame([{'Close': float(p.PrecioCierre), 'Volume': float(p.Volumen or 0),
                                    'High': float(p.PrecioCierre), 'Low': float(p.PrecioCierre)} for p in reversed(precios)])

                datos_preparados.append({"id": emp.IdEmpresa, "tk": emp.Ticket, "df": engine_temp.calcular_indicadores(df)})
            except Exception as e:
                db.rollback() # <-- 🛡️ PARCHE 1: Limpiamos la conexión si la extracción falla
                logger.warning(f"⚠️ Error procesando empresa {emp.Ticket}: {e}")
                continue

        print(f"📈 Datos preparados para {len(datos_preparados)} empresas")

        # 3. Ciclo de modelos
        total_predicciones_guardadas = 0
        for mod in modelos_activos:
            print(f"\n⚙️ CARGANDO: {mod['nombre']}")
            try:
                engine = MLEngine(version=mod['version'])
            except Exception as e:
                logger.error(f"❌ Error cargando modelo {mod['nombre']}: {e}")
                continue
            
            if not engine.model: 
                print(f"⚠️ Modelo {mod['nombre']} no tiene modelo cargado")
                continue

            predicciones_modelo = 0
            for data in datos_preparados:
                try:
                    pred = engine.predecir(data["df"])
                    if pred:
                        pred_l = {k: limpiar_numero(v) for k, v in pred.items() if k != 'recomendacion' and k != 'features'}
                        pred_l['recomendacion'] = pred['recomendacion']
                        pred_l['id_modelo'] = mod['id']
                        feat_l = {k: limpiar_numero(v) for k, v in pred['features'].items()}
                        try:
                            ResultadoService.guardar_prediccion(db, data["id"], pred_l, feat_l)
                            predicciones_modelo += 1
                            total_predicciones_guardadas += 1
                            print(f"✅ Guardada predicción {mod['nombre']} -> {data['tk']}")
                        except Exception as e:
                            db.rollback() # Ya lo tenías, ¡muy bien!
                            logger.warning(f"⚠️ Error guardando predicción de modelo {mod['nombre']}: {e}")
                    else:
                        print(f"⚠️ Predicción fallida para {data['tk']} con modelo {mod['nombre']}")
                except Exception as e:
                    db.rollback() # <-- 🛡️ PARCHE 2: Limpiamos la conexión si la inferencia falla
                    logger.warning(f"⚠️ Error prediciendo con modelo {mod['nombre']}: {e}")
                    continue
            
            print(f"📊 Modelo {mod['nombre']}: {predicciones_modelo} predicciones guardadas")
            del engine.model
            gc.collect()
        
        print(f"\n🎉 Proceso completado. Total predicciones guardadas: {total_predicciones_guardadas}")
        return {"status": "success", "mensaje": f"Análisis completado. {total_predicciones_guardadas} predicciones guardadas"}
        
    except Exception as e:
        db.rollback() # <-- 🛡️ PARCHE 3: Seguridad general al nivel de la tarea
        logger.error(f"❌ Error en análisis diario: {e}")
        return {"status": "error", "mensaje": str(e)}
    finally: 
        db.close()