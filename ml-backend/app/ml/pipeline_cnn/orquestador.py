import os
import gc
import joblib
import torch
import sys
from tqdm import tqdm
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed

from app.db.sessions import SessionLocal
from app.models.modelo_ia import ModeloIA
from app.models.empresa import Empresa
from app.services.metrica_service import MetricaService
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.core.engine import MLEngine
from app.ml.core.utils import Timer 

from app.ml.pipeline_cnn.data_processor import extraer_y_procesar_empresa_cnn, preparar_datos_cnn, crear_dataloaders_cnn
from app.ml.pipeline_cnn.trainer import ejecutar_entrenamiento_cnn, evaluar_modelo_cnn

def entrenar_pipeline_cnn(id_modelo_especifico: int = None, epochs: int = 50):
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

        # 2. Extracción Paralela (POR LOTES CON BARRA CLÁSICA)
        datos_procesados = []
        lote_size = 15 
        
        print(f"📥 Iniciando extracción para {len(ids_empresas)} empresas (CNN)...", flush=True)
        
        with Timer("Extracción y Procesamiento CNN"):
            with tqdm(total=len(ids_empresas), desc="Procesando Empresas", file=sys.stdout) as pbar:
                for i in range(0, len(ids_empresas), lote_size):
                    lote_actual = ids_empresas[i : i + lote_size]
                    
                    with ProcessPoolExecutor(max_workers=4) as executor:
                        futuros = [executor.submit(extraer_y_procesar_empresa_cnn, id_e) for id_e in lote_actual]
                        
                        for f in as_completed(futuros):
                            try:
                                res = f.result(timeout=180) 
                                if res is not None: 
                                    datos_procesados.append(res)
                            except Exception as e:
                                print(f"\n❌ Error en worker CNN: {str(e)}", flush=True)
                            finally:
                                pbar.update(1)
                    gc.collect()

        print(f"✅ Extracción completa. {len(datos_procesados)} empresas válidas para la CNN.", flush=True)

        # 3. Preparación de Tensores
        with Timer("Preparación de Tensores CNN"):
            xt, yrt, yct, xv, yrv, ycv, scaler = preparar_datos_cnn(datos_procesados)
            train_loader, val_loader = crear_dataloaders_cnn(xt, yrt, yct, xv, yrv, ycv)
            del datos_procesados, xt, xv
            gc.collect()

        # 4. Entrenamiento de Modelos
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        ruta_modelos = os.path.join(os.getcwd(), "app", "ml", "models")
        os.makedirs(ruta_modelos, exist_ok=True)

        for modelo_db in modelos_activos:
            print(f"\n--- Entrenando CNN: {modelo_db.Nombre} ---", flush=True)
            
            # Instanciar el modelo dinámicamente según Engine
            modelo_pt = obtener_modelo_v3(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES))
            modelo_pt = modelo_pt.to(device)

            mejores_pesos = ejecutar_entrenamiento_cnn(modelo_pt, train_loader, val_loader, device, epochs)
            
            metricas = evaluar_modelo_cnn(modelo_pt, val_loader, device)
            metricas['DiasFuturo'] = MLEngine.DIAS_PREDICCION
            
            MetricaService.guardar_metricas(db, modelo_db.IdModelo, metricas)

            torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
            print(f"✅ CNN {modelo_db.Nombre} guardada - Acc: {metricas['accuracy']:.3f} | AUC: {metricas['auc']:.3f}", flush=True)

        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler_cnn.pkl")) 
        print("💾 Pipeline CNN Finalizado y Guardado.", flush=True)

    except Exception as e:
        print(f"❌ ERROR CRÍTICO EN ORQUESTADOR CNN:", flush=True)
        traceback.print_exc()
    finally:
        db.close()