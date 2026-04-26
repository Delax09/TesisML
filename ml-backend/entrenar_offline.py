import os
import torch
from app.ml.core.pipeline_base import extraer_y_procesar_desde_csv
from app.ml.pipeline_lstm.data_processor import preparar_datos_lstm, crear_dataloaders_lstm
from app.ml.core.pipeline_trainer import PipelineTrainer
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1 
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.core.engine import MLEngine

def iniciar_entrenamiento_csv():
    # 1. Configura la ruta de tu(s) CSV(s)
    rutas_csv = [
        "data/data_MSFT.csv" # <- Asegúrate de que el archivo exista aquí
        # Puedes agregar más: "data/historico/msft.csv"
    ]
    
    lista_dfs = []
    
    # 2. Extracción adaptada (Offline)
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

    # 3. Preparación tensorial (Lógica original intacta)
    print("🧠 Generando tensores y ventanas de memoria...")
    x_t, yr_t, yc_t, x_v, yr_v, yc_v, scaler = preparar_datos_lstm(lista_dfs)
    train_loader, val_loader = crear_dataloaders_lstm(x_t, yr_t, yc_t, x_v, yr_v, yc_v)
    
    # 4. Configurar la GPU/CPU y el entrenador
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    modelo = obtener_modelo_v1(MLEngine.DIAS_MEMORIA_IA, len(MLEngine.FEATURES)).to(device)
    trainer = PipelineTrainer(architecture_name="LSTM_Offline", log_file="logs/offline_training.log")
    
    # 5. Entrenar sin tocar la Base de Datos
    print(f"⚡ Iniciando entrenamiento en {device}...")
    resultados = trainer.ejecutar_entrenamiento(
        model=modelo,
        train_loader=train_loader,
        val_loader=val_loader,
        device=device,
        epochs=50 
    )
    
    print("🎉 Entrenamiento offline finalizado con éxito.")
    print(f"📊 Umbral óptimo encontrado: {resultados['umbral_optimo']}")

if __name__ == "__main__":
    iniciar_entrenamiento_csv()