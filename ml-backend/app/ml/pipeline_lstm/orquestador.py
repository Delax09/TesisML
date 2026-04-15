import os
from tqdm import tqdm
import sys
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
from app.ml.core.engine import MLEngine

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
        
        datos_procesados = []
        lote_size = 20
        
        print(f"📥 Iniciando extracción para {len(ids_empresas)} empresas...", flush=True)
        
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
                                import traceback
                                # Rompemos la línea limpia para mostrar el error
                                print(f"\n❌ Error en worker: {str(e)}", flush=True)
                                traceback.print_exc()
                                
                            finally:
                                # 👇 AVANZAMOS LA BARRA UN PASO CADA VEZ QUE TERMINA UNA EMPRESA
                                pbar.update(1)
                    
                    gc.collect()

        print(f"✅ Extracción completa. {len(datos_procesados)} empresas válidas listas para entrenar.", flush=True)

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

        for mod_db in modelos.all():
            print(f"\n--- Entrenando {mod_db.Nombre} ---", flush=True)
            
            # 👇 SOLUCIÓN: Pasamos los días (30) y las features (31) obligatorias
            if mod_db.Version == 'v2':
                modelo_pt = obtener_modelo_v2(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES))
            else: 
                modelo_pt = obtener_modelo_v1(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES))
            
            modelo_pt.to(device)

            mejores_pesos = ejecutar_entrenamiento_lstm(modelo_pt, train_loader, val_loader, device)
            
            # Evaluación y Guardado
            metricas = evaluar_modelo_lstm(modelo_pt, val_loader, device)
            metricas['DiasFuturo'] = MLEngine.DIAS_PREDICCION
            MetricaService.guardar_metricas(db, mod_db.IdModelo, metricas)
            
            torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{mod_db.Version}.pth'))
            print(f"✅ Finalizado: Acc {metricas['accuracy']:.3f} | AUC {metricas['auc']:.3f}", flush=True)

        joblib.dump(scaler, os.path.join(ruta_modelos, "scaler.pkl"))
        print("💾 Pipeline LSTM Finalizado y Guardado.", flush=True)
        
    except Exception as e:
        import traceback
        print(f"❌ ERROR CRÍTICO EN ORQUESTADOR: {str(e)}", flush=True)
        traceback.print_exc()
    finally:
        db.close()