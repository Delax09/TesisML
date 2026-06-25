"""
Script diario para procesar noticias y analizar sentimiento.
Debe ejecutarse una vez por día (idealmente por la mañana antes de entrenar/predecir).

Uso:
    python -m app.auto.procesar_noticias_diarias
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.sessions import SessionLocal, engine
from app.models import Empresa, Base
from app.services.sentimiento_service import SentimentoAnalisisService
from app.core.config import settings

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/procesar_noticias.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


async def procesar_noticias_todas_empresas():
    """
    Procesa noticias para todas las empresas activas en la BD.
    Obtiene noticias de los últimos 7 días y analiza sentimiento.
    """
    db = SessionLocal()
    
    try:
        logger.info("=" * 80)
        logger.info("🔄 INICIANDO PROCESAMIENTO DE NOTICIAS DIARIO")
        logger.info(f"Timestamp: {datetime.now()}")
        logger.info("=" * 80)
        
        # 1. Obtener todas las empresas activas
        empresas_activas = db.query(Empresa).filter(Empresa.Activo == True).all()
        
        if not empresas_activas:
            logger.warning("❌ No hay empresas activas para procesar")
            return
        
        logger.info(f"📊 Procesando {len(empresas_activas)} empresas...")
        
        # 2. Procesar cada empresa
        resultados_resumen = {
            'total_empresas': len(empresas_activas),
            'empresas_exitosas': 0,
            'empresas_error': 0,
            'total_noticias': 0,
            'detalles': []
        }
        
        for empresa in empresas_activas:
            try:
                logger.info(f"\n📰 Procesando: {empresa.Ticket} ({empresa.NombreEmpresa})")
                
                resultado = await SentimentoAnalisisService.procesar_noticias_empresa(
                    db=db,
                    empresa=empresa,
                    guardar_en_bd=True
                )
                
                logger.info(
                    f"   ✅ {resultado['total_noticias']} noticias procesadas\n"
                    f"   Sentimiento promedio: {resultado['sentimiento_promedio']:.3f}\n"
                    f"   Distribución: {resultado['distribucion']}"
                )
                
                resultados_resumen['empresas_exitosas'] += 1
                resultados_resumen['total_noticias'] += resultado['total_noticias']
                resultados_resumen['detalles'].append({
                    'ticker': empresa.Ticket,
                    'nombre': empresa.NombreEmpresa,
                    **resultado
                })
                
            except Exception as e:
                logger.error(f"   ❌ Error procesando {empresa.Ticket}: {e}", exc_info=True)
                resultados_resumen['empresas_error'] += 1
        
        # 3. Resumen final
        logger.info("\n" + "=" * 80)
        logger.info("📊 RESUMEN FINAL")
        logger.info("=" * 80)
        logger.info(f"Empresas procesadas exitosamente: {resultados_resumen['empresas_exitosas']}/{resultados_resumen['total_empresas']}")
        logger.info(f"Empresas con error: {resultados_resumen['empresas_error']}")
        logger.info(f"Total de noticias procesadas: {resultados_resumen['total_noticias']}")
        logger.info("=" * 80)
        
        # 4. Mostrar top 5 empresas por sentimiento
        logger.info("\n🔝 TOP 5 EMPRESAS POR SENTIMIENTO POSITIVO:")
        detalles_ordenados = sorted(
            resultados_resumen['detalles'],
            key=lambda x: x['sentimiento_promedio'],
            reverse=True
        )
        
        for i, detalle in enumerate(detalles_ordenados[:5], 1):
            logger.info(
                f"   {i}. {detalle['ticker']}: {detalle['sentimiento_promedio']:.3f} "
                f"({detalle['total_noticias']} noticias)"
            )
        
        return resultados_resumen
        
    except Exception as e:
        logger.error(f"❌ Error general en procesamiento de noticias: {e}", exc_info=True)
        raise
        
    finally:
        db.close()


async def limpiar_noticias_antiguas(dias_retencao: int = 90):
    """
    Elimina noticias más antiguas que el período de retención.
    
    Args:
        dias_retencao: Número de días a mantener en BD (default: 90)
    """
    db = SessionLocal()
    
    try:
        logger.info(f"\n🧹 Limpiando noticias más antiguas que {dias_retencao} días...")
        
        fecha_limite = (datetime.now() - timedelta(days=dias_retencao)).date()
        
        noticias_a_borrar = db.query(NoticiaSentimiento).filter(
            NoticiaSentimiento.FechaRegistro < fecha_limite
        ).delete()
        
        db.commit()
        
        logger.info(f"✅ {noticias_a_borrar} noticias antiguas eliminadas")
        
    except Exception as e:
        logger.error(f"❌ Error limpiando noticias antiguas: {e}")
        db.rollback()
        
    finally:
        db.close()


def main():
    """Función principal para ejecutar como script."""
    logger.info(f"Iniciando procesamiento de noticias: {datetime.now()}")
    
    try:
        # Ejecutar procesamiento de noticias
        asyncio.run(procesar_noticias_todas_empresas())
        
        # Limpiar noticias antiguas (opcional)
        # asyncio.run(limpiar_noticias_antiguas(dias_retencao=90))
        
        logger.info("✅ Procesamiento completado exitosamente")
        
    except KeyboardInterrupt:
        logger.info("⚠️ Procesamiento cancelado por usuario")
    except Exception as e:
        logger.error(f"❌ Error fatal: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
