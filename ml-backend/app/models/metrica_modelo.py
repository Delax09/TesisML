from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.sessions import Base
from app.utils.horaformateada import obtener_hora_formateada

class MetricaModelo(Base):
    __tablename__ = "MetricaModelo"

    IdMetrica = Column(Integer, primary_key=True, index=True)
    IdModelo = Column(Integer, ForeignKey("ModeloIA.IdModelo"))
    FechaEntrenamiento = Column(DateTime, default=obtener_hora_formateada)
    DiasFuturo = Column(Integer, nullable=True)

    Loss = Column(DECIMAL(10,6))
    MAE = Column(DECIMAL(10,6))
    ValLoss = Column(DECIMAL(10,6))
    ValMAE = Column(DECIMAL(10,6))


    Accuracy = Column(DECIMAL(10, 6))
    Precision = Column(DECIMAL(10, 6))
    Recall = Column(DECIMAL(10, 6))
    F1_Score = Column(DECIMAL(10, 6))

    #Area bajo la curva AUC
    AUC = Column(DECIMAL(10,6))

    #Matriz de confusion
    TP = Column(Integer, nullable = True) #Verdaderos Positivos
    TN = Column(Integer, nullable = True) #Verdaderos Negativos
    FP = Column(Integer, nullable = True) #Falsos Positivos
    FN = Column(Integer, nullable = True) #Falsos Negativos

    modelo_ia = relationship("ModeloIA")