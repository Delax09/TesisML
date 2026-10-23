import os
from tqdm import tqdm
import sys
import torch
import gc
from concurrent.futures import ProcessPoolExecutor, as_completed
import logging

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.arquitectura.v4_lstm_cnn import obtener_modelo_v4
from app.ml.core.engine import MLEngine
from app.ml.core.logger import configurar_logger
from app.ml.core.model_versioning import ModelVersionManager

from app.ml.pipeline_cnn.data_processor import extraer_y_procesar_empresa_cnn, preparar_datos_cnn, crear_dataloaders_cnn
from app.ml.pipeline_cnn.trainer import ejecutar_entrenamiento_cnn, evaluar_modelo_cnn
from app.ml.core.utils import Timer
from app.ml.core.pipeline_trainer import fijar_semillas

# Configurar logger
logger = configurar_logger("ML.Pipeline.CNN", archivo_log="logs/cnn_pipeline.log")

def entrenar_pipeline_cnn(id_modelo: int = None):
    """Orquesta el flujo completo de entrenamiento para CNNs"""
    db = SessionLocal()
    try:
        # 1. Cargar configuración (Filtramos por v3 y v4 para CNNs)
        modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version.in_(['v3', 'v4']))
        if id_modelo: modelos = modelos.filter(ModeloIA.IdModelo == id_modelo)

        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        datos_procesados = []
        lote_size = 20

        logger.info("Iniciando extracción de datos", extra={"empresas_total": len(ids_empresas)})

        with Timer("Extracción y Procesamiento"):
            # CREAMOS UNA SOLA BARRA DE PROGRESO GLOBAL
            with tqdm(total=len(ids_empresas), desc="Procesando Empresas", file=sys.stdout) as pbar:
                for i in range(0, len(ids_empresas), lote_size):
                    lote_actual = ids_empresas[i : i + lote_size]

                    with ProcessPoolExecutor(max_workers=2) as executor:
                        futuros = [executor.submit(extraer_y_procesar_empresa_cnn, id_e) for id_e in lote_actual]

                        for f in as_completed(futuros):
                            try:
                                res = f.result(timeout=180)
                                if res is not None:
                                    datos_procesados.append(res)
                            except Exception as e:
                                logger.error("Error en procesamiento de empresa", extra={"error": str(e)}, exc_info=True)
                            finally:
                                pbar.update(1)

                    gc.collect()

        logger.info("Extracción completa", extra={"empresas_validas": len(datos_procesados)})

        # 3. Preparación de Tensores
        with Timer("Preparación de Tensores"):
            datos = preparar_datos_cnn(datos_procesados)
            scaler, test_meta = datos['scaler'], datos['test_meta']
            train_loader, val_loader, test_loader = crear_dataloaders_cnn(datos)
            del datos_procesados, datos
            gc.collect()

        # 4. Bucle de Entrenamiento por Arquitectura
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        ruta_modelos = os.path.join(os.getcwd(), "app", "ml", "models")
        os.makedirs(ruta_modelos, exist_ok=True)

        # Inicializar version manager
        version_manager = ModelVersionManager(ruta_modelos)

        for mod_db in modelos.all():
            logger.info("Iniciando entrenamiento de modelo", extra={"modelo": mod_db.Nombre, "version": mod_db.Version})
            
            fijar_semillas(MLEngine.SEED)

            if mod_db.Version == 'v4':
                modelo_pt = obtener_modelo_v4(dias_pasados = MLEngine.DIAS_MEMORIA_IA, num_features = len(MLEngine.FEATURES))
            else:
                # Por defecto usamos v3 para CNN
                modelo_pt = obtener_modelo_v3(dias_pasados = MLEngine.DIAS_MEMORIA_IA, num_features = len(MLEngine.FEATURES))

            modelo_pt.to(device)

            resultado_entrenamiento = ejecutar_entrenamiento_cnn(modelo_pt, train_loader, val_loader, device)
            modelo_pt.load_state_dict(resultado_entrenamiento["pesos"]) # Evaluar estrictamente con los MEJORES pesos

            # Evaluación final en TEST (datos que el modelo nunca vio ni se usaron para ajustar el early stopping)
            metricas = evaluar_modelo_cnn(modelo_pt, test_loader, device, 
                                         umbral_decision=resultado_entrenamiento["umbral_optimo"], meta=test_meta)
            
            metricas.update({
                'DiasFuturo': MLEngine.DIAS_PREDICCION,
                'loss': resultado_entrenamiento['loss'],
                'epochs': resultado_entrenamiento['epochs'],
                'mejor_auc_val': resultado_entrenamiento['mejor_auc_val'],
                'umbral_optimo': resultado_entrenamiento['umbral_optimo'],
                'umbral_alcista': resultado_entrenamiento['umbral_alcista'],
                'umbral_bajista': resultado_entrenamiento['umbral_bajista'],
            })
            mejores_pesos = resultado_entrenamiento["pesos"]

            # Guardar métricas en BD (MetricaService ignora silenciosamente los campos nuevos si no existen en la BD)
            db_guardado = SessionLocal()
            try:
                MetricaService.guardar_metricas(db_guardado, mod_db.IdModelo, metricas)
            finally:
                db_guardado.close()

            # Guardar modelo con versionamiento (incluyendo la configuración)
            ruta_version = version_manager.guardar_modelo_versionado(
                pesos=mejores_pesos,
                scaler=scaler,
                metricas=metricas,
                nombre_modelo=f"CNN_{mod_db.Version}",
                version=mod_db.Version,
                descripcion=f"Entrenamiento automático - {len(ids_empresas)} empresas",
                configuracion=MLEngine.configuracion()
            )

            logger.info("Modelo guardado exitosamente",
                        extra={"version": mod_db.Version, "accuracy": metricas.get('accuracy', 0),
                                "auc": metricas.get('auc', 0), "ruta": ruta_version})

        logger.info("Pipeline CNN finalizado exitosamente")

    except Exception as e:
        logger.error("Error crítico en orquestador CNN", extra={"error": str(e)}, exc_info=True)
    finally:
        # Cerrar conexión de forma segura
        try:
            if db:
                db.rollback()  # Limpiar cualquier transacción pendiente
                db.close()
        except Exception as close_error:
            logger.warning("Error cerrando conexión BD", extra={"error": str(close_error)})