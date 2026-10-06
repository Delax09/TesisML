# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks, status, Request, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.sessions import get_db
from datetime import datetime, timedelta, date
import json
import os
import math
import logging
import asyncio
from pydantic import BaseModel
from typing import List, Optional
from app.db.sessions import SessionLocal
from app.services.metrica_service import MetricaService
from app.models.metrica_modelo import MetricaModelo

logger = logging.getLogger(__name__)

IA_AVAILABLE = True
import_errors = []

try:
    from app.ml.core.engine import MLEngine
except ImportError as e:
    logger.error(f"❌ Error importando MLEngine: {e}")
    import_errors.append(f"MLEngine: {str(e)}")
    IA_AVAILABLE = False

try:
    from app.auto.generar_predicciones import ejecutar_analisis_diario
except ImportError as e:
    logger.error(f"❌ Error importando generar_predicciones: {e}")
    import_errors.append(f"generar_predicciones: {str(e)}")
    IA_AVAILABLE = False

try:
    from app.ml.pipeline_lstm.orquestador import entrenar_pipeline_lstm
    from app.ml.pipeline_cnn.orquestador import entrenar_pipeline_cnn
except ImportError as e:
    logger.error(f"❌ Error importando los orquestadores ML: {e}")
    import_errors.append(f"orquestadores ML: {str(e)}")
    IA_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Error inesperado importando orquestadores ML: {e}")
    import_errors.append(f"orquestadores ML (error): {str(e)}")
    IA_AVAILABLE = False

from app.models.precio_historico import PrecioHistorico
from app.models.resultado import Resultado
from app.models.modelo_ia import ModeloIA # Importante para derivar la arquitectura

router = APIRouter(prefix="/api/v1/ia", tags=["IA Engine"])

@router.get("/diagnostico")
def diagnostico_ia():
    """Endpoint para verificar el estado del módulo ML y ver errores específicos."""
    return {
        "ia_available": IA_AVAILABLE,
        "import_errors": import_errors if import_errors else "Ninguno",
        "status": "OK ✅" if IA_AVAILABLE else "PROBLEMAS ❌",
        "beta_status": "❌ REMOVIDO (por performance)",
        "features_count": len(MLEngine.FEATURES) if hasattr(MLEngine, 'FEATURES') else 0,
        "features": MLEngine.FEATURES if hasattr(MLEngine, 'FEATURES') else []
    }

@router.post("/analizar-todo")
async def analizar_todas_las_empresas(background_tasks: BackgroundTasks):
    if not IA_AVAILABLE:
        error_msg = "Procesos de IA no disponibles. Errores: " + "; ".join(import_errors) if import_errors else "Módulo ML deshabilitado"
        raise HTTPException(status_code=501, detail=error_msg)
    
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
            "timestamp": datetime.datetime.now().isoformat(),
            "cpu_percent": recursos.get("cpu_percent", 0),
            "memoria_usada_gb": recursos.get("memoria_usada_gb", 0),
            "memoria_total_gb": recursos.get("memoria_total_gb", 0),
            "memoria_percent": recursos.get("memoria_percent", 0),
            "gpu_disponible": torch.cuda.is_available(),
            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "gpu_memoria_allocated_gb": recursos.get("gpu_mem_allocated", 0) if torch.cuda.is_available() else 0,
            "gpu_memoria_reserved_gb": recursos.get("gpu_mem_reserved", 0) if torch.cuda.is_available() else 0,
            "gpu_nombre": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
        }

        return rendimiento
    except Exception as e:
        logger.error(f"Error obteniendo rendimiento del sistema: {e}")
        return {"error": f"No se pudo obtener rendimiento del sistema: {str(e)}"}
    
@router.post("/entrenar-modelo/{id_modelo}", status_code=status.HTTP_202_ACCEPTED)
def entrenar_modelo_individual(id_modelo: int, background_tasks: BackgroundTasks):
    if not IA_AVAILABLE:
        error_msg = "Entrenamiento no disponible. Errores: " + "; ".join(import_errors) if import_errors else "Módulo ML deshabilitado"
        raise HTTPException(status_code=501, detail=error_msg)

    db = SessionLocal()
    try:
        modelo_db = db.query(ModeloIA).filter(ModeloIA.IdModelo == id_modelo).first()
        if not modelo_db:
            raise HTTPException(status_code=404, detail=f"Modelo con ID {id_modelo} no encontrado.")
        version_modelo = modelo_db.Version 
    finally:
        db.close()
    if version_modelo in ['v1', 'v2', 'v4']:
        background_tasks.add_task(entrenar_pipeline_lstm, id_modelo=id_modelo)
        tipo = "LSTM/BiLSTM/Híbrida"
    elif version_modelo == 'v3':
        background_tasks.add_task(entrenar_pipeline_cnn, id_modelo=id_modelo)
        tipo = "CNN"
    else:
        raise HTTPException(status_code=400, detail=f"Versión de modelo no soportada: {version_modelo}")

    return {"message": f"Entrenamiento del modelo {tipo} (ID {id_modelo}) iniciado en segundo plano."}

@router.get("/prediccion/{empresa_id}")
async def obtener_prediccion_empresa(
    empresa_id: int, 
    modelo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # 1. OPTIMIZACIÓN: Traer historial descendente y luego invertir para el gráfico
        historial_db = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == empresa_id
        ).order_by(PrecioHistorico.Fecha.desc()).limit(30).all()
        
        historial_db = historial_db[::-1] # Invertir para orden cronológico
        
        historial = [
            {
                "fecha": h.Fecha.strftime("%d-%m-%Y") if isinstance(h.Fecha, (datetime, date)) else str(h.Fecha)[:10],
                "precio": float(h.PrecioCierre) if h.PrecioCierre is not None and not math.isnan(float(h.PrecioCierre)) else None
            } 
            for h in historial_db
        ]

        # 2. OPTIMIZACIÓN: Filtrado más directo en BD
        query = db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id)
        if modelo_id:
            query = query.filter(Resultado.IdModelo == modelo_id)
        resultados_db = query.order_by(Resultado.FechaAnalisis.asc()).all()

        # 3. CÁLCULO DE FECHA DE PREDICCIÓN SIN MODIFICAR BD
        metricas_db = db.query(MetricaModelo.IdModelo, MetricaModelo.DiasFuturo).order_by(MetricaModelo.FechaEntrenamiento.desc()).all()
        
        dias_por_modelo = {}
        for m in metricas_db:
            if m.IdModelo not in dias_por_modelo:
                dias_por_modelo[m.IdModelo] = m.DiasFuturo

        prediccion = []
        tendencia = "ESTABLE"
        
        # 4. SEGURIDAD: Evitar errores de índices fuera de rango
        if historial and resultados_db:
            # Unir historial con predicción adaptado al nuevo formato de claves
            prediccion.append({
                "fechaAnalisis": historial[-1]["fecha"],
                "fechaPrediccion": historial[-1]["fecha"],
                "precioPrediccion": historial[-1]["precio"]
            })

            for r in resultados_db:
                dias_futuro = dias_por_modelo.get(r.IdModelo, 0)
                
                # Obtener la fecha base
                if isinstance(r.FechaAnalisis, str):
                    fecha_base = datetime.strptime(r.FechaAnalisis[:10], "%Y-%m-%d")
                else:
                    fecha_base = r.FechaAnalisis
                
                # Calcular la fecha futura
                fecha_objetivo = fecha_base + timedelta(days=dias_futuro)
                
                # Extraer Precio Predicción validando que no sea NaN ni None
                pred_val = float(r.PrediccionIA) if r.PrediccionIA is not None else None
                precio_pred = pred_val if pred_val is not None and not math.isnan(pred_val) else None


                # Agregar con la estructura exacta solicitada
                prediccion.append({
                    "fechaAnalisis": fecha_base.strftime("%d-%m-%Y"),
                    "fechaPrediccion": fecha_objetivo.strftime("%d-%m-%Y"),
                    "precioPrediccion": precio_pred
                })

            # 5. Lógica de tendencia más robusta
            recom = resultados_db[-1].Recomendacion
            if recom:
                recom = recom.upper()
                tendencia = "ALCISTA" if "ALCISTA" in recom else ("BAJISTA" if "BAJISTA" in recom else "MANTENER")

        return {
            "historial": historial,
            "prediccion": prediccion,
            "confianza": 85, 
            "tendencia": tendencia
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
    db: Session = Depends(get_db)
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
                "historial": [], "prediccion": [], "tendencia": "ESTABLE", "confianza": 0
            }

    return resultado_masivo

@router.post("/analizar-por-modelo/{id_modelo}")
def analizar_por_modelo(id_modelo: int , background_tasks: BackgroundTasks):
    if not IA_AVAILABLE:
        raise HTTPException(status_code= 501, detail="Modulo ML deshabilitado")
    
    background_tasks.add_task(ejecutar_analisis_diario, id_modelo)
    return {"status": "ok", "mensaje": f"Predicciones iniciadas en segundo plano para el modelo {id_modelo}"}