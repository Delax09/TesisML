import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.precio_historico import PrecioHistorico
from datetime import datetime, timedelta

# Para ejecutar este archivo: python -m app.auto.cargar_precios

def poblar_precios_historicos():
    db = SessionLocal()
    try:
        # 1. Obtener todas las empresas activas
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        print(f"🚀 Iniciando actualización para {len(empresas)} empresas...")

        for empresa in empresas:
            # 2. Buscar la última fecha registrada para esta empresa
            ultima_fecha = db.query(func.max(PrecioHistorico.Fecha)).filter(
                PrecioHistorico.IdEmpresa == empresa.IdEmpresa
            ).scalar()

            if ultima_fecha:
                # Si hay datos, empezamos desde el día siguiente a la última fecha
                fecha_inicio = ultima_fecha + timedelta(days=1)
                
                # Si la última fecha es hoy, saltamos la empresa
                if fecha_inicio >= datetime.now().date():
                    print(f"⏩ {empresa.Ticket} ya está actualizado hasta hoy.")
                    continue
                
                print(f"🔄 Actualizando {empresa.Ticket} desde {fecha_inicio}...")
                ticker_data = yf.download(empresa.Ticket, start=fecha_inicio, interval="1d")
            else:
                # Si la tabla está vacía para esta empresa, descargamos el histórico completo
                print(f"📥 Descargando histórico completo (6y) para {empresa.Ticket}...")
                ticker_data = yf.download(empresa.Ticket, period="max", interval="1d")

            # 3. Insertar nuevos datos si existen
            if not ticker_data.empty:
                nuevos_registros = 0
                for fecha, fila in ticker_data.iterrows():
                    # Validación de seguridad extra por si yfinance devuelve el último día duplicado
                    nuevo_precio = PrecioHistorico(
                        IdEmpresa=empresa.IdEmpresa,
                        Fecha=fecha.date(),
                        PrecioCierre=float(fila['Close']),
                        Volumen=int(fila['Volume'])
                    )
                    db.add(nuevo_precio)
                    nuevos_registros += 1
                
                db.commit()
                print(f"✅ {empresa.Ticket}: {nuevos_registros} registros nuevos añadidos.")
            else:
                print(f"ℹ️ {empresa.Ticket}: Sin datos nuevos para descargar.")

    except Exception as e:
        print(f"❌ Error crítico: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    poblar_precios_historicos()