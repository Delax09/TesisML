import os
import gc
import joblib
import torch

# PARCHE CRÍTICO PARA PYTHON 3.13
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()

from app.db.sessions import SessionLocal
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService
from app.ml.engine import MLEngine
from app.ml.arquitectura.v3_dqn import ModeloDQN_v3
from app.ml.rl_data import (
    cargar_empresas_y_modelos_rl,
    construir_entorno_empresas,
    preparar_datos_rl,
    separar_train_validation,
)
from app.ml.rl_training import entrenar_dqn_agente, evaluar_agente_dqn
from app.ml.utils import Timer


def entrenar_agente_rl_optimizado(
    id_modelo_especifico: int = None,
    batch_empresas: int = 50,
    episodios: int = 10,
    batch_size: int = 256,
) -> None:
    print("🚀 Iniciando entrenamiento RL ultra-optimizado...")

    ids_empresas, modelos_activos = cargar_empresas_y_modelos_rl(id_modelo_especifico)
    if not ids_empresas or not modelos_activos:
        print("⚠️ Faltan empresas activas o no hay modelos RL (v3) configurados en la BD.")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🧠 Dispositivo seleccionado: {device.type.upper()}")

    with Timer("Construcción del entorno RL"):
        lista_dfs = construir_entorno_empresas(ids_empresas, max_workers=10)

    if not lista_dfs:
        print("⚠️ No se pudieron procesar datos de ninguna empresa para RL.")
        return

    print(f"📈 Datos preparados: {len(lista_dfs)} empresas válidas")

    with Timer("Preparación de datos RL"):
        x_train, y_reg, y_clf, scaler = preparar_datos_rl(lista_dfs)

    if x_train is None or len(x_train) == 0:
        print("⚠️ No se pudieron generar secuencias RL.")
        return

    x_entrenamiento, y_reg_entrenamiento, x_validacion, y_clf_validacion = separar_train_validation(
        x_train, y_reg, y_clf, valid_ratio=0.1, device=device
    )

    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando agente {modelo_db.Nombre} (v{modelo_db.Version})...")

        # Crear y compilar modelos con JIT
        agente = ModeloDQN_v3(num_features=len(MLEngine.FEATURES)).to(device)
        target_net = ModeloDQN_v3(num_features=len(MLEngine.FEATURES)).to(device)
        
        # Compilación JIT para mejor rendimiento (si GPU disponible)
        if device.type == 'cuda':
            try:
                print("⚡ Compilando modelos con torch.compile...")
                agente = torch.compile(agente, mode='reduce-overhead')
                target_net = torch.compile(target_net, mode='reduce-overhead')
                print("✅ Compilación exitosa")
            except Exception as e:
                print(f"⚠️ Compilación JIT no disponible: {e}")
        
        target_net.load_state_dict(agente.state_dict())
        target_net.eval()

        with Timer(f"Entrenamiento RL de {modelo_db.Nombre}"):
            mejores_pesos, avg_loss, mejor_recompensa = entrenar_dqn_agente(
                agente=agente,
                target_net=target_net,
                x_entrenamiento=x_entrenamiento,
                y_reg_entrenamiento=y_reg_entrenamiento,
                device=device,
                episodios=episodios,
                batch_size=batch_size,
                early_stopping_patience=3,
            )

        if mejores_pesos is None:
            print(f"⚠️ No se encontraron pesos mejores para {modelo_db.Nombre}.")
            continue

        agente.load_state_dict(mejores_pesos)
        agente.eval()

        with Timer(f"Evaluación RL de {modelo_db.Nombre}"):
            metricas_rl = evaluar_agente_dqn(agente, x_validacion, y_clf_validacion, device)

        metricas = {
            'loss': float(avg_loss),
            'mae': float(mejor_recompensa),
            'val_loss': 0.0,
            'val_mae': 0.0,
            'accuracy': metricas_rl['accuracy'],
            'precision': metricas_rl['precision'],
            'recall': metricas_rl['recall'],
            'f1_score': metricas_rl['f1_score'],
        }

        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ Agente {modelo_db.Nombre} guardado correctamente.")

        del agente, target_net, mejores_pesos
        if device.type == 'cuda':
            torch.cuda.empty_cache()
        gc.collect()

    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("🎉 Entrenamiento RL completado con éxito.")


def entrenar_agente_rl(id_modelo_especifico: int = None):
    """Wrapper de compatibilidad para el endpoint o CLI."""
    return entrenar_agente_rl_optimizado(id_modelo_especifico)


if __name__ == '__main__':
    entrenar_agente_rl()

