import yfinance as yf
import pandas as pd
import warnings
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

# Importación directa de modelos y esquemas
from app.models import PrecioHistorico, Empresa 
from app.schemas.schemas import PrecioHistoricoCreate, PrecioHistoricoOut
from app.exceptions import ResourceNotFoundError, DuplicateResourceError, InvalidDataError

# Desactivar advertencias de yfinance
warnings.filterwarnings("ignore", category=FutureWarning)

class PrecioHistoricoService:

    @staticmethod
    def obtener_todos_precios_historicos(db: Session) -> list[PrecioHistoricoOut]:
        return db.query(PrecioHistorico).all()
    
    @staticmethod
    def obtener_precio_historico_por_empresa(db: Session, empresa_id: int) -> list[PrecioHistoricoOut]:
        precios = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == empresa_id
        ).order_by(PrecioHistorico.Fecha.asc()).all()
        
        if not precios:
            raise ResourceNotFoundError("PrecioHistorico", "IdEmpresa", empresa_id)
        return precios

    @staticmethod
    def get_by_empresa(db: Session, empresa_id: int):
        # 1. Traemos los datos de la base de datos
        resultados = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == empresa_id
        ).all()
        
        # 2. LIMPIEZA: Filtramos cualquier registro que tenga NaN en el precio
        datos_limpios = []
        for r in resultados:
            # Verificamos si el precio existe y es un número válido
            if r.PrecioCierre is not None:
                try:
                    valor_float = float(r.PrecioCierre)
                    if math.isfinite(valor_float):
                        datos_limpios.append(r)
                except (ValueError, TypeError):
                    continue
        
        return datos_limpios

    # --- NUEVO SERVICIO INTEGRADO ---
    @staticmethod
    def actualizar_precios_empresa(db: Session, empresa_id: int, ticker: str):
        """
        Descarga y actualiza los precios históricos de una empresa específica
        usando inserción masiva (bulk insert) para optimizar la base de datos.
        """
        # 1. Determinar desde qué fecha descargar
        ultimo_precio = db.query(func.max(PrecioHistorico.Fecha)).filter(
            PrecioHistorico.IdEmpresa == empresa_id
        ).scalar()

        if ultimo_precio:
            # Si ya hay datos, empezamos desde el día siguiente al último registro
            start_date = (ultimo_precio + timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            # Si es nueva, traemos los últimos 2 años por defecto
            start_date = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')

        print(f"Descargando {ticker} desde {start_date}...")

        try:
            # 2. Descarga de Yahoo Finance
            data = yf.download(ticker, start=start_date, progress=False)

            if data.empty:
                print(f"ℹ️ No hay datos nuevos para {ticker}.")
                return {"message": f"No hay datos nuevos para {ticker}.", "registros_actualizados": 0}
            
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.droplevel(1)
            
            data['SMA20'] = data['Close'].rolling(window=20).mean()
            data['StdDev'] = data['Close'].rolling(window=20).std()
            data['Banda_Superior'] = data['SMA_20'] + (data['StdDev'] * 2)
            data['Banda_Inferior'] = data['SMA_20'] - (data['StdDev'] * 2)

            # 3. Preparar los registros para inserción masiva
            nuevos_registros = []
            for index, row in data.iterrows():
                # Validar que el precio no sea nulo
                precio_cierre = float(row['Close'])
                if pd.isna(precio_cierre): continue

                nuevo_precio = PrecioHistorico(
                    IdEmpresa=empresa_id,
                    Fecha=index.date(),
                    PrecioCierre=precio_cierre,
                    Volumen=int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                    #Bandas de bollinger 
                    SMA_20=float(row['SMA_20']) if not pd.isna(row['SMA_20']) else None,
                    Banda_Superior=float(row['Banda_Superior']) if not pd.isna(row['Banda_Superior']) else None,
                    Banda_Inferior=float(row['Banda_Inferior']) if not pd.isna(row['Banda_Inferior']) else None
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
            # Levantamos un error personalizado para que FastAPI lo atrape y lo mande al Frontend
            raise InvalidDataError(f"Error al descargar o guardar precios de Yahoo Finance para {ticker}")