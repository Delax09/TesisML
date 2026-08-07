import argparse

from app.auto.procesar_noticias_diarias import main as procesar_noticias_main
from app.ml.pipeline_lstm.orquestador import entrenar_pipeline_lstm
from app.ml.pipeline_cnn.orquestador import entrenar_pipeline_cnn


def main():
    parser = argparse.ArgumentParser(
        description="Procesar noticias y entrenar modelos con la característica NewsSentiment."
    )
    parser.add_argument(
        "--no-news",
        action="store_true",
        help="No procesar noticias antes del entrenamiento."
    )
    parser.add_argument(
        "--lstm",
        action="store_true",
        help="Entrenar pipeline LSTM (v1/v2/v4)."
    )
    parser.add_argument(
        "--cnn",
        action="store_true",
        help="Entrenar pipeline CNN (v3)."
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Procesar noticias y entrenar ambos pipelines."
    )
    args = parser.parse_args()

    if not args.no_news:
        print("🚀 Procesando noticias antes del entrenamiento...")
        procesar_noticias_main()

    if args.all or args.lstm:
        print("🧠 Iniciando entrenamiento LSTM...")
        entrenar_pipeline_lstm()

    if args.all or args.cnn:
        print("🧠 Iniciando entrenamiento CNN...")
        entrenar_pipeline_cnn()

    if not any([args.all, args.lstm, args.cnn]):
        print("⚠️ No se seleccionó ningún pipeline. Use --lstm, --cnn o --all.")


if __name__ == "__main__":
    main()
