# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks, status, Request, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date
from pydantic import BaseModel
import json
import os
import math
import logging
import asyncio

from app.db.sessions import get_db, SessionLocal
from app.services.metrica_service import MetricaService
from app.models.metrica_modelo import MetricaModelo
from app.models.precio_historico import PrecioHistorico
from app.models.resultado import Resultado
from app.models.modelo_ia import ModeloIA

logger = logging.getLogger(__name__)

# Referencias inicializadas en None para evitar NameError en /diagnostico
MLEngine = None
ejecutar_analisis_diario = None
entrenar_pipeline_lstm = None
entrenar_pipeline_cnn = None
import_errors = {}

try:
    from app.ml.core.engine import MLEngine
except Exception as e:
    logger.exception(f"❌ Error importando MLEngine: {e}")
    import_errors["MLEngine"] = str(e)

try:
    from app.auto.generar_predicciones import ejecutar_analisis_diario
except Exception as e:
    logger.exception(f"❌ Error importando generar_predicciones: {e}")
    import_errors["generar_predicciones"] = str(e)

try:
    from app.ml.pipeline_lstm.orquestador import entrenar_pipeline_lstm
except Exception as e:
    logger.exception(f"❌ Error importando pipeline_lstm: {e}")
    import_errors["pipeline_lstm"] = str(e)

try:
    from app.ml.pipeline_cnn.orquestador import entrenar_pipeline_cnn
except Exception as e:
    logger.exception(f"❌ Error importando pipeline_cnn: {e}")
    import_errors["pipeline_cnn"] = str(e)

IA_AVAILABLE = len(import_errors) == 0

router = APIRouter(prefix="/api/v1/ia", tags=["IA Engine"])


@router.get("/diagnostico")
def diagnostico_ia():
    """Endpoint para verificar el estado de cada módulo ML y ver errores específicos."""
    features = MLEngine.FEATURES if (MLEngine is not None and hasattr(MLEngine, "FEATURES")) else []
    return {
        "ia_available": IA_AVAILABLE,
        "modulos": {
            "MLEngine": MLEngine is not None,
            "generar_predicciones": ejecutar_analisis_diario is not None,
            "pipeline_lstm": entrenar_pipeline_lstm is not None,
            "pipeline_cnn": entrenar_pipeline_cnn is not None,
        },
        "import_errors": import_errors if import_errors else "Ninguno",
        "status": "OK ✅" if IA_AVAILABLE else "PROBLEMAS ❌",
        "beta_status": "❌ REMOVIDO (por performance)",
        "features_count": len(features),
        "features": features,
    }


@router.post("/analizar-todo")
async def analizar_todas_las_empresas(background_tasks: BackgroundTasks):
    if ejecutar_analisis_diario is None:
        detail = f"Análisis masivo no disponible. Error: {import_errors.get('generar_predicciones', 'Módulo deshabilitado')}"
        raise HTTPException(status_code=501, detail=detail)

    background_tasks.add_task(ejecutar_analisis_diario)
    return {"status": "success", "message": "Análisis masivo de IA iniciado en segundo plano."}


@router.get("/metricas")
def obtener_metricas_modelo():
    ruta_metricas = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "metricas.json")

    try:
        with open(ruta_metricas, "r") as f:
            metricas = json.load(f)
            return metricas
    except FileNotFoundError:
        return {"Error": "Metricas no encontradas"}


@router.get("/rendimiento-sistema")
def obtener_rendimiento_sistema():
    """Endpoint para monitorear el rendimiento del sistema en tiempo real"""
    try:
        from app.ml.core.utils import monitorear_recursos
        import torch

        recursos = monitorear_recursos()

        rendimiento = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": recursos.get("cpu_percent", 0),
            "memoria_usada_gb": recursos.get("memoria_usada_gb", 0),
            "memoria_total_gb": recursos.get("memoria_total_gb", 0),
            "memoria_percent": recursos.get("memoria_percent", 0),
            "gpu_disponible": torch.cuda.is_available(),
            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "gpu_memoria_allocated_gb": recursos.get("gpu_mem_allocated", 0) if torch.cuda.is_available() else 0,
            "gpu_memoria_reserved_gb": recursos.get("gpu_mem_reserved", 0) if torch.cuda.is_available() else 0,
            "gpu_nombre": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }

        return rendimiento
    except Exception as e:
        logger.error(f"Error obteniendo rendimiento del sistema: {e}")
        return {"error": f"No se pudo obtener rendimiento del sistema: {str(e)}"}


@router.post("/entrenar-modelo/{id_modelo}", status_code=status.HTTP_202_ACCEPTED)
def entrenar_modelo_individual(id_modelo: int, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        modelo_db = db.query(ModeloIA).filter(ModeloIA.IdModelo == id_modelo).first()
        if not modelo_db:
            raise HTTPException(status_code=404, detail=f"Modelo con ID {id_modelo} no encontrado.")
        version_modelo = modelo_db.Version
    finally:
        db.close()

    if version_modelo in ["v1", "v2", "v4"]:
        if entrenar_pipeline_lstm is None:
            raise HTTPException(
                status_code=501,
                detail=f"Entrenamiento LSTM no disponible. Error de importación: {import_errors.get('pipeline_lstm', 'desconocido')}",
            )
        background_tasks.add_task(entrenar_pipeline_lstm, id_modelo=id_modelo)
        tipo = "LSTM/BiLSTM/Híbrida"

    elif version_modelo == "v3":
        if entrenar_pipeline_cnn is None:
            raise HTTPException(
                status_code=501,
                detail=f"Entrenamiento CNN no disponible. Error de importación: {import_errors.get('pipeline_cnn', 'desconocido')}",
            )
        background_tasks.add_task(entrenar_pipeline_cnn, id_modelo=id_modelo)
        tipo = "CNN"

    else:
        raise HTTPException(status_code=400, detail=f"Versión de modelo no soportada: {version_modelo}")

    return {"message": f"Entrenamiento del modelo {tipo} (ID {id_modelo}) iniciado en segundo plano."}


@router.get("/prediccion/{empresa_id}")
async def obtener_prediccion_empresa(
    empresa_id: int,
    modelo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        historial_db = (
            db.query(PrecioHistorico)
            .filter(PrecioHistorico.IdEmpresa == empresa_id)
            .order_by(PrecioHistorico.Fecha.desc())
            .limit(30)
            .all()
        )

        historial_db = historial_db[::-1]

        historial = [
            {
                "fecha": h.Fecha.strftime("%d-%m-%Y") if isinstance(h.Fecha, (datetime, date)) else str(h.Fecha)[:10],
                "precio": float(h.PrecioCierre)
                if h.PrecioCierre is not None and not math.isnan(float(h.PrecioCierre))
                else None,
            }
            for h in historial_db
        ]

        query = db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id)
        if modelo_id:
            query = query.filter(Resultado.IdModelo == modelo_id)
        resultados_db = query.order_by(Resultado.FechaAnalisis.asc()).all()

        metricas_db = (
            db.query(MetricaModelo.IdModelo, MetricaModelo.DiasFuturo)
            .order_by(MetricaModelo.FechaEntrenamiento.desc())
            .all()
        )

        dias_por_modelo = {}
        for m in metricas_db:
            if m.IdModelo not in dias_por_modelo:
                dias_por_modelo[m.IdModelo] = m.DiasFuturo

        prediccion = []
        tendencia = "ESTABLE"

        if historial and resultados_db:
            prediccion.append(
                {
                    "fechaAnalisis": historial[-1]["fecha"],
                    "fechaPrediccion": historial[-1]["fecha"],
                    "precioPrediccion": historial[-1]["precio"],
                }
            )

            for r in resultados_db:
                dias_futuro = dias_por_modelo.get(r.IdModelo, 0)

                if isinstance(r.FechaAnalisis, str):
                    fecha_base = datetime.strptime(r.FechaAnalisis[:10], "%Y-%m-%d")
                else:
                    fecha_base = r.FechaAnalisis

                fecha_objetivo = fecha_base + timedelta(days=dias_futuro)

                pred_val = float(r.PrediccionIA) if r.PrediccionIA is not None else None
                precio_pred = pred_val if pred_val is not None and not math.isnan(pred_val) else None

                prediccion.append(
                    {
                        "fechaAnalisis": fecha_base.strftime("%d-%m-%Y"),
                        "fechaPrediccion": fecha_objetivo.strftime("%d-%m-%Y"),
                        "precioPrediccion": precio_pred,
                    }
                )

            recom = resultados_db[-1].Recomendacion
            if recom:
                recom = recom.upper()
                tendencia = "ALCISTA" if "ALCISTA" in recom else ("BAJISTA" if "BAJISTA" in recom else "MANTENER")

        return {
            "historial": historial,
            "prediccion": prediccion,
            "confianza": 85,
            "tendencia": tendencia,
        }

    except Exception as e:
        print(f"Error crítico en prediccion: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la predicción")


class MasivoReq(BaseModel):
    empresas_ids: List[int]
    modelo_id: Optional[int] = None


@router.post("/predicciones-masivas")
async def obtener_predicciones_masivas(
    req: MasivoReq,
    db: Session = Depends(get_db),
):
    """
    Obtiene las predicciones para múltiples empresas en una sola petición.
    Optimiza el tiempo de carga del frontend (Soluciona el cuello de botella N+1).
    """
    resultado_masivo = {}

    for emp_id in req.empresas_ids:
        try:
            data = await obtener_prediccion_empresa(empresa_id=emp_id, modelo_id=req.modelo_id, db=db)
            resultado_masivo[emp_id] = data
        except Exception as e:
            print(f"Error procesando empresa masiva {emp_id}: {str(e)}")
            resultado_masivo[emp_id] = {
                "historial": [],
                "prediccion": [],
                "tendencia": "ESTABLE",
                "confianza": 0,
            }

    return resultado_masivo


@router.post("/analizar-por-modelo/{id_modelo}")
def analizar_por_modelo(id_modelo: int, background_tasks: BackgroundTasks):
    if ejecutar_analisis_diario is None:
        detail = f"Módulo de predicciones no disponible. Error: {import_errors.get('generar_predicciones', 'desconocido')}"
        raise HTTPException(status_code=501, detail=detail)

    background_tasks.add_task(ejecutar_analisis_diario, id_modelo)
    return {"status": "ok", "mensaje": f"Predicciones iniciadas en segundo plano para el modelo {id_modelo}"}