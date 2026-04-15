import os
import gc
import joblib
import torch
from concurrent.futures import ProcessPoolExecutor, as_completed

from app.db.sessions import SessionLocal
from app.models.modelo_ia import ModeloIA
from app.models.empresa import Empresa
from app.services.metrica_service import MetricaService
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.core.utils import Timer # Importación desde el core

from app.ml.pipeline_cnn.data_processor import extraer_y_procesar_empresa_cnn, preparar_datos_cnn, crear_dataloaders_cnn
from app.ml.pipeline_cnn.trainer import ejecutar_entrenamiento_cnn, evaluar_modelo_cnn

def entrenar_pipeline_cnn(id_modelo_especifico: int = None, epochs: int = 50, batch_size: int = 256):
    """Orquesta el flujo completo de entrenamiento exclusivo para la CNN"""
    db = SessionLocal()
    try:
        # 1. Cargar Configuración
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        query_modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version == "v3")
        if id_modelo_especifico:
            query_modelos = query_modelos.filter(ModeloIA.IdModelo == id_modelo_especifico)
        modelos_activos = query_modelos.all()

        if not modelos_activos:
            print("No hay modelos CNN v3 activos para entrenar.")
            return

        # 2. Extracción Paralela 
        datos_procesados = []
        with Timer("Extracción de Datos CNN"):
            with ProcessPoolExecutor(max_workers=4) as executor:
                futuros = [executor.submit(extraer_y_procesar_empresa_cnn, id_e) for id_e in ids_empresas]
                for f in as_completed(futuros):
                    res = f.result()
                    if res is not None: datos_procesados.append(res)

        # 3. Preparación
        with Timer("Preparación de Tensores CNN"):
            xt, yrt, yct, xv, yrv, ycv, scaler = preparar_datos_cnn(datos_procesados)
            train_loader, val_loader = crear_dataloaders_cnn(xt, yrt, yct, xv, yrv, ycv, batch_size)
            del datos_procesados, xt, xv
            gc.collect()

        # 4. Entrenamiento de Modelos
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        ruta_modelos = os.path.join(os.getcwd(), "app", "ml", "models")
        os.makedirs(ruta_modelos, exist_ok=True)

        for modelo_db in modelos_activos:
            print(f"\n--- Entrenando CNN: {modelo_db.Nombre} ---")
            modelo_pt = obtener_modelo_v3(31).to(device)

            mejores_pesos, _ = ejecutar_entrenamiento_cnn(modelo_pt, train_loader, val_loader, device, epochs)
            
            metricas = evaluar_modelo_cnn(modelo_pt, val_loader, device)
            metricas['DiasFuturo'] = 5 # MLEngine.DIAS_PREDICCION
            
            MetricaService.guardar_metricas(db, modelo_db.IdModelo, metricas)

            torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
            print(f"✅ CNN {modelo_db.Nombre} guardada - Acc: {metricas['accuracy']:.3f} - AUC: {metricas['auc']:.3f}")

        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler_cnn.pkl")) # Scaler independiente

    finally:
        db.close()