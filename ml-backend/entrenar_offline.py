"""
Entrenamiento offline desde los CSV de data/ (no necesita la BD).
Uso:  python entrenar_offline.py            (todas las arquitecturas)
      python entrenar_offline.py 1 3        (solo v1 y v3)
"""
import os
import sys
import glob
import json
from datetime import datetime

import torch

from app.ml.core.pipeline_base import extraer_y_procesar_desde_csv, preparar_datos, crear_dataloaders
from app.ml.core.pipeline_trainer import PipelineTrainer
from app.ml.core.model_versioning import ModelVersionManager
from app.ml.core.engine import MLEngine

ARQUITECTURAS = {
    1: "LSTM_v1",
    2: "LSTM_Bidireccional_v2",
    3: "CNN_v3",
    4: "LSTMCNN_v4",
}
CARPETA_REPORTES = os.path.join("app", "ml", "models", "entrenamientos_offline")


def cargar_csvs():
    rutas = sorted(glob.glob(os.path.join("data", "data_*.csv")))   # funciona en Windows y Linux
    dfs = []
    for ruta in rutas:
        df = extraer_y_procesar_desde_csv(ruta)
        if df is not None:
            dfs.append(df)
    print(f"✅ {len(dfs)}/{len(rutas)} CSV procesados")
    return dfs


def iniciar_entrenamiento_csv(modelos=(1, 2, 3, 4), epochs=None):
    dfs = cargar_csvs()
    if not dfs:
        print("❌ No hay datos válidos para entrenar.")
        return

    datos = preparar_datos(dfs)
    scaler, test_meta = datos['scaler'], datos['test_meta']
    for k in ('train', 'val', 'test'):
        m = datos[k + '_meta']
        print(f"   {k:5s}: {len(m):7d} ventanas  {m.fecha.min().date()} -> {m.fecha.max().date()}")
    train_loader, val_loader, test_loader = crear_dataloaders(datos)
    del datos, dfs

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"⚡ Dispositivo: {device.type.upper()}")
    os.makedirs(CARPETA_REPORTES, exist_ok=True)
    version_manager = ModelVersionManager(os.path.join("app", "ml", "models"))

    resumen = {}
    for num in modelos:
        if num not in ARQUITECTURAS:
            print(f"❌ Modelo v{num} no válido (use 1-4)")
            continue
        nombre = ARQUITECTURAS[num]
        version = f"v{num}"
        print(f"\n{'=' * 60}\n📊 Entrenando {nombre} (ensamble de {MLEngine.N_SEMILLAS} semillas)\n{'=' * 60}")

        trainer = PipelineTrainer(nombre, os.path.join(CARPETA_REPORTES, f"training_{version}.log"))
        modelo, res = trainer.entrenar_con_semillas(lambda: MLEngine.construir_modelo(version),
                                                    train_loader, val_loader, device, epochs=epochs)
        metricas = trainer.evaluar_modelo(modelo, test_loader, device,
                                            umbral_decision=res['umbral_optimo'], meta=test_meta)
        metricas.update({k: res[k] for k in ('loss', 'epochs', 'mejor_auc_val',
                                            'umbral_optimo', 'umbral_alcista', 'umbral_bajista')})
        metricas['DiasFuturo'] = MLEngine.DIAS_PREDICCION

        ruta = version_manager.guardar_modelo_versionado(
            res['pesos'], scaler, metricas, nombre, version,
            "Entrenamiento offline desde CSV", configuracion=MLEngine.configuracion())
        resumen[version] = metricas

        print(f"\n✅ {nombre} — métricas en TEST ({test_meta.fecha.min().date()} en adelante)")
        for k in ('auc', 'mejor_auc_val', 'accuracy', 'tasa_base_positivos', 'ic_medio', 'ic_ir', 'spread_q5_q1', 'mae'):
            print(f"   {k:20s}: {metricas.get(k, 0):.4f}")
        print(f"   guardado en {ruta}")

    with open(os.path.join(CARPETA_REPORTES, "reporte_consolidado.json"), "w", encoding="utf-8") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "configuracion": MLEngine.configuracion(),
                    "modelos": resumen}, f, indent=2, ensure_ascii=False, default=float)
    print(f"\n🎉 Listo. Reporte: {CARPETA_REPORTES}/reporte_consolidado.json")


if __name__ == "__main__":
    elegidos = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4]
    iniciar_entrenamiento_csv(modelos=elegidos)