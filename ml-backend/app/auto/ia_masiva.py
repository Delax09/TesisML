# app/auto/ia_masiva.py
from sqlalchemy.orm import Session
from app.models.empresa import Empresa
# Aquí importamos tu motor de ML real
from app.ml.engine import MLEngine 
from app.services.resultado_service import ResultadoService

def ejecutar_ia_masiva(db: Session):
    """
    Recorre todas las empresas activas, genera predicciones y guarda resultados.
    """
    print("🚀 [IA-MASSIVE] Iniciando procesamiento de mercado...")
    
    try:
        # 1. Obtener solo empresas activas
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        
        if not empresas:
            
            return

        # 2. Instanciar el motor y el servicio (una sola vez para ahorrar memoria)
        engine = MLEngine()
        resultado_service = ResultadoService(db)

        for empresa in empresas:
            try:
                print(f"🧠 [IA] Analizando: {empresa.Ticket}...")
                
                # Ejecutamos el análisis (asumiendo que tu engine devuelve el dict de resultados)
                analisis = engine.analizar_empresa(db, empresa.IdEmpresa)
                
                if analisis:
                    # Guardamos el resultado en la tabla 'Resultados'
                    resultado_service.crear_resultado(empresa.IdEmpresa, analisis)
                    print(f"✅ [IA] {empresa.Ticket} completado.")
                else:
                    print(f"⏭️ [IA] {empresa.Ticket} saltado (insuficientes datos).")

            except Exception as e:
                print(f"❌ [IA] Error procesando {empresa.Ticket}: {str(e)}")
                continue # Importante: si una falla, seguimos con la siguiente

        print("🏁 [IA-MASSIVE] Proceso masivo finalizado exitosamente.")

    except Exception as e:
        print(f"🔥 [IA-MASSIVE] Error crítico en el motor: {str(e)}")