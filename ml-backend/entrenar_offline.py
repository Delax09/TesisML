import os
import torch
from app.ml.core.pipeline_base import extraer_y_procesar_desde_csv
from app.ml.pipeline_lstm.data_processor import preparar_datos_lstm, crear_dataloaders_lstm
from app.ml.core.pipeline_trainer import PipelineTrainer
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1 
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.core.engine import MLEngine
import joblib 
import json
from sklearn.metrics import confusion_matrix
from datetime import datetime

#Para ejecutar este script
# python entrenar_offline.py       

def guardar_metricas_json(modelo_nombre: str, resultados: dict, metricas_finales: dict, 
                        umbral_optimo: float, carpeta_destino: str, scaler_type: str = "StandardScaler"):
    """
    Guarda las métricas del modelo en JSON con estructura lista para base de datos
    
    Args:
        modelo_nombre: Nombre del modelo (v1, v2, v3)
        resultados: Dict con resultados del entrenamiento
        metricas_finales: Dict con métricas del modelo
        umbral_optimo: Umbral óptimo encontrado
        carpeta_destino: Carpeta donde guardar los JSON
        scaler_type: Tipo de scaler utilizado
    """
    os.makedirs(carpeta_destino, exist_ok=True)
    
    # Reconstruir matriz de confusión desde los valores individuales
    tn = metricas_finales.get('tn', 0)
    fp = metricas_finales.get('fp', 0)
    fn = metricas_finales.get('fn', 0)
    tp = metricas_finales.get('tp', 0)
    
    matriz_confusion = {
        "verdaderos_negativos": int(tn),
        "falsos_positivos": int(fp),
        "falsos_negativos": int(fn),
        "verdaderos_positivos": int(tp),
        "matriz": [[int(tn), int(fp)], [int(fn), int(tp)]]  # [[TN, FP], [FN, TP]]
    }
    
    # Crear reporte con estructura lista para base de datos
    reporte_modelo = {
        "timestamp": datetime.now().isoformat(),
        "arquitectura": modelo_nombre,
        "version": f"v{modelo_nombre[-1] if modelo_nombre[-1].isdigit() else '1'}",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "configuracion": {
            "dias_memoria": MLEngine.DIAS_MEMORIA_IA,
            "dias_prediccion": MLEngine.DIAS_PREDICCION,
            "num_features": len(MLEngine.FEATURES),
            "features": MLEngine.FEATURES,
            "epochs_entrenados": resultados.get('epochs', 50),
            "batch_size": "32",  # Valor por defecto del data_processor
            "balance_method": MLEngine.BALANCE_METHOD.upper(),  # ← Usar variable global
        },
        "hiperparametros": {
            "umbral_optimo": round(umbral_optimo, 4),
            "umbral_alcista": round(umbral_optimo, 4),
            "umbral_bajista": round(max(0.1, 1 - umbral_optimo), 4),
            "scaler_type": scaler_type,
        },
        "metricas_evaluacion": {
            "accuracy": round(metricas_finales.get('accuracy', 0), 4),
            "precision": round(metricas_finales.get('precision', 0), 4),
            "recall": round(metricas_finales.get('recall', 0), 4),
            "f1_score": round(metricas_finales.get('f1_score', 0), 4),
            "auc": round(metricas_finales.get('auc', 0), 4),
            "mae": round(metricas_finales.get('mae', 0), 6),  # Mean Absolute Error (Regresión)
        },
        "matriz_confusion": matriz_confusion,
        "status": "entrenado_exitosamente"
    }
    
    # Guardar JSON principal
    ruta_json = os.path.join(carpeta_destino, f"metricas_{modelo_nombre}.json")
    with open(ruta_json, 'w', encoding='utf-8') as f:
        json.dump(reporte_modelo, f, indent=4, ensure_ascii=False)
    
    print(f"💾 Métricas guardadas en: {ruta_json}")
    return reporte_modelo

def iniciar_entrenamiento_csv(modelos: list = [1]):
    #Importacion de los archivos CSV Localess 
    #ruta de los archivos data/data_TICKET.csv
    rutas_csv = [
        "data/data_MSFT.csv",
        "data/data_AAPL.csv",
        "data/data_GOOGL.csv",
        "data/data_NVDA.csv",

    ]
    
    lista_dfs = []
    
    # 1. Extracción adaptada (Offline)
    print("🚀 Extrayendo y procesando datos desde CSV...")
    for ruta in rutas_csv:
        if not os.path.exists(ruta):
            print(f"⚠️ Advertencia: No se encontró el archivo {ruta}")
            continue
            
        df_procesado = extraer_y_procesar_desde_csv(ruta)
        if df_procesado is not None:
            lista_dfs.append(df_procesado)
            print(f"✅ {ruta} procesado correctamente.")
    
    if not lista_dfs:
        print("❌ No hay datos válidos para entrenar. Verifica los CSV.")
        return

    # 2. Preparación tensorial con BALANCEO de clases (automático desde MLEngine.BALANCE_METHOD)
    print("🧠 Generando tensores y ventanas de memoria...")
    print(f"⚖️  Aplicando balanceo de clases ({MLEngine.BALANCE_METHOD.upper()})...")
    x_t, yr_t, yc_t, x_v, yr_v, yc_v, scaler = preparar_datos_lstm(lista_dfs)
    train_loader, val_loader = crear_dataloaders_lstm(x_t, yr_t, yc_t, x_v, yr_v, yc_v)
    
    # 3. Configurar carpeta central de resultados
    carpeta_central = "app/ml/models/entrenamientos_offline"
    os.makedirs(carpeta_central, exist_ok=True)
    
    # 4. Configurar la GPU/CPU
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"⚡ Dispositivo: {device.type.upper()}")
    
    # 5. Entrenar cada modelo especificado
    metricas_por_modelo = {}
    
    for num_modelo in modelos:
        print(f"\n{'='*60}")
        print(f"📊 Entrenando Modelo v{num_modelo}...")
        print(f"{'='*60}")
        
        # Crear el modelo según el tipo
        if num_modelo == 1:
            modelo = obtener_modelo_v1(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)).to(device)
            nombre_modelo = "LSTM_v1"
            architecture_name = "LSTM_Clasico_v1"
        elif num_modelo == 2:
            modelo = obtener_modelo_v2(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)).to(device)
            nombre_modelo = "LSTM_Bidireccional_v2"
            architecture_name = "LSTM_Bidireccional_v2"
        elif num_modelo == 3:
            modelo = obtener_modelo_v3(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)).to(device)
            nombre_modelo = "CNN_v3"
            architecture_name = "CNN_v3"
        else:
            print(f"❌ Modelo v{num_modelo} no válido. Use 1, 2 o 3.")
            continue
        
        # Crear entrenador
        log_file = os.path.join(carpeta_central, f"training_v{num_modelo}.log")
        trainer = PipelineTrainer(architecture_name=architecture_name, log_file=log_file)
        
        # Entrenar
        print(f"⏱️  Iniciando entrenamiento...")
        resultados = trainer.ejecutar_entrenamiento(
            model=modelo,
            train_loader=train_loader,
            val_loader=val_loader,
            device=device,
            epochs=50 
        )
        
        # Cargar los mejores pesos para evaluación
        modelo.load_state_dict(resultados['pesos'])
        
        # Evaluar modelo
        metricas_finales = trainer.evaluar_modelo(
            model=modelo, 
            val_loader=val_loader, 
            device=device, 
            umbral_decision=resultados['umbral_optimo']
        )
        
        # Guardar modelo y scaler
        carpeta_modelo = os.path.join(carpeta_central, f"modelo_v{num_modelo}")
        os.makedirs(carpeta_modelo, exist_ok=True)
        
        ruta_modelo = os.path.join(carpeta_modelo, "modelo.pth")
        torch.save(resultados['pesos'], ruta_modelo)
        print(f"💾 Modelo guardado: {ruta_modelo}")
        
        ruta_scaler = os.path.join(carpeta_modelo, "scaler.pkl")
        joblib.dump(scaler, ruta_scaler)
        print(f"💾 Scaler guardado: {ruta_scaler}")
        
        # Guardar métricas en JSON
        reporte = guardar_metricas_json(
            modelo_nombre=f"v{num_modelo}",
            resultados=resultados,
            metricas_finales=metricas_finales,
            umbral_optimo=resultados['umbral_optimo'],
            carpeta_destino=carpeta_modelo,
            scaler_type="StandardScaler"
        )
        
        metricas_por_modelo[f"v{num_modelo}"] = reporte
        
        # Mostrar resumen
        print(f"\n✅ MODELO v{num_modelo} - RESUMEN DE MÉTRICAS")
        print(f"   Accuracy : {metricas_finales['accuracy']:.4f}")
        print(f"   AUC      : {metricas_finales['auc']:.4f}")
        print(f"   F1-Score : {metricas_finales['f1_score']:.4f}")
        print(f"   MAE (Reg): {metricas_finales['mae']:.6f}")
        print(f"   Umbral   : {resultados['umbral_optimo']:.4f}")
    
    # Guardar reporte consolidado
    if metricas_por_modelo:
        reporte_consolidado = {
            "timestamp": datetime.now().isoformat(),
            "total_modelos": len(metricas_por_modelo),
            "modelos": metricas_por_modelo,
            "resumen": {
                "mejores_metricas": {
                    "mayor_accuracy": max(
                        [(k, v['metricas_evaluacion']['accuracy']) 
                        for k, v in metricas_por_modelo.items()],
                        key=lambda x: x[1]
                    )[0] if metricas_por_modelo else None,
                    "mayor_auc": max(
                        [(k, v['metricas_evaluacion']['auc']) 
                        for k, v in metricas_por_modelo.items()],
                        key=lambda x: x[1]
                    )[0] if metricas_por_modelo else None,
                }
            }
        }
        
        ruta_consolidado = os.path.join(carpeta_central, "reporte_consolidado.json")
        with open(ruta_consolidado, 'w', encoding='utf-8') as f:
            json.dump(reporte_consolidado, f, indent=4, ensure_ascii=False)
        print(f"\n📋 Reporte consolidado guardado: {ruta_consolidado}")
    
    
    print(f"\n{'='*60}")
    print(f"🎉 ENTRENAMIENTO OFFLINE COMPLETADO")
    print(f"📂 Resultados en: {carpeta_central}")
    print(f"{'='*60}")

if __name__ == "__main__":
    # OPCIONES:
    # [1]       → Entrena solo LSTM v1
    # [2]       → Entrena solo LSTM Bidireccional v2
    # [3]       → Entrena solo CNN v3
    # [1, 2, 3] → Entrena los 3 modelos (recomendado para comparación)
    
    print("🚀 SISTEMA DE ENTRENAMIENTO OFFLINE - MODELOS IA")
    print("=" * 60)
    
    # Cambiar esta lista para entrenar diferentes modelos
    modelos_a_entrenar = [1]  # Entrena los 3 modelos
    
    iniciar_entrenamiento_csv(modelos=modelos_a_entrenar)