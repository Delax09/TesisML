from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from app.ml.engine import MLEngine
from app.services.resultado_service import ResultadoService
import pandas as pd

def ejecutar_analisis_diario():
    db = SessionLocal()
    ml = MLEngine()

    empresas = db.query(Empresa).filter(Empresa.Activo == True).all()

    for empresa in empresas: 
        #Ultimos precios para calcular
        precios = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == empresa.IdEmpresa
        ).order_by(PrecioHistorico.Fecha.desc()).limit(100).all()

        if len(precios) < 50: continue

        df = pd.DataFrame([{
            'Close': float(p.PrecioCierre),
            'Volume': p.Volumen,
            'High' : float(p.PrecioCierre),
            'Low': float(p.PrecioCierre)
        } for p in reversed(precios)])

        #Proecesado y prediccion 
        features = ml.preparar_features(df)
        prediccion_data = ml.predecir(features)

        #Guardar resultados
        ResultadoService.guardar_prediccion(db, empresa.IdEmpresa, prediccion_data, features)
        print(f"Analisis completado para {empresa.NombreEmpresa}")

if __name__ == "__main__":
    ejecutar_analisis_diario()

