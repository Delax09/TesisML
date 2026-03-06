import os
import sys
import pandas as pd
from datetime import datetime

# =============================================================================
# CONFIGURACIÓN DE RUTAS (SOLUCIÓN A ModuleNotFoundError)
# =============================================================================
# Obtenemos la ruta de la carpeta donde está este script (app/auto)
directorio_actual = os.path.dirname(os.path.abspath(__file__))
# Obtenemos la raíz del proyecto (ml-backend)
raiz_proyecto = os.path.abspath(os.path.join(directorio_actual, "..", ".."))

# Agregamos la raíz al PYTHONPATH para que reconozca el módulo 'app'
if raiz_proyecto not in sys.path:
    sys.path.append(raiz_proyecto)

from app.db.sessions import SessionLocal
from app.models.models import Empresa, Sector

def poblar_desde_csv():
    # Buscamos el archivo Tickers.csv en la misma carpeta que este script
    csv_path = os.path.join(directorio_actual, "Tickers.csv")
    
    if not os.path.exists(csv_path):
        print(f"❌ ERROR: No se encontró el archivo en: {csv_path}")
        return

    db = SessionLocal()
    try:
        print(f"✅ Procesando archivo: {csv_path}")
        df = pd.read_csv(csv_path)

        for _, row in df.iterrows():
            # 1. Gestión del Sector
            nombre_s = row['Sectores']
            if pd.isna(nombre_s): continue
            
            sector = db.query(Sector).filter(Sector.NombreSector == nombre_s).first()
            if not sector:
                print(f"➕ Creando sector: {nombre_s}")
                sector = Sector(NombreSector=nombre_s)
                db.add(sector)
                db.commit()
                db.refresh(sector)

            # 2. Gestión de la Empresa
            ticket_val = row['Ticker Yahoo Finance']
            nombre_e = row['Nombre Empresa']
            
            empresa_existente = db.query(Empresa).filter(Empresa.Ticket == ticket_val).first()
            if not empresa_existente:
                print(f"🏢 Insertando: {nombre_e} ({ticket_val})")
                nueva_empresa = Empresa(
                    Ticket=ticket_val,
                    NombreEmpresa=nombre_e,
                    IdSector=sector.IdSector,
                    FechaAgregado=datetime.now()
                )
                db.add(nueva_empresa)
            else:
                print(f"⏭️  Saltando {ticket_val}: ya existe.")

        db.commit()
        print("\n🚀 ¡IMPORTACIÓN FINALIZADA CON ÉXITO!")

    except Exception as e:
        db.rollback()
        print(f"❌ ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    poblar_desde_csv()