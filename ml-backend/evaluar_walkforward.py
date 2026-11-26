"""
Validación walk-forward desde los CSV de data/ (no toca la BD ni los modelos en producción).

Para cada año de test Y:
    train: ventanas desde MLEngine.FECHA_INICIO cuyo objetivo termina antes de Y-1
    val:   año Y-1 (early stopping y umbrales)
    test:  año Y completo

Compara las redes contra baselines (tasa base, logística y gradient boosting sobre el último día
de cada ventana, con las 13 features originales y con todas). Una mejora solo es creíble si se
repite en la mayoría de los años: mire la media, la desviación y "años > baseline".

Uso:
    python evaluar_walkforward.py                          # baselines + v1..v4, 1 semilla, 2019-2025
    python evaluar_walkforward.py --modelos 1 3 --semillas 3
    python evaluar_walkforward.py --solo-baselines         # rápido (minutos)
    python evaluar_walkforward.py --anios 2022 2023 2024 --epochs 20
    python evaluar_walkforward.py --modelos 1 --batch 1024 --stride 3   # probar batch / cantidad de datos
"""
import argparse
import gc
import json
import os
from datetime import datetime

import numpy as np
import torch
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

from app.ml.core.data_utils import preparar_datos_generico, crear_dataloaders_generico
from app.ml.core.data_validation import DataValidator
from app.ml.core.engine import MLEngine
from app.ml.core.metrics import metricas_cartera
from app.ml.core.pipeline_trainer import PipelineTrainer
from entrenar_offline import cargar_csvs, ARQUITECTURAS, CARPETA_REPORTES

FEATURES_ORIGINALES = ['LogReturn', 'Ret_5', 'Ret_21', 'Dist_SMA20', 'Dist_EMA50', 'ATR_pct', 'MACD_pct',
                       'BB_pctB', 'Z_Score', 'RSI', 'CMF', 'Volatilidad_10d', 'Vol_z']
METRICAS = ('auc', 'ic_medio', 'spread_q5_q1')


def _metricas(prob, meta, yc, yr):
    prob = np.nan_to_num(prob, nan=0.5)
    m = {'auc': float(roc_auc_score(yc, prob)) if len(np.unique(yc)) > 1 else 0.5,
         'tasa_base_positivos': float(yc.mean())}
    c = metricas_cartera(meta.reset_index(drop=True), prob, prob, yr)
    m['ic_medio'], m['spread_q5_q1'] = c['ic_medio'], c['spread_q5_q1']
    return m


def evaluar_baselines(datos):
    """Modelos simples sobre el último día de cada ventana."""
    xtr, _, yctr = datos['train']
    xte, yrte, ycte = datos['test']
    meta = datos['test_meta']
    idx_orig = [MLEngine.FEATURES.index(f) for f in FEATURES_ORIGINALES]
    Xtr, Xte = xtr[:, -1, :], xte[:, -1, :]

    out = {'tasa_base': {'auc': 0.5, 'ic_medio': 0.0, 'spread_q5_q1': 0.0,
                         'tasa_base_positivos': float(ycte.mean())}}
    candidatos = {
        'logistica_13': (LogisticRegression(max_iter=1000), idx_orig),
        'gbm_13': (HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300,
                                                  l2_regularization=1.0, random_state=0), idx_orig),
        'gbm_todas': (HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300,
                                                     l2_regularization=1.0, random_state=0), None),
    }
    for nombre, (clf, cols) in candidatos.items():
        a, b = (Xtr, Xte) if cols is None else (Xtr[:, cols], Xte[:, cols])
        clf.fit(a, yctr)
        out[nombre] = _metricas(clf.predict_proba(b)[:, 1], meta, ycte, yrte)
    return out


def evaluar_red(version, datos, device, n_semillas, epochs, batch_size):
    train_loader, val_loader, test_loader = crear_dataloaders_generico(datos, batch_size)
    trainer = PipelineTrainer(f"WF_{version}", os.path.join(CARPETA_REPORTES, f"walkforward_{version}.log"))
    modelo, res = trainer.entrenar_con_semillas(lambda: MLEngine.construir_modelo(version),
                                                train_loader, val_loader, device,
                                                n_semillas=n_semillas, epochs=epochs)
    prob, _, yc, yr = trainer._predecir(modelo, test_loader, device)
    m = _metricas(prob, datos['test_meta'], yc, yr)
    m['auc_val'] = res['mejor_auc_val']
    m['epochs'] = res['epochs']
    del modelo, train_loader, val_loader, test_loader
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    return m


def resumir(resultados, anios):
    nombres = sorted({n for a in anios for n in resultados[a]})
    resumen = {}
    for n in nombres:
        filas = [resultados[a][n] for a in anios if n in resultados[a]]
        resumen[n] = {}
        for k in METRICAS:
            v = np.array([f[k] for f in filas])
            resumen[n][k] = {'media': float(v.mean()), 'std': float(v.std()), 'por_anio': v.round(4).tolist()}
        # ¿En cuántos años supera al mejor baseline de esas features (gbm_todas)?
        if n != 'gbm_todas' and all('gbm_todas' in resultados[a] for a in anios):
            resumen[n]['anios_auc_sobre_gbm_todas'] = int(sum(
                resultados[a][n]['auc'] > resultados[a]['gbm_todas']['auc'] for a in anios if n in resultados[a]))
    return resumen


def imprimir(resumen, anios):
    print(f"\n{'=' * 96}\nRESUMEN WALK-FORWARD  ({len(anios)} años de test: {anios[0]}-{anios[-1]})\n{'=' * 96}")
    print(f"{'modelo':22s} {'AUC media±std':>16s} {'IC medio':>16s} {'spread Q5-Q1':>16s} {'años AUC>gbm':>13s}")
    orden = sorted(resumen, key=lambda n: -resumen[n]['auc']['media'])
    for n in orden:
        r = resumen[n]
        sobre = r.get('anios_auc_sobre_gbm_todas', '-')
        print(f"{n:22s} {r['auc']['media']:.4f} ± {r['auc']['std']:.4f}  "
              f"{r['ic_medio']['media']:+.4f} ± {r['ic_medio']['std']:.4f}  "
              f"{r['spread_q5_q1']['media']:+.4f} ± {r['spread_q5_q1']['std']:.4f}  {str(sobre):>12s}")
    print("\nAUC por año:")
    print(f"{'modelo':22s} " + " ".join(f"{a:>7d}" for a in anios))
    for n in orden:
        print(f"{n:22s} " + " ".join(f"{v:7.4f}" for v in resumen[n]['auc']['por_anio']))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--anios', type=int, nargs='+', default=list(range(2019, 2026)))
    ap.add_argument('--modelos', type=int, nargs='+', default=[1, 2, 3, 4])
    ap.add_argument('--semillas', type=int, default=1, help="miembros del ensamble por fold (producción usa MLEngine.N_SEMILLAS)")
    ap.add_argument('--epochs', type=int, default=None)
    ap.add_argument('--batch', type=int, default=MLEngine.BATCH_SIZE, help="tamaño de batch de entrenamiento")
    ap.add_argument('--stride', type=int, default=MLEngine.STRIDE_TRAIN, help="paso entre ventanas de train (menor = más datos)")
    ap.add_argument('--etiqueta', default='', help="sufijo para el nombre del reporte")
    ap.add_argument('--solo-baselines', action='store_true')
    args = ap.parse_args()

    dfs = cargar_csvs()
    dfs = [d for d in (DataValidator.validar_y_limpiar(df) for df in dfs) if d is not None and not d.empty]
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    os.makedirs(CARPETA_REPORTES, exist_ok=True)
    print(f"⚡ Dispositivo: {device.type.upper()} | años de test: {args.anios} | "
          f"redes: {[] if args.solo_baselines else args.modelos} | semillas: {args.semillas} | "
          f"batch: {args.batch} | stride: {args.stride}")

    resultados = {}
    for anio in args.anios:
        print(f"\n{'#' * 70}\n# Fold test {anio}  (val {anio - 1})\n{'#' * 70}")
        datos = preparar_datos_generico(dfs, fecha_val=f"{anio - 1}-01-01", fecha_test=f"{anio}-01-01",
                                        fecha_fin=f"{anio + 1}-01-01", stride_train=args.stride)
        for k in ('train', 'val', 'test'):
            m = datos[k + '_meta']
            print(f"   {k:5s}: {len(m):7d} ventanas  {m.fecha.min().date()} -> {m.fecha.max().date()}")

        resultados[anio] = evaluar_baselines(datos)
        if not args.solo_baselines:
            for num in args.modelos:
                if num not in ARQUITECTURAS:
                    print(f"❌ Modelo v{num} no válido (use 1-4)")
                    continue
                resultados[anio][ARQUITECTURAS[num]] = evaluar_red(f"v{num}", datos, device, args.semillas, args.epochs, args.batch)

        for n, m in resultados[anio].items():
            print(f"   {n:22s} AUC={m['auc']:.4f}  IC={m['ic_medio']:+.4f}  spread={m['spread_q5_q1']:+.4f}")
        del datos
        gc.collect()

    resumen = resumir(resultados, args.anios)
    imprimir(resumen, args.anios)

    ruta = os.path.join(CARPETA_REPORTES, f"walkforward_{datetime.now():%Y%m%d_%H%M%S}{'_' + args.etiqueta if args.etiqueta else ''}.json")
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump({'timestamp': datetime.now().isoformat(), 'args': vars(args),
                   'configuracion': MLEngine.configuracion(), 'resumen': resumen,
                   'por_anio': {str(a): r for a, r in resultados.items()}},
                  f, indent=2, ensure_ascii=False, default=float)
    print(f"\n📄 Reporte: {ruta}")


if __name__ == "__main__":
    main()
