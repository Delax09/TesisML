import yfinance as yf
import pandas as pd
import warnings
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico

# Desactivar advertencias de yfinance
warnings.filterwarnings("ignore", category=FutureWarning)

def actualizar_precios_empresa(db: Session, empresa_id: int, ticker: str):
    """
    Descarga y actualiza los precios históricos de una empresa específica
    usando inserción masiva para optimizar la base de datos.
    """
    # 1. Determinar desde qué fecha descargar
    ultimo_precio = db.query(func.max(PrecioHistorico.Fecha)).filter(
        PrecioHistorico.IdEmpresa == empresa_id
    ).scalar()

    if ultimo_precio:
        # Si ya hay datos, empezamos desde el día siguiente al último registro
        start_date = (ultimo_precio - timedelta(days=35)).strftime('%Y-%m-%d')
    else:
        # Si es nueva, traigo todos desde el inicio de Yahoo Finance
        start_date = "1900-01-01"

    print(f"Descargando {ticker} desde {start_date}...")

    try:
        # 2. Descarga de Yahoo Finance
        data = yf.download(ticker, start=start_date, progress=False)

        if data.empty:
            print(f"ℹ️ No hay datos nuevos para {ticker}.")
            return {"message": f"No hay datos nuevos para {ticker}.", "registros_actualizados": 0}

        # --- NUEVO: SOLUCIÓN AL ERROR DE MULTIINDEX DE YFINANCE ---
        # Si yfinance nos entrega columnas anidadas, eliminamos el nivel del Ticker
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.droplevel(1)
        # ----------------------------------------------------------

        # 3. Preparar los registros para inserción masiva
        nuevos_registros = []
        for index, row in data.iterrows():
            
            # Ahora row['Close'] volverá a ser un número simple
            precio_cierre = float(row['Close'])
            
            if pd.isna(precio_cierre): continue

            nuevo_precio = PrecioHistorico(
                IdEmpresa=empresa_id,
                Fecha=index.date(),
                PrecioCierre=precio_cierre,
                Volumen=int(row['Volume']) if not pd.isna(row['Volume']) else 0
            )
            nuevos_registros.append(nuevo_precio)

        # 4. Ejecutar la optimización: Guardar todos de un solo golpe
        if nuevos_registros:
            db.add_all(nuevos_registros)
            db.commit()
            print(f"✅ {ticker}: {len(nuevos_registros)} registros actualizados.")
            return {"message": f"Precios actualizados para {ticker}", "registros_actualizados": len(nuevos_registros)}
        else:
            return {"message": f"No se encontraron precios válidos para {ticker}.", "registros_actualizados": 0}

    except Exception as e:
        db.rollback()
        print(f"❌ Error al actualizar {ticker}: {e}")

def ejecutar_actualizacion_masiva():
    """
    Recorre todas las empresas activas y actualiza sus precios.
    """
    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"🚀 Iniciando actualización para {len(empresas)} empresas...")

        for empresa in empresas:
            actualizar_precios_empresa(db, empresa.IdEmpresa, empresa.Ticket)
        
        print("🏁 Proceso de actualización finalizado exitosamente.")
    finally:
        db.close()

if __name__ == "__main__":
    ejecutar_actualizacion_masiva()