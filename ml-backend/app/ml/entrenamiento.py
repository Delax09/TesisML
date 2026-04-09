"""
Módulo Principal de Entrenamiento ML
Orquestador principal que coordina el entrenamiento de modelos
"""
import numpy as np
import torch
import joblib
import os
import gc

from app.services.metrica_service import MetricaService
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA

from app.ml.engine import MLEngine
from app.ml.arquitectura.v1_lstm import obtener_modelo_v1
from app.ml.arquitectura.v2_bidireccional import obtener_modelo_v2
from app.ml.arquitectura.v3_cnn import obtener_modelo_v3
from app.ml.data_processing import procesar_empresas_en_lotes, preparar_datos_masivos_optimizado, crear_dataloaders_optimizados
from app.ml.model_training import ejecutar_entrenamiento_pytorch_optimizado, calcular_metricas_clasificacion
from app.ml.utils import Timer
# Mapa de arquitecturas disponibles
MAPA_ARQUITECTURAS = {
    "v1": obtener_modelo_v1,
    "v2": obtener_modelo_v2,
    "v3": obtener_modelo_v3
}


def entrenar_y_guardar_optimizado(id_modelo_especifico: int = None, batch_empresas: int = 50):
    """Entrenamiento optimizado por lotes con mejor gestión de memoria"""
    print("🚀 Iniciando entrenamiento optimizado...")

    # Verificar recursos del sistema
    if torch.cuda.is_available():
        print(f"🎮 GPU disponible: {torch.cuda.get_device_name()}")
        print(f"💾 VRAM total: {torch.cuda.get_device_properties(0).total_memory // 1024**3}GB")
    else:
        print("💻 Usando CPU - rendimiento limitado")

    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        query_modelos = db.query(ModeloIA).filter(ModeloIA.Activo==True)
        if id_modelo_especifico:
            query_modelos = query_modelos.filter(ModeloIA.IdModelo == id_modelo_especifico)
        modelos_activos = query_modelos.all()

        print(f"📊 {len(ids_empresas)} empresas activas, {len(modelos_activos)} modelos para entrenar")

    finally:
        db.close()

    if not ids_empresas or not modelos_activos:
        print("⚠️ No hay empresas o modelos activos")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    # Procesar datos por lotes de empresas
    with Timer("Procesamiento de datos"):
        todos_los_datos = procesar_empresas_en_lotes(ids_empresas, batch_empresas)

    if not todos_los_datos:
        print("⚠️ No se pudieron procesar datos de ninguna empresa")
        return

    print(f"📈 Datos totales preparados: {len(todos_los_datos)} empresas")

    # Preparar datos de entrenamiento
    print("⚖️ Preparando datos de entrenamiento...")
    x_train, y_reg, y_clf, x_val, y_reg_val, y_clf_val, scaler = preparar_datos_masivos_optimizado(todos_los_datos)

    if x_train is None or len(x_train) == 0:
        print("⚠️ No se pudieron preparar datos de entrenamiento")
        return
    if x_val is None or len(x_val) == 0:
        print("⚠️ No se pudieron preparar datos de validación; revisa la cantidad de datos o el split temporal")
        return

    print(f"🎯 Dataset final: {len(x_train)} secuencias de entrenamiento, {len(x_val)} validación")

    # Calcular peso de clase para clasificación binaria
    positivos = float(np.sum(y_clf == 1.0))
    negativos = float(np.sum(y_clf == 0.0))
    class_weight = torch.tensor([max(1.0, negativos / max(positivos, 1.0))], dtype=torch.float32).to(device)
    print(f"📌 Balance de clases: {int(negativos)} negativos, {int(positivos)} positivos -> pos_weight={class_weight.item():.3f}")

    # Crear DataLoaders optimizados
    train_loader, val_loader = crear_dataloaders_optimizados(x_train, y_reg, y_clf, x_val, y_reg_val, y_clf_val)

    # Entrenar cada modelo
    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando {modelo_db.Nombre} (v{modelo_db.Version})...")

        # Delegar modelos v3 a entrenamiento CNN supervisado
        if modelo_db.Version == "v3":
            print(f"🔄 Delegando modelo v3 a pipeline CNN supervisada...")
            from app.ml.entrenamiento_cnn import entrenar_cnn_optimizado
            entrenar_cnn_optimizado(modelo_db.IdModelo)
            continue

        funcion_arquitectura = MAPA_ARQUITECTURAS.get(modelo_db.Version)
        if not funcion_arquitectura:
            print(f"⚠️ Arquitectura {modelo_db.Version} no encontrada")
            continue

        # Crear modelo
        model = funcion_arquitectura(x_train.shape[1], x_train.shape[2]).to(device)

        # Entrenar
        with Timer(f"Entrenamiento de {modelo_db.Nombre}"):
            historial, mejores_pesos = ejecutar_entrenamiento_pytorch_optimizado(model, train_loader, val_loader, device, class_weight=class_weight)
        
        # Mostrar historial de entrenamiento
        print("\nHistorial de Entrenamiento:")
        print(f"{'Época':<8} {'Loss':<12} {'MAE':<12} {'Val Loss':<12} {'Val MAE':<12} {'Val Acc':<10} {'Val AUC':<10}")
        print("-" * 80)
        for i in range(len(historial['loss'])):
            print(
                f"{i+1:<8} {historial['loss'][i]:<12.4f} {historial['mae'][i]:<12.4f} "
                f"{historial['val_loss'][i]:<12.4f} {historial['val_mae'][i]:<12.4f} "
                f"{historial['val_accuracy'][i]:<10.3f} {historial['val_auc'][i]:<10.3f}"
            )
        print()

        # Cargar mejores pesos y calcular métricas
        model.load_state_dict(mejores_pesos)
        model.eval()

        with Timer("Cálculo de métricas"):
            metricas = calcular_metricas_clasificacion(model, val_loader, device, class_weight=class_weight)

        # Guardar métricas en BD
        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        # Guardar modelo
        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ {modelo_db.Nombre} guardado - Accuracy: {metricas['accuracy']:.3f} - AUC: {metricas.get('auc', 0.0):.3f}")

        # Liberar memoria del modelo
        del model, historial, mejores_pesos
        if device.type == 'cuda':
            torch.cuda.empty_cache()
        gc.collect()

    # Guardar scaler
    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("🎉 ¡Entrenamiento optimizado completado!")


def entrenar_y_guardar(id_modelo_especifico: int = None):
    """Wrapper para compatibilidad - usa versión optimizada"""
    return entrenar_y_guardar_optimizado(id_modelo_especifico)


if __name__ == "__main__":
    entrenar_y_guardar()