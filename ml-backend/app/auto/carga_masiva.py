# app/auto/carga_masiva.py
import yfinance as yf
import pandas as pd
import warnings
from sqlalchemy.orm import Session
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

def cargar_historico_completo(db: Session):
    empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
    
    for empresa in empresas:
        print(f"⏳ Descargando histórico completo de {empresa.Ticket}...")
        try:
            # period="max" descarga toda la historia disponible de la empresa
            data = yf.download(empresa.Ticket, period="max", interval="1d", auto_adjust=False)
            
            if data.empty:
                print(f"⚠️ No hay datos para {empresa.Ticket}")
                continue

            # OPTIMIZACIÓN: Traemos todas las fechas que ya existen en la BD para esta empresa
            # y las guardamos en un 'Set' de Python. Buscar en un Set toma 0.0001 segundos.
            fechas_existentes = db.query(PrecioHistorico.Fecha).filter(PrecioHistorico.IdEmpresa == empresa.IdEmpresa).all()
            fechas_set = {f[0] for f in fechas_existentes} 
            
            nuevos_registros = []
            
            # Recorremos toda la historia descargada
            for index, row in data.iterrows():
                fecha_yf = index.date()
                
                # Solo procesamos si la fecha no está en la base de datos
                if fecha_yf not in fechas_set:
                    precio_bruto = row['Close']
                    volumen_bruto = row['Volume']
                    
                    # Desarmamos la Serie si YFinance viene en el nuevo formato
                    if isinstance(precio_bruto, pd.Series):
                        precio_bruto = precio_bruto.iloc[0]
                    if isinstance(volumen_bruto, pd.Series):
                        volumen_bruto = volumen_bruto.iloc[0]
                    
                    # Saltamos datos corruptos o días sin cotización
                    if pd.isna(precio_bruto) or pd.isna(volumen_bruto):
                        continue
                        
                    nuevo_precio = PrecioHistorico(
                        IdEmpresa=empresa.IdEmpresa,
                        Fecha=fecha_yf,
                        PrecioCierre=float(precio_bruto),
                        Volumen=int(volumen_bruto)
                    )
                    nuevos_registros.append(nuevo_precio)
            
            # BULK INSERT: Guardamos todos los años de historia de golpe (mucho más rápido)
            if nuevos_registros:
                db.bulk_save_objects(nuevos_registros)
                db.commit()
                print(f"✅ ¡Éxito! Se insertaron {len(nuevos_registros)} nuevos registros para {empresa.Ticket}.")
            else:
                print(f"⚡ Toda la historia de {empresa.Ticket} ya estaba en la base de datos.")
                
        except Exception as e:
            print(f"❌ Error procesando {empresa.Ticket}: {e}")
            db.rollback()

if __name__ == "__main__":
    from app.db.sessions import SessionLocal
    db = SessionLocal()
    try:
        print("🚀 INICIANDO CARGA MASIVA DE DATOS HISTÓRICOS...")
        cargar_historico_completo(db)
        print("🏁 Carga masiva completada.")
    finally:
        db.close()