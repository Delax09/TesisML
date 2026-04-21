import os
from tqdm import tqdm
import sys
import torch
import joblib
import gc
from concurrent.futures import ProcessPoolExecutor, as_completed
import logging

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2
from app.ml.core.engine import MLEngine
from app.ml.core.logger import configurar_logger
from app.ml.core.model_versioning import ModelVersionManager

from app.ml.pipeline_lstm.data_processor import extraer_y_procesar_empresa, preparar_datos_lstm, crear_dataloaders_lstm
from app.ml.pipeline_lstm.trainer import ejecutar_entrenamiento_lstm, evaluar_modelo_lstm
from app.ml.core.utils import Timer

# Configurar logger
logger = configurar_logger("ML.Pipeline.LSTM", archivo_log="logs/lstm_pipeline.log")

def entrenar_pipeline_lstm(id_modelo: int = None):
    """Orquesta el flujo completo de entrenamiento para LSTMs"""
    db = SessionLocal()
    try:
        # 1. Cargar configuración
        modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version.in_(['v1', 'v2']))
        if id_modelo: modelos = modelos.filter(ModeloIA.IdModelo == id_modelo)

        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        datos_procesados = []
        lote_size = 20

        logger.info("Iniciando extracción de datos", extra={"empresas_total": len(ids_empresas)})

        with Timer("Extracción y Procesamiento"):
            #CREAMOS UNA SOLA BARRA DE PROGRESO GLOBAL
            with tqdm(total=len(ids_empresas), desc="Procesando Empresas", file=sys.stdout) as pbar:
                for i in range(0, len(ids_empresas), lote_size):
                    lote_actual = ids_empresas[i : i + lote_size]

                    with ProcessPoolExecutor(max_workers=2) as executor:
                        futuros = [executor.submit(extraer_y_procesar_empresa, id_e) for id_e in lote_actual]

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
            xt, yrt, yct, xv, yrv, ycv, scaler = preparar_datos_lstm(datos_procesados)
            train_loader, val_loader = crear_dataloaders_lstm(xt, yrt, yct, xv, yrv, ycv)
            del datos_procesados, xt, xv
            gc.collect()

        # 4. Bucle de Entrenamiento por Arquitectura
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        ruta_modelos = os.path.join(os.getcwd(), "app", "ml", "models")
        os.makedirs(ruta_modelos, exist_ok=True)

        # Inicializar version manager
        version_manager = ModelVersionManager(ruta_modelos)

        for mod_db in modelos.all():
            logger.info("Iniciando entrenamiento de modelo", extra={"modelo": mod_db.Nombre, "version": mod_db.Version})

            if mod_db.Version == 'v2':
                modelo_pt = obtener_modelo_v2(dias_pasados = MLEngine.DIAS_MEMORIA_IA, num_features = len(MLEngine.FEATURES))
            else:
                modelo_pt = obtener_modelo_v1(dias_pasados = MLEngine.DIAS_MEMORIA_IA, num_features = len(MLEngine.FEATURES))

            modelo_pt.to(device)

            mejores_pesos = ejecutar_entrenamiento_lstm(modelo_pt, train_loader, val_loader, device)

            # Evaluación y Guardado con umbral optimizado
            metricas = evaluar_modelo_lstm(modelo_pt, val_loader, device)
            metricas['DiasFuturo'] = MLEngine.DIAS_PREDICCION

            # Guardar métricas en BD
            db_guardado = SessionLocal()
            try:
                MetricaService.guardar_metricas(db_guardado, mod_db.IdModelo, metricas)
            finally:
                db_guardado.close()

            # Guardar modelo con versionamiento
            ruta_version = version_manager.guardar_modelo_versionado(
                mejores_pesos,
                scaler,
                metricas,
                f"LSTM_{mod_db.Version}",
                mod_db.Version,
                f"Entrenamiento automático - {len(ids_empresas)} empresas"
            )

            logger.info("Modelo guardado exitosamente",
                        extra={"version": mod_db.Version, "accuracy": metricas.get('accuracy', 0),
                                "auc": metricas.get('auc', 0), "ruta": ruta_version})

        # Guardar scaler global (para compatibilidad)
        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler.pkl"))
        logger.info("Pipeline LSTM finalizado exitosamente")

    except Exception as e:
        logger.error("Error crítico en orquestador LSTM", extra={"error": str(e)}, exc_info=True)
    finally:
        db.close()