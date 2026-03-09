import yfinance as yf
from sqlalchemy.orm import Session
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from datetime import datetime, timedelta

#Para ejecutar este archivo: python -m app.auto.cargar_precios

def poblar_precios_historicos():
    db = SessionLocal()
    try:
        # 1. Obtener todas las empresas activas
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"Iniciando descarga para {len(empresas)} empresas...")

        for empresa in empresas:
            print(f"Descargando: {empresa.Ticket}...")
            
            # 2. Descargar datos de Yahoo Finance (últimos 6 años)
            ticker_data = yf.download(empresa.Ticket, period="6y", interval="1d")
            
            for fecha, fila in ticker_data.iterrows():
                # Evitar duplicados (opcional pero recomendado)
                existe = db.query(PrecioHistorico).filter(
                    PrecioHistorico.IdEmpresa == empresa.IdEmpresa,
                    PrecioHistorico.Fecha == fecha.date()
                ).first()

                if not existe:
                    nuevo_precio = PrecioHistorico(
                        IdEmpresa=empresa.IdEmpresa,
                        Fecha=fecha.date(),
                        PrecioCierre=float(fila['Close']),
                        Volumen=int(fila['Volume'])
                    )
                    db.add(nuevo_precio)
            
            db.commit() # Commit por empresa para asegurar datos
            print(f"✅ {empresa.Ticket} completado.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    poblar_precios_historicos()