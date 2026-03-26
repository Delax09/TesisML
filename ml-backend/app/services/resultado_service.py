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
            PrecioActual = float(features['Close']),
            PrediccionIA = float(data_ml['prediccion']),
            VariacionPCT = float(data_ml['variacion']),
            RSI = float(features['RSI']),
            MACD = float(features['MACD']),
            ATR = float(features['ATR']),
            EMA20 = float(features['EMA20']),
            EMA50 = float(features['EMA50']),
            Score = float(data_ml['score']),
            Recomendacion = data_ml['recomendacion'],
            IdModelo = int(data_ml['id_modelo']),
            FechaAnalisis = datetime.utcnow()
        )
        db.add(nuevo_resultado)
        db.commit()
        db.refresh(nuevo_resultado)
        return nuevo_resultado

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
            Resultado.IdModelo == id_modelo_ia
        ).order_by(Resultado.FechaAnalisis.desc()).all()

        return resultados