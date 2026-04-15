import os
import torch
import joblib
import gc
from concurrent.futures import ProcessPoolExecutor, as_completed

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2

from app.ml.pipeline_lstm.data_processor import extraer_y_procesar_empresa, preparar_datos_lstm, crear_dataloaders_lstm
from app.ml.pipeline_lstm.trainer import ejecutar_entrenamiento_lstm, evaluar_modelo_lstm
from app.ml.core.utils import Timer

def entrenar_pipeline_lstm(id_modelo: int = None):
    """Orquesta el flujo completo de entrenamiento para LSTMs"""
    db = SessionLocal()
    try:
        # 1. Cargar configuración
        modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version.in_(['v1', 'v2']))
        if id_modelo: modelos = modelos.filter(ModeloIA.IdModelo == id_modelo)
        
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]
        
        # 2. Extracción masiva paralela
        datos_procesados = []
        with Timer("Extracción y Procesamiento"):
            with ProcessPoolExecutor(max_workers=4) as executor:
                futuros = [executor.submit(extraer_y_procesar_empresa, id_e) for id_e in ids_empresas]
                for f in as_completed(futuros):
                    res = f.result()
                    if res is not None: datos_procesados.append(res)

        # 3. Preparación de Tensores
        with Timer("Preparación de Tensores"):
            xt, yrt, yct, xv, yrv, ycv, scaler = preparar_datos_lstm(datos_procesados)
            train_loader, val_loader = crear_dataloaders_lstm(xt, yrt, yct, xv, yrv, ycv)
            del datos_procesados, xt, xv # Liberar memoria RAM
            gc.collect()

        # 4. Bucle de Entrenamiento por Arquitectura
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        ruta_modelos = os.path.join(os.getcwd(), "app", "ml", "models")

        for mod_db in modelos.all():
            print(f"--- Entrenando {mod_db.Nombre} ---")
            modelo_pt = obtener_modelo_v2(31) if mod_db.Version == 'v2' else obtener_modelo_v1(31)
            modelo_pt.to(device)

            mejores_pesos = ejecutar_entrenamiento_lstm(modelo_pt, train_loader, val_loader, device)
            
            # Evaluación y Guardado
            metricas = evaluar_modelo_lstm(modelo_pt, val_loader, device)
            MetricaService.guardar_metricas(db, mod_db.IdModelo, metricas)
            
            torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{mod_db.Version}.pth'))
            print(f"✅ Finalizado: Acc {metricas['accuracy']:.3f}")

        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler.pkl"))
        
    finally:
        db.close()