# app/routers/ia.py
from fastapi import APIRouter, Depends, BackgroundTasks, status, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.sessions import get_db
import datetime
import json
import os
import math
try:
    from app.auto.generar_predicciones import ejecutar_analisis_diario
    from app.ml.entrenamiento import entrenar_y_guardar
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False

from app.models.precio_historico import PrecioHistorico
from app.models.resultado import Resultado

router = APIRouter(prefix="/api/v1/ia", tags=["IA Engine"])

@router.post("/analizar-todo")
async def analizar_todas_las_empresas(background_tasks: BackgroundTasks):
    if not IA_AVAILABLE:
        raise HTTPException(status_code=501, detail="Procesos de IA no disponibles en el servidor de producción.")
    
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
    
@router.post("/entrenar-modelo/{id_modelo}", status_code=status.HTTP_202_ACCEPTED)
def entrenar_modelo_individual(id_modelo: int, background_tasks: BackgroundTasks):
    if not IA_AVAILABLE:
        raise HTTPException(status_code=501, detail="Entrenamiento no disponible en producción.")
        
    background_tasks.add_task(entrenar_y_guardar, id_modelo_especifico=id_modelo)
    return {"message": f"Entrenamiento del modelo ID {id_modelo} iniciado en segundo plano."}

@router.get("/prediccion/{empresa_id}")
async def obtener_prediccion_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el historial de precios y la predicción generada por la IA para una empresa específica,
    formateado para el gráfico del frontend.
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

            # --- CORRECCIÓN AQUÍ ---
            precio_raw = float(h.PrecioCierre)
            precio_final = None if math.isnan(precio_raw) else precio_raw
            
            historial.append({
                "fecha": fecha_str,
                "precio": precio_final 
            })

        # 2. Obtener las predicciones a futuro
        resultados_db = db.query(Resultado).filter(
            Resultado.IdEmpresa == empresa_id
        ).order_by(Resultado.FechaAnalisis.asc()).all()

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

                # --- CORRECCIÓN AQUÍ ---
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