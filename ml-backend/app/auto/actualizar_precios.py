# app/auto/actualizar_precios.py
import yfinance as yf
import pandas as pd
import warnings
from sqlalchemy.orm import Session
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from datetime import datetime

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

def actualizar_precios(db: Session):
    # Obtenemos las empresas activas
    empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
    
    for empresa in empresas:
        try:
            
            data = yf.download(empresa.Ticket, period="max", interval="1d", auto_adjust=False)
            
            if not data.empty:
                
                ultimo_precio = data.iloc[-1]
                fecha_yf = data.index[-1]
                
                #Extraccion de close volume
                precio_bruto = ultimo_precio['Close']
                volumen_bruto = ultimo_precio['Volume']
                
                if isinstance(precio_bruto, pd.Series):
                    precio_bruto = precio_bruto.iloc[0]
                if isinstance(volumen_bruto, pd.Series):
                    volumen_bruto = volumen_bruto.iloc[0]
                    
                # Convertimos a los tipos de datos exactos para la Base de Datos
                precio_cierre_final = float(precio_bruto)
                volumen_final = int(volumen_bruto)
                
                # Evitar duplicados por fecha
                existe = db.query(PrecioHistorico).filter(
                    PrecioHistorico.IdEmpresa == empresa.IdEmpresa,
                    PrecioHistorico.Fecha == fecha_yf.date()
                ).first()
                
                if not existe:
                    nuevo_precio = PrecioHistorico(
                        IdEmpresa=empresa.IdEmpresa,
                        Fecha=fecha_yf.date(),
                        PrecioCierre=precio_cierre_final,
                        Volumen=volumen_final
                    )
                    db.add(nuevo_precio)
            
            db.commit() # Guardamos por cada empresa
            print(f"✅ {empresa.Ticket} actualizado: ${precio_cierre_final:.2f}")
            
        except Exception as e:
            print(f"❌ Error actualizando {empresa.Ticket}: {e}")
            db.rollback()

# Bloque para poder probar el script directamente desde la terminal
if __name__ == "__main__":
    from app.db.sessions import SessionLocal
    db = SessionLocal()
    try:
        print("Iniciando actualización de precios...")
        actualizar_precios(db)
        print("Actualización completada con éxito.")
    finally:
        db.close()