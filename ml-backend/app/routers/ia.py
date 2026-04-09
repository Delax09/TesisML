# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks, status, Request, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.sessions import get_db
import datetime
import json
import os
import math
import logging

logger = logging.getLogger(__name__)

IA_AVAILABLE = True
import_errors = []

try:
    from app.ml.engine import MLEngine
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
    from app.ml.entrenamiento import entrenar_y_guardar
except ImportError as e:
    logger.error(f"❌ Error importando ml.entrenamiento: {e}")
    import_errors.append(f"ml.entrenamiento: {str(e)}")
    IA_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Error inesperado importando ml.entrenamiento: {e}")
    import_errors.append(f"ml.entrenamiento (error): {str(e)}")
    IA_AVAILABLE = False

from app.models.precio_historico import PrecioHistorico
from app.models.resultado import Resultado

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
        from app.ml.entrenamiento import monitorear_recursos
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
        
    background_tasks.add_task(entrenar_y_guardar, id_modelo_especifico=id_modelo)
    return {"message": f"Entrenamiento del modelo ID {id_modelo} iniciado en segundo plano."}

@router.get("/prediccion/{empresa_id}")
async def obtener_prediccion_empresa(
    empresa_id: int, 
    modelo_id: Optional[int] = Query(None, description="Filtra por el ID del modelo de IA"),
    db: Session = Depends(get_db)
):
    """
    Devuelve el historial de precios y la predicción generada por la IA para una empresa específica,
    formateado para el gráfico del frontend. Permite filtrar por modelo de IA.
    """
    try:
        # 1. Obtener historial de precios reales (últimos 30 días)
        historial_db = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == empresa_id
        ).order_by(PrecioHistorico.Fecha.desc()).limit(30).all()
        
        historial_db.reverse()
        
        historial = []
        for h in historial_db:
            fecha_val = h.Fecha
            if isinstance(fecha_val, str):
                fecha_obj = datetime.datetime.strptime(fecha_val.split(" ")[0], "%Y-%m-%d")
                fecha_str = fecha_obj.strftime("%d-%m")
            else:
                fecha_str = fecha_val.strftime("%d-%m")

            precio_raw = float(h.PrecioCierre)
            precio_final = None if math.isnan(precio_raw) else precio_raw
            
            historial.append({
                "fecha": fecha_str,
                "precio": precio_final 
            })

        # 2. Obtener las predicciones a futuro filtrando por modelo si se provee
        query_resultados = db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id)
        
        if modelo_id is not None:
            query_resultados = query_resultados.filter(Resultado.IdModelo == modelo_id)
            
        resultados_db = query_resultados.order_by(Resultado.FechaAnalisis.asc()).all()

        prediccion = []
        tendencia = "ESTABLE"
        
        if len(historial) > 0 and len(resultados_db) > 0:
            ultimo_real = historial[-1]
            prediccion.append({
                "fecha": ultimo_real["fecha"],
                "precioEsperado": ultimo_real["precio"]
            })

            for r in resultados_db:
                fecha_val = r.FechaAnalisis
                if isinstance(fecha_val, str):
                    fecha_str = fecha_val.split(" ")[0]
                    partes = fecha_str.split("-")
                    fecha_formateada = f"{partes[2]}-{partes[1]}"
                else:
                    fecha_formateada = fecha_val.strftime("%d-%m")

                pred_raw = float(r.PrediccionIA)
                pred_final = None if math.isnan(pred_raw) else pred_raw

                prediccion.append({
                    "fecha": fecha_formateada,
                    "precioEsperado": pred_final
                })

            # 3. Tendencia
            if resultados_db[-1].Recomendacion:
                ultima_recom = resultados_db[-1].Recomendacion.upper()
                if "ALCISTA" in ultima_recom:
                    tendencia = "ALZA"
                elif "BAJISTA" in ultima_recom:
                    tendencia = "BAJA"

        confianza_modelo = 85 

        return {
            "historial": historial,
            "prediccion": prediccion,
            "confianza": confianza_modelo,
            "tendencia": tendencia
        }

    except Exception as e:
        print(f"Error procesando prediccion para empresa {empresa_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")