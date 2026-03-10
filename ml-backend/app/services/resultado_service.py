from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.resultado import Resultado

from app.exceptions import ResourceNotFoundError

class ResultadoService:
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