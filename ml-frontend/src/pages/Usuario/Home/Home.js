import React, { useState } from 'react';
import { useAuth } from 'context';
import { EmpresaTable, PrecioChart, ResultadoPanel } from 'components'; // Importaciones limpias

export default function Home() {
  const { usuario } = useAuth();
  
  // Estado para controlar a qué empresa se le hizo clic en la tabla
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });

  const manejarSeleccionEmpresa = (id, nombre) => {
    setEmpresaSeleccionada({ id, nombre });
  };

  return (
    <div style={estilos.layout}>
      
      {/* HEADER: Saludo */}
      <header style={estilos.header}>
        <h1 style={estilos.titulo}>Mi Portafolio - {usuario?.nombre}</h1>
        <p style={estilos.subtitulo}>Analiza el historial de precios y las predicciones del mercado.</p>
      </header>

      {/* SECCIÓN 1: Gráficos de Análisis (Arriba) */}
      <div style={estilos.seccionAnalisis}>
        {/* Gráfico de Precios (Ocupa más espacio) */}
        <div style={{ flex: 3, minWidth: '350px' }}>
          <PrecioChart 
            empresaId={empresaSeleccionada.id} 
            nombreEmpresa={empresaSeleccionada.nombre} 
          />
        </div>
        
        {/* Panel de IA (Ocupa el lateral) */}
        <div style={{ flex: 1, minWidth: '280px', marginTop: '1rem' }}>
          <ResultadoPanel 
            empresaId={empresaSeleccionada.id} 
          />
        </div>
      </div>

      {/* SECCIÓN 2: Tabla de Datos con Filtros (Abajo) */}
      <div style={estilos.seccionDatos}>
        <EmpresaTable onSelect={manejarSeleccionEmpresa} />
      </div>

    </div>
  );
}

// Estilos de la vista para mantener todo organizado
const estilos = {
  layout: { display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' },
  header: { backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  titulo: { margin: 0, color: '#1e293b', fontSize: '1.8rem' },
  subtitulo: { margin: '5px 0 0 0', color: '#64748b' },
  seccionAnalisis: { display: 'flex', flexDirection: 'row', gap: '20px', width: '100%', alignItems: 'flex-start', flexWrap: 'wrap' },
  seccionDatos: { width: '100%' }
};