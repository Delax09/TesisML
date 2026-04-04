# app/auto/importar_tickers.py
import pandas as pd
import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Empresa, Sector # Usamos models.models como en tu original
from app.utils.horaformateada import obtener_hora_formateada

def importar_desde_csv(db: Session):
    # Localizamos el archivo
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "Tickers.csv")
    
    if not os.path.exists(csv_path):
        return False

    try:
        df = pd.read_csv(csv_path)
        
        for _, row in df.iterrows():
            # 1. Gestión del Sector (Usando tu nombre de columna 'Sectores')
            nombre_s = row['Sectores']
            if pd.isna(nombre_s): continue
            
            sector = db.query(Sector).filter(Sector.NombreSector == nombre_s).first()
            if not sector:
                sector = Sector(NombreSector=nombre_s)
                db.add(sector)
                db.commit()
                db.refresh(sector)
            
            # 2. Gestión de la Empresa (Usando tus nombres de columna originales)
            ticket_val = row['Ticker Yahoo Finance']
            nombre_e = row['Nombre Empresa']
            
            empresa_existente = db.query(Empresa).filter(Empresa.Ticket == ticket_val).first()
            if not empresa_existente:
                nueva_empresa = Empresa(
                    Ticket=ticket_val,
                    NombreEmpresa=nombre_e,
                    IdSector=sector.IdSector,
                    FechaAgregado=obtener_hora_formateada(), # Añadido como en tu original
                    Activo=True
                )
                db.add(nueva_empresa)
        
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        raise e