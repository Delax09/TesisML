from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.resultado import Resultado
from datetime import datetime

from app.exceptions import ResourceNotFoundError

class ResultadoService:

    @staticmethod
    def guardar_prediccion(db: Session, empresa_id: int, data_ml, features):
        nuevo_resultado = Resultado(
            IdEmpresa = empresa_id,
            PrecioActual = features['Close'],
            PrediccionIA = data_ml['prediccion'],
            VariacionPCT = data_ml['variacion'],
            RSI = features['RSI'],
            MACD = features['MACD'],
            ATR = features['ATR'],
            EMA20 = features['EMA20'],
            EMA50 = features['EMA50'],
            Score = data_ml['score'],
            Recomendacion = data_ml['recomendacion'],
            IdModelo = data_ml['id_modelo'],
            FechaAnalisis = datetime.utcnow()
        )
        db.add(nuevo_resultado)
        db.commit()
    @staticmethod
    def obtener_todos_resultados(db: Session) -> list[Resultado]:
        return db.query(Resultado).order_by(desc(Resultado.FechaAnalisis)).all()
    
    @staticmethod
    def obtener_resultado_por_id(db: Session, resultado_id: int) -> Resultado:
        resultado = db.query(Resultado).filter(Resultado.IdResultado == resultado_id).first()
        if not resultado:
            raise ResourceNotFoundError("Resultado", resultado_id)
        return resultado
    
    @staticmethod
    def obtener_resultados_por_empresa(db: Session, empresa_id: int) -> list[Resultado]:
        return db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id).order_by(desc(Resultado.FechaAnalisis)).all()
    
    @staticmethod
    def obtener_ultimo_resultado_por_empresa(db: Session, empresa_id: int) -> Resultado:
        resultado = db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id).order_by(desc(Resultado.FechaAnalisis)).first()
        if not resultado:
            raise ResourceNotFoundError("Resultado para empresa", empresa_id)
        return resultado

    @staticmethod
    def obtener_resultado_por_modeloia(db: Session, id_modelo_ia: int) -> list[Resultado]:
        resultados = db.query(Resultado).filter(
            Resultado.IdModeloIA == id_modelo_ia
        ).order_by(Resultado.FechaAnalisis.desc()).all()

        return resultados