import React, { useState } from 'react';

// Importación de componentes 
import { 
  AuthForm, 
  AdminPanel, 
  EmpresaTable, 
  PrecioChart,
  ResultadoPanel,
  AnalisisIAButton
} from 'components';

function Login() {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });

  const manejarSeleccionEmpresa = (id, nombre) => {
    setEmpresaSeleccionada({ id, nombre });
  };

  return (
    <div style={estilos.layout}>
      <header style={estilos.header}>
        <h1>Plataforma ML - Análisis Financiero</h1>
      </header>
      
      <main style={estilos.contenido}>
        <div style={estilos.contenedorLogin}>
          <AuthForm />
        </div>
        
        {/* CONTENEDOR DE DATOS (Tradicional) */}
        <div style={estilos.contenedorSeccion}>
            <h3 style={estilos.subtitulo}>Gestión de Datos</h3>
            <AdminPanel /> 
        </div>

        {/* CONTENEDOR EXTERNO DE IA (Separado) */}
        <div style={{...estilos.contenedorSeccion, backgroundColor: '#f8f9ff', border: '1px solid #e0e7ff'}}>
            <h3 style={{...estilos.subtitulo, color: '#4f46e5'}}>Inteligencia Artificial</h3>
            <p style={estilos.descripcion}>
                Calcula predicciones, RSI y Scores para todas las empresas activas en la base de datos.
            </p>
            <AnalisisIAButton onComplete={() => console.log("IA Masiva iniciada")} />
        </div>

        {/* Sección de Info Selección actual (Solo texto) */}
        {empresaSeleccionada.id && (
            <div style={estilos.barraInfo}>
                <span>Visualizando datos de: <strong>{empresaSeleccionada.nombre}</strong></span>
            </div>
        )}

        <div style={estilos.seccionAnalisis}>
            <div style={{ flex: 3, minWidth: '300px' }}>
                <PrecioChart empresaId={empresaSeleccionada.id} nombreEmpresa={empresaSeleccionada.nombre} />
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
                <ResultadoPanel empresaId={empresaSeleccionada.id} />
            </div>
        </div>

        <div style={estilos.seccionDatos}>
          <EmpresaTable onSelect={manejarSeleccionEmpresa} />
        </div>
      </main>
    </div>
  );
}

const estilos = {
  // AQUÍ ESTÁ LA MAGIA: height: '100vh', overflowY: 'auto', width: '100%'
  layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f2f5', height: '100vh', overflowY: 'auto', width: '100%', paddingBottom: '3rem' },
  header: { padding: '1rem', color: '#333' },
  contenido: { marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '95%', maxWidth: '1300px' },
  barraAccion: { 
    width: '100%', 
    backgroundColor: 'white', 
    padding: '1rem 2rem', 
    borderRadius: '12px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  contenedorSeccion: {
    width: '100%',
    padding: '2rem',
    borderRadius: '16px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    boxSizing: 'border-box'
  },
  subtitulo: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#374151'
  },
  descripcion: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '500px'
  },
  barraInfo: {
        width: '100%',
        padding: '10px 20px',
        backgroundColor: '#e8f0fe',
        borderRadius: '8px',
        color: '#1a73e8'
  },
  seccionMaestras: { display: 'flex', gap: '20px', width: '100%', flexWrap: 'wrap' },
  seccionAnalisis: { display: 'flex', flexDirection: 'row', gap: '20px', width: '100%', alignItems: 'flex-start', flexWrap: 'wrap' },
  seccionDatos: { width: '100%' },
  contenedorLogin: { 
    width: '100%', 
    maxWidth: '450px'
  }
};

export default Login;