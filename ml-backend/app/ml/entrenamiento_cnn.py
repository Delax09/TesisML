"""
Módulo orquestador de entrenamiento CNN supervisado

Este archivo coordina la carga de empresas, la construcción del dataset, el entrenamiento CNN
para modelos v3 y el guardado de métricas en la base de datos.
"""

import os

# --- APAGAR WARNINGS DE TENSORFLOW ---
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 0=INFO, 1=WARNING, 2=ERROR, 3=FATAL
# -------------------------------------
import gc
import joblib
import torch

from app.db.sessions import SessionLocal
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService
from app.ml.engine import MLEngine
from app.ml.arquitectura.v3_cnn import ModeloCNN_v3
from app.ml.cnn_data import (
    cargar_empresas_y_modelos_cnn,
    construir_entorno_empresas,
    preparar_datos_cnn
)
from app.ml.cnn_training import entrenar_cnn_supervisado, evaluar_cnn
from app.ml.utils import Timer


def entrenar_cnn_optimizado(
    id_modelo_especifico: int = None,
    batch_empresas: int = 50,
    epochs: int = 50,
    batch_size: int = 256,
) -> None:
    """Orquesta el entrenamiento CNN supervisado con optimizaciones avanzadas.

    Optimizaciones:
    - Mixed precision training (2x más rápido)
    - Early stopping
    - Learning rate scheduler
    - Gradient clipping
    - JIT compilation
    """
    print("🚀 Iniciando entrenamiento CNN supervisado ultra-optimizado...")

    ids_empresas, modelos_activos = cargar_empresas_y_modelos_cnn(id_modelo_especifico)
    if not ids_empresas or not modelos_activos:
        print("⚠️ Faltan empresas activas o no hay modelos CNN (v3) configurados en la BD.")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🧠 Dispositivo seleccionado: {device.type.upper()}")

    with Timer("Construcción del dataset"):
        lista_dfs = construir_entorno_empresas(ids_empresas, max_workers=10)

    if not lista_dfs:
        print("⚠️ No se pudieron procesar datos de ninguna empresa.")
        return

    print(f"📈 Datos preparados: {len(lista_dfs)} empresas válidas")

    with Timer("Preparación de datos"):
            # 👇 AHORA RECIBIMOS LAS 7 VARIABLES EXACTAS
            x_entrenamiento, y_reg_entrenamiento, y_clf_entrenamiento, \
            x_validacion_np, y_reg_validacion, y_clf_validacion, \
            scaler = preparar_datos_cnn(lista_dfs)

    if x_entrenamiento is None or len(x_entrenamiento) == 0:
        print("⚠️ No se pudieron generar secuencias de entrenamiento.")
        return

        # 👇 Convertimos la validación a tensor (antes lo hacía separar_train_validation)
    x_validacion = torch.tensor(x_validacion_np, dtype=torch.float32).to(device)

    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando CNN {modelo_db.Nombre} (v{modelo_db.Version})...")

        # Crear modelo CNN
        modelo = ModeloCNN_v3(num_features=len(MLEngine.FEATURES)).to(device)

        # Compilación JIT deshabilitada temporalmente (requiere Triton)
        # if device.type == 'cuda':
        #     try:
        #         print("⚡ Compilando modelo con torch.compile...")
        #         modelo = torch.compile(modelo, mode='reduce-overhead')
        #         print("✅ Compilación exitosa")
        #     except Exception as e:
        #         print(f"⚠️ Compilación JIT no disponible (requiere Triton): {e}")
        #         print("   Continuando sin compilación JIT...")

        with Timer(f"Entrenamiento CNN de {modelo_db.Nombre}"):
            mejores_pesos, metricas_entrenamiento = entrenar_cnn_supervisado(
                modelo=modelo,
                x_entrenamiento=x_entrenamiento,
                y_reg_entrenamiento=y_reg_entrenamiento,
                y_clf_entrenamiento=y_clf_entrenamiento,
                x_validacion=x_validacion,
                y_reg_validacion=y_reg_validacion,  # Usar datos de validación
                y_clf_validacion=y_clf_validacion,
                device=device,
                epochs=epochs,
                batch_size=batch_size,
                early_stopping_patience=5,
            )

        if mejores_pesos is None:
            print(f"⚠️ No se encontraron pesos mejores para {modelo_db.Nombre}.")
            continue

        modelo.load_state_dict(mejores_pesos)
        modelo.eval()

        with Timer(f"Evaluación final de {modelo_db.Nombre}"):
            metricas_finales = evaluar_cnn(modelo, x_validacion, y_reg_validacion, y_clf_validacion, device)

        # Combinar métricas
        metricas = {
            'loss': metricas_entrenamiento['loss'],
            'mae': metricas_entrenamiento['mae'],
            'val_loss': metricas_entrenamiento['loss'],  # Usar loss de validación
            'val_mae': metricas_entrenamiento['mae'],
            'accuracy': metricas_finales['accuracy'],
            'precision': metricas_finales['precision'],
            'recall': metricas_finales['recall'],
            'f1_score': metricas_finales['f1_score'],
            'auc': metricas_finales['auc'],
            'tp': metricas_finales['tp'],
            'tn': metricas_finales['tn'],
            'fp': metricas_finales['fp'],
            'fn': metricas_finales['fn'],
            'DiasFuturo': MLEngine.DIAS_PREDICCION
        }

        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ CNN {modelo_db.Nombre} guardada - Acc: {metricas['accuracy']:.3f} - AUC: {metricas['auc']:.3f} - MAE: {metricas['mae']:.4f}")

        del modelo, mejores_pesos
        if device.type == 'cuda':
            torch.cuda.empty_cache()
        gc.collect()

    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("🎉 ¡Entrenamiento CNN supervisado completado!")


def entrenar_modelo_cnn(id_modelo_especifico: int = None):
    """Wrapper de compatibilidad para el endpoint o CLI."""
    return entrenar_cnn_optimizado(id_modelo_especifico)


if __name__ == '__main__':
    entrenar_modelo_cnn()

