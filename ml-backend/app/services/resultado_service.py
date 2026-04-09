from sqlalchemy.orm import Session
from app.models.resultado import Resultado
from datetime import datetime
from app.exceptions import ResourceNotFoundError
from app.utils.horaformateada import obtener_hora_formateada

class ResultadoService:
    @staticmethod
    def guardar_prediccion(db: Session, empresa_id: int, data_ml, features):
        try:
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
                ProbAlcista = float(data_ml.get('prob_alcista', 0.5)),  # ← Campo faltante
                IdModelo = int(data_ml['id_modelo']),
                FechaAnalisis = obtener_hora_formateada()
            )
            db.add(nuevo_resultado)
            db.commit()
        except Exception as e:
            db.rollback() # Vital para no bloquear la base de datos
            print(f"⚠️ Error guardando empresa {empresa_id}: {e}")
            raise e

    @staticmethod
    def obtener_resultado_por_modeloia(db: Session, id_modelo_ia: int):
        # Corregido: La columna se llama IdModelo en el modelo SQLAlchemy
        return db.query(Resultado).filter(
            Resultado.IdModelo == id_modelo_ia
        ).order_by(Resultado.FechaAnalisis.desc()).all()

    @staticmethod
    def obtener_resultados_por_empresa(db: Session, empresa_id: int, modelo_id: int = None):
        # 1. Base de la consulta
        query = db.query(Resultado).filter(Resultado.IdEmpresa == empresa_id)
        
        # 2. Si se proporciona un modelo específico, filtramos
        if modelo_id:
            query = query.filter(Resultado.IdModelo == modelo_id)
            
        # 3. Ordenamos y ejecutamos
        resultados = query.order_by(Resultado.FechaAnalisis.desc()).all()
        
        if not resultados:
            raise ResourceNotFoundError(message=f"No se encontraron resultados para la empresa {empresa_id} con esos parámetros")
            
        return resultados
    
    @staticmethod
    def obtener_todos_resultados(db: Session):
        return db.query(Resultado).order_by(Resultado.FechaAnalisis.desc()).all()

    @staticmethod
    def obtener_ultimos_resultados(db: Session):
        # 1. Traemos todos los resultados ordenados desde el más nuevo al más viejo
        todos = db.query(Resultado).order_by(Resultado.FechaAnalisis.desc()).all()
        
        # 2. Filtramos para quedarnos solo con el registro más reciente de cada empresa
        vistos = set()
        ultimos = []
        for r in todos:
            if r.IdEmpresa not in vistos:
                vistos.add(r.IdEmpresa)
                ultimos.append(r)
                
        return ultimos