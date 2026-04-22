import gc
import math
import pandas as pd
import logging
from pathlib import Path
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.models.modelo_ia import ModeloIA
from app.ml.core.engine import MLEngine #Aqui esta el MLEngine 
from app.services.resultado_service import ResultadoService

logger = logging.getLogger(__name__)

def limpiar_numero(valor):
    try:
        v = float(valor)
        return 0.0 if math.isnan(v) or math.isinf(v) else v
    except: 
        return 0.0

def validar_modelo_existe(version):
    """Valida que el archivo .pth del modelo exista en el directorio raíz de models"""
    # Normalizar versión: "vv3" → "v3", etc.
    version_normalizada = version.lstrip('v') if version.startswith('vv') else version
    modelo_path = Path(__file__).parent.parent / "ml" / "models" / f"modelo_acciones_{version_normalizada}.pth"
    return modelo_path.exists()

def ejecutar_analisis_diario(modelo_id = None):
    print("🚀 Iniciando procesamiento secuencial de IA...")
    db = SessionLocal()
    try:
        logger.info("📦 Inicializando MLEngine...")

        # 1. Aplanamos modelos a diccionarios simples
        modelos_db = db.query(ModeloIA).filter(ModeloIA.Activo == True)
        if modelo_id:
            modelos_db = modelos_db.filter(ModeloIA.IdModelo == modelo_id)
        modelos_activos = [{"id": m.IdModelo, "nombre": m.Nombre, "version": m.Version} for m in modelos_db]
        print(f"📊 Modelos activos encontrados: {len(modelos_activos)}")
        db.expunge_all()

        # 2. Preparar datos
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"🏢 Empresas activas encontradas: {len(empresas)}")

        #Validar que al menos un modelo exista antes de crear engine temporal
        if not modelos_activos:
            logger.error("❌ No hay modelos activos en la base de datos")
            return {"status": "error", "mensaje": "No hay modelos activos"}

        try:
            # Usar el primer modelo activo como referencia temporal
            engine_temp = MLEngine(version=modelos_activos[0]['version'])
            if not hasattr(engine_temp, 'DIAS_MEMORIA_IA'):
                logger.error("❌ MLEngine no tiene atributo DIAS_MEMORIA_IA")
                return {"status": "error", "mensaje": "Configuración de MLEngine inválida"}
        except Exception as e:
            logger.error(f"❌ Error inicializando MLEngine: {e}")
            return {"status": "error", "mensaje": str(e)}

        LIMITE_DB = engine_temp.DIAS_MEMORIA_IA + 60  # Margen para EMA50 + Feriados

        datos_preparados = []
        for emp in empresas:
            try:
                precios = db.query(PrecioHistorico).filter(PrecioHistorico.IdEmpresa == emp.IdEmpresa)\
                            .order_by(PrecioHistorico.Fecha.desc()).limit(LIMITE_DB).all()

                if len(precios) < engine_temp.DIAS_MEMORIA_IA + 50:
                    print(f"⚠️ Empresa {emp.Ticket}: insuficientes datos ({len(precios)} < {engine_temp.DIAS_MEMORIA_IA + 50})")
                    continue

                df = pd.DataFrame([{'Close': float(p.PrecioCierre), 
                                    'Volume': float(p.Volumen),
                                    'High': float(p.PrecioMaximo if p.PrecioMaximo else p.PrecioCierre), 
                                    'Low': float(p.PrecioMinimo if p.PrecioMinimo else p.PrecioCierre)} 
                                   for p in reversed(precios)])

                # ✅ FIX 2: Validar que el método existe
                if not hasattr(engine_temp, 'calcular_indicadores'):
                    logger.error(f"❌ MLEngine no tiene método calcular_indicadores")
                    continue

                df_indicadores = engine_temp.calcular_indicadores(df)
                if df_indicadores is None or df_indicadores.empty:
                    logger.warning(f"⚠️ Indicadores vacíos para {emp.Ticket}")
                    continue

                datos_preparados.append({"id": emp.IdEmpresa, "tk": emp.Ticket, "df": df_indicadores})
            except Exception as e:
                db.rollback()
                logger.warning(f"⚠️ Error procesando empresa {emp.Ticket}: {e}")
                continue

        print(f"📈 Datos preparados para {len(datos_preparados)} empresas")

        # 3. Ciclo de modelos
        total_predicciones_guardadas = 0
        for mod in modelos_activos:
            print(f"\n🔧 CARGANDO: {mod['nombre']} (v{mod['version']})")
            
            # ✅ FIX 3: Validar que el modelo existe antes de intentar cargarlo
            if not validar_modelo_existe(mod['version']):
                logger.warning(f"⚠️ Modelo {mod['nombre']} v{mod['version']} no encontrado en sistema de archivos")
                continue

            try:
                engine = MLEngine(version=mod['version'])
            except Exception as e:
                logger.error(f"❌ Error cargando modelo {mod['nombre']}: {e}")
                continue
            
            # ✅ FIX 4: Validar atributo 'model' de forma segura
            if not hasattr(engine, 'model') or engine.model is None:
                logger.warning(f"⚠️ Modelo {mod['nombre']} no se cargó correctamente")
                continue

            # ✅ FIX 5: Validar que el método predecir existe
            if not hasattr(engine, 'predecir'):
                logger.error(f"❌ MLEngine no tiene método predecir")
                continue

            predicciones_modelo = 0
            for data in datos_preparados:
                try:
                    pred = engine.predecir(data["df"])
                    
                    # ✅ FIX 6: Validar estructura de predicción
                    if pred is None:
                        logger.warning(f"⚠️ Predicción nula para {data['tk']} con modelo {mod['nombre']}")
                        continue

                    if not isinstance(pred, dict):
                        logger.warning(f"⚠️ Predicción no es diccionario para {data['tk']}")
                        continue

                    if 'recomendacion' not in pred or 'features' not in pred:
                        logger.warning(f"⚠️ Predicción incompleta para {data['tk']}: {pred.keys()}")
                        continue

                    pred_l = {k: limpiar_numero(v) for k, v in pred.items() if k not in ['recomendacion', 'features']}
                    pred_l['recomendacion'] = pred['recomendacion']
                    pred_l['id_modelo'] = mod['id']
                    feat_l = {k: limpiar_numero(v) for k, v in pred['features'].items()}
                    
                    # ✅ FIX 7: Validar que ResultadoService existe y tiene el método
                    if not hasattr(ResultadoService, 'guardar_prediccion'):
                        logger.error(f"❌ ResultadoService no tiene método guardar_prediccion")
                        continue

                    try:
                        ResultadoService.guardar_prediccion(db, data["id"], pred_l, feat_l)
                        predicciones_modelo += 1
                        total_predicciones_guardadas += 1
                        logger.info(f"✅ Guardada predicción {mod['nombre']} -> {data['tk']}")
                    except Exception as e:
                        db.rollback()
                        logger.warning(f"⚠️ Error guardando predicción de modelo {mod['nombre']}: {e}")
                except Exception as e:
                    db.rollback()
                    logger.warning(f"⚠️ Error prediciendo con modelo {mod['nombre']}: {e}")
                    continue
            
            logger.info(f"📊 Modelo {mod['nombre']}: {predicciones_modelo} predicciones guardadas")
            # ✅ FIX 8: Eliminar referencia sin gc.collect()
            engine = None
        
        print(f"\n🎉 Proceso completado. Total predicciones guardadas: {total_predicciones_guardadas}")
        return {"status": "success", "mensaje": f"Análisis completado. {total_predicciones_guardadas} predicciones guardadas"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error en análisis diario: {e}", exc_info=True)
        return {"status": "error", "mensaje": str(e)}
    finally: 
        db.close()