"""
Servicio para análisis de sentimiento de noticias usando FinBERT.
FinBERT es un modelo transformer pre-entrenado específicamente para textos financieros.
"""

import os
import logging
from typing import Tuple
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models import Empresa, NoticiaSentimiento
from app.core.config import settings
from app.exceptions import InvalidDataError

logger = logging.getLogger(__name__)

# Importar FinBERT (lazy loading para no cargar en memoria si no se usa)
_finbert_pipeline = None

def obtener_finbert_pipeline():
    """Carga el modelo FinBERT una sola vez (singleton)."""
    global _finbert_pipeline
    if _finbert_pipeline is None:
        try:
            from transformers import pipeline
            logger.info("Cargando modelo FinBERT...")
            _finbert_pipeline = pipeline(
                "zero-shot-classification",
                model="ProsusAI/finbert",
                device=0 if os.environ.get('CUDA_AVAILABLE') == '1' else -1  # -1 = CPU
            )
        except ImportError:
            logger.error("transformers no instalado. Instalar: pip install transformers torch")
            raise
    return _finbert_pipeline


class SentimentoAnalisisService:
    
    VENTANA_DIAS = 7  # Considerar noticias últimos 7 días
    
    @staticmethod
    async def analizar_sentimiento_texto(texto: str) -> dict:
        """
        Analiza el sentimiento de un texto usando FinBERT.
        
        Args:
            texto: Texto a analizar (titular o resumen)
            
        Returns:
            dict con:
                - score: float (0.0 negativo a 1.0 positivo)
                - etiqueta: str ('POSITIVE', 'NEUTRAL', 'NEGATIVE')
                - confianza: float (0.0-1.0)
        """
        try:
            pipeline = obtener_finbert_pipeline()
            
            # FinBERT usa zero-shot classification
            candidatos = ["positive", "neutral", "negative"]
            resultado = pipeline(
                texto[:512],  # Limitar a 512 tokens (límite de BERT)
                candidatos,
                multi_class=False
            )
            
            # Mapear etiqueta a score
            etiqueta = resultado['labels'][0]
            confianza = resultado['scores'][0]
            
            # Convertir etiqueta a score (0-1)
            score_map = {
                'positive': 0.7 + (confianza * 0.3),  # 0.7-1.0
                'neutral': 0.5,                        # 0.5
                'negative': 0.0 + ((1-confianza) * 0.3) # 0.0-0.3
            }
            score = score_map.get(etiqueta, 0.5)
            
            return {
                'score': score,
                'etiqueta': etiqueta,
                'confianza': confianza
            }
            
        except Exception as e:
            logger.error(f"Error analizando sentimiento: {e}")
            # En caso de error, retornar neutral
            return {
                'score': 0.5,
                'etiqueta': 'neutral',
                'confianza': 0.0
            }
    
    @staticmethod
    async def obtener_noticias_newsapi(ticker: str, dias: int = 7) -> list:
        """
        Obtiene noticias de NewsAPI para un ticker específico.
        
        Args:
            ticker: Símbolo de cotización (AAPL, TSLA, etc.)
            dias: Número de días hacia atrás a consultar
            
        Returns:
            Lista de noticias con estructura:
            {
                'titulo': str,
                'descripcion': str,
                'url': str,
                'imagen': str,
                'fuente': str,
                'fecha': datetime
            }
        """
        if not settings.NEWSAPI_KEY:
            logger.warning("NEWSAPI_KEY no configurada")
            return []
        
        try:
            fecha_desde = (datetime.now() - timedelta(days=dias)).strftime('%Y-%m-%d')
            
            url = "https://newsapi.org/v2/everything"
            params = {
                'q': ticker,  # Buscar por ticker
                'from': fecha_desde,
                'sort': 'publishedAt',
                'language': 'en',
                'page': 1,
                'pageSize': 50,  # Máximo para NewsAPI
                'apiKey': settings.NEWSAPI_KEY
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                respuesta = await client.get(url, params=params)
                
                if respuesta.status_code != 200:
                    logger.error(f"NewsAPI error {respuesta.status_code}: {respuesta.text}")
                    return []
                
                datos = respuesta.json()
                noticias = []
                
                for articulo in datos.get('articles', []):
                    try:
                        noticias.append({
                            'titulo': articulo.get('title', ''),
                            'descripcion': articulo.get('description', ''),
                            'url': articulo.get('url', ''),
                            'imagen': articulo.get('urlToImage', ''),
                            'fuente': articulo.get('source', {}).get('name', 'Unknown'),
                            'fecha': datetime.fromisoformat(
                                articulo.get('publishedAt', '').replace('Z', '+00:00')
                            )
                        })
                    except Exception as e:
                        logger.warning(f"Error procesando artículo: {e}")
                        continue
                
                return noticias
                
        except Exception as e:
            logger.error(f"Error obteniendo noticias de NewsAPI: {e}")
            return []
    
    @staticmethod
    async def procesar_noticias_empresa(
        db: Session,
        empresa: Empresa,
        guardar_en_bd: bool = True
    ) -> dict:
        """
        Obtiene noticias de una empresa, analiza sentimiento y guarda en BD.
        
        Args:
            db: Sesión de BD
            empresa: Objeto Empresa
            guardar_en_bd: Si True, guarda en tabla NoticiaSentimiento
            
        Returns:
            dict con análisis agregado:
            {
                'ticker': str,
                'total_noticias': int,
                'sentimiento_promedio': float,
                'distribucion': {
                    'positivo': int,
                    'neutral': int,
                    'negativo': int
                },
                'noticias_procesadas': list
            }
        """
        ticker = empresa.Ticket
        logger.info(f"Procesando noticias para {ticker}...")
        
        # 1. Obtener noticias
        noticias = await SentimentoAnalisisService.obtener_noticias_newsapi(ticker)
        
        if not noticias:
            logger.warning(f"No se encontraron noticias para {ticker}")
            return {
                'ticker': ticker,
                'total_noticias': 0,
                'sentimiento_promedio': 0.5,
                'distribucion': {'positivo': 0, 'neutral': 0, 'negativo': 0},
                'noticias_procesadas': []
            }
        
        # 2. Analizar sentimiento de cada noticia
        noticias_procesadas = []
        sentimientos = []
        distribucion = {'positivo': 0, 'neutral': 0, 'negativo': 0}
        
        for noticia in noticias:
            # Analizar usando título + descripción
            texto_analizar = f"{noticia['titulo']}. {noticia['descripcion']}"
            resultado_sentimiento = await SentimentoAnalisisService.analizar_sentimiento_texto(
                texto_analizar
            )
            
            # Contar distribución
            if resultado_sentimiento['score'] > 0.6:
                distribucion['positivo'] += 1
            elif resultado_sentimiento['score'] < 0.4:
                distribucion['negativo'] += 1
            else:
                distribucion['neutral'] += 1
            
            sentimientos.append(resultado_sentimiento['score'])
            
            noticia_procesada = {
                'titulo': noticia['titulo'],
                'descripcion': noticia['descripcion'],
                'url': noticia['url'],
                'fuente': noticia['fuente'],
                'fecha_publicacion': noticia['fecha'],
                **resultado_sentimiento  # score, etiqueta, confianza
            }
            
            # 3. Guardar en BD
            if guardar_en_bd:
                try:
                    nueva_noticia = NoticiaSentimiento(
                        Titular=noticia['titulo'][:500],
                        Resumen=noticia['descripcion'][:2000] if noticia['descripcion'] else None,
                        URLNoticia=noticia['url'],
                        URLImagen=noticia['imagen'],
                        Fuente=noticia['fuente'],
                        Ticker=ticker,
                        IdEmpresa=empresa.IdEmpresa,
                        PuntuacionSentimiento=resultado_sentimiento['score'],
                        ModeloSentimiento='FinBERT',
                        ConfidenciaAnalisis=resultado_sentimiento['confianza'],
                        FechaPublicacionNoticia=noticia['fecha']
                    )
                    db.add(nueva_noticia)
                except Exception as e:
                    logger.error(f"Error guardando noticia para {ticker}: {e}")
            
            noticias_procesadas.append(noticia_procesada)
        
        # Calcular promedio
        sentimiento_promedio = sum(sentimientos) / len(sentimientos) if sentimientos else 0.5
        
        # Guardar cambios en BD
        if guardar_en_bd:
            try:
                db.commit()
                logger.info(f"✅ {len(noticias_procesadas)} noticias guardadas para {ticker}")
            except Exception as e:
                logger.error(f"Error commit BD para {ticker}: {e}")
                db.rollback()
        
        return {
            'ticker': ticker,
            'total_noticias': len(noticias_procesadas),
            'sentimiento_promedio': sentimiento_promedio,
            'distribucion': distribucion,
            'noticias_procesadas': noticias_procesadas
        }
    
    @staticmethod
    def obtener_sentimiento_semanal(db: Session, ticker: str) -> float:
        """
        Obtiene el sentimiento promedio semanal de una empresa.
        
        Args:
            db: Sesión de BD
            ticker: Símbolo de cotización
            
        Returns:
            float: Sentimiento promedio (0.0-1.0)
        """
        try:
            hace_7_dias = datetime.now() - timedelta(days=7)
            
            resultado = db.query(
                func.avg(NoticiaSentimiento.PuntuacionSentimiento).label('promedio')
            ).filter(
                and_(
                    NoticiaSentimiento.Ticker == ticker,
                    NoticiaSentimiento.FechaRegistro >= hace_7_dias.date()
                )
            ).first()
            
            sentimiento = resultado.promedio if resultado and resultado.promedio else 0.5
            return float(sentimiento)
            
        except Exception as e:
            logger.error(f"Error obteniendo sentimiento semanal para {ticker}: {e}")
            return 0.5  # Retornar neutral si hay error
