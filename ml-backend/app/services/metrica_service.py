from sqlalchemy.orm import Session
from app.models.metrica_modelo import MetricaModelo
from datetime import datetime
from app.utils.horaformateada import obtener_hora_formateada

class MetricaService:
    @staticmethod
    def guardar_metricas(db: Session, id_modelo: int, metricas_dict: dict):
        try:
            nueva_metrica = MetricaModelo(
                IdModelo = id_modelo,
                Loss = float(metricas_dict.get('loss', 0.0)),
                MAE = float(metricas_dict.get('mae', 0.0)),
                ValLoss = float(metricas_dict.get('val_loss', 0.0)),
                ValMAE = float(metricas_dict.get('val_mae', 0.0)),
                Accuracy = float(metricas_dict.get('accuracy', 0.0)),
                Precision = float(metricas_dict.get('precision', 0.0)),
                Recall = float(metricas_dict.get('recall', 0.0)),
                F1_Score = float(metricas_dict.get('f1_score', 0.0)),
                DiasFuturo = int(metricas_dict.get('DiasFuturo', 0)),
                AUC = float(metricas_dict.get('auc', 0.0)),
                TP = int(metricas_dict.get('tp',0)),
                TN = int(metricas_dict.get('tn',0)),
                FP = int(metricas_dict.get('fp',0)),
                FN = int(metricas_dict.get('fn',0)),
                FechaEntrenamiento = obtener_hora_formateada()
            )
            db.add(nueva_metrica)
            db.commit()
            print(f"📊 Métricas completas guardadas para el modelo ID: {id_modelo}")
        except Exception as e:
            db.rollback()
            print(f"⚠️ Error al guardar métricas en la BD: {e}")

    @staticmethod
    def obtener_metricas_por_modelo(db:Session, id_modelo: int, limite: int = 10):
        return db.query(MetricaModelo).filter(
            MetricaModelo.IdModelo == id_modelo
            ).order_by(MetricaModelo.FechaEntrenamiento.desc()).limit(limite).all()
    