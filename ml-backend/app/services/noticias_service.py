import http
import datetime
from sqlalchemy.orm import Session
from app.models import Portafolio, Empresa
from app.core.config import settings
from app.exceptions import InvalidDataError

class NoticiasService:

    
    @staticmethod
    async def obtener_noticias_portafolio(db: Session, usuario_id: int):
        # 1. Obtener las empresas del portafolio del usuario
        portafolios = db.query(Portafolio).filter(
            Portafolio.IdUsuario == usuario_id,
            Portafolio.Activo == True
        ).all()
        
        if not portafolios:
            return []
            
        empresa_ids = [p.IdEmpresa for p in portafolios]
        empresas = db.query(Empresa).filter(Empresa.IdEmpresa.in_(empresa_ids)).all()
        tickers = [emp.Ticket for emp in empresas]
        
        # 2. Definir el rango de fechas (Últimos 7 días)
        fecha_fin = datetime.datetime.now()
        fecha_inicio = fecha_fin - datetime.timedelta(days=7)
        
        str_fin = fecha_fin.strftime('%Y-%m-%d')
        str_inicio = fecha_inicio.strftime('%Y-%m-%d')
        
        api_key = settings.FINNHUB_API_KEY
        noticias_totales = []
        
        # 3. Consultar la API de Finnhub de forma asíncrona por cada ticker
        async with http.AsyncClient() as client:
            for ticker in tickers:
                url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={str_inicio}&to={str_fin}&token={api_key}"
                
                try:
                    respuesta = await client.get(url)
                    if respuesta.status_code == 200:
                        noticias_empresa = respuesta.json()
                        # Finnhub devuelve muchas noticias, tomaremos solo las 5 más recientes por empresa
                        for item in noticias_empresa[:5]: 
                            # Convertir el timestamp de Finnhub a Datetime de Python
                            fecha_dt = datetime.datetime.fromtimestamp(item.get("datetime", 0))
                            
                            noticias_totales.append({
                                "id": item.get("id"),
                                "titular": item.get("headline", "Sin titular"),
                                "resumen": item.get("summary", ""),
                                "url_noticia": item.get("url", ""),
                                "url_imagen": item.get("image", ""),
                                "fuente": item.get("source", "Desconocido"),
                                "fecha_publicacion": fecha_dt,
                                "ticker_relacionado": item.get("related", ticker)
                            })
                except Exception as e:
                    print(f"Error obteniendo noticias para {ticker}: {e}")
                    continue
                    
        # 4. Ordenar todas las noticias de más nuevas a más viejas
        noticias_ordenadas = sorted(noticias_totales, key=lambda x: x["fecha_publicacion"], reverse=True)
        
        return noticias_ordenadas