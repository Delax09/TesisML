import pandas as pd
from sqlalchemy import create_engine
from app.core.config import settings

# 1. Tu cadena de conexión directa a PostgreSQL (la encuentras en Supabase -> Project Settings -> Database)
DATABASE_URL = settings.DATABASE_URL

# Crear el motor de conexión
engine = create_engine(DATABASE_URL)

def descargar_historicos_csv():
    # 2. Obtener la lista de empresas para generar los nombres de archivo dinámicos
    query_empresas = 'SELECT "IdEmpresa", "Ticket" FROM public."Empresa";'
    df_empresas = pd.read_sql(query_empresas, engine)

    # 3. Iterar sobre cada empresa y descargar su historial
    for index, empresa in df_empresas.iterrows():
        id_empresa = empresa['IdEmpresa']
        ticket = empresa['Ticket'] # Asumiendo que tienes una columna 'Ticket' que guarda 'META', 'INTC', etc.
        
        query_historico = f"""
        SELECT 
            "Fecha", 
            "PrecioApertura", 
            "PrecioMaximo", 
            "PrecioMinimo", 
            "PrecioCierre", 
            "Volumen"
        FROM 
            public."PrecioHistorico"
        WHERE 
            "IdEmpresa" = {id_empresa}
        ORDER BY 
            "Fecha" ASC;
        """
        
        # Ejecutar la consulta para la empresa específica
        df_historico = pd.read_sql(query_historico, engine)
        
        # 4. Generar el CSV si hay datos
        if not df_historico.empty:
            nombre_archivo = f"data_{ticket}.csv"
            df_historico.to_csv(nombre_archivo, index=False)
            print(f"Archivo generado exitosamente: {nombre_archivo}")
        else:
            print(f"Sin datos para {ticket}")

if __name__ == "__main__":
    descargar_historicos_csv()