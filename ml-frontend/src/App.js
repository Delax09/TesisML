// src/App.js
import React, { useState } from 'react';
import AuthForm from './components/AuthForm'; 
import SectorList from './components/SectorList';
import EmpresaTable from './components/EmpresaTable';
import RolList from './components/RolList';
import PrecioChart from './components/PrecioChart';
import ResultadoPanel from './components/ResultadoPanel';
import AdminPanel from './components/AdminPanel';
import AnalisisIAButton from './components/AnalisisIAButton'; // <--- El nuevo componente

function App() {
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
        <AuthForm />
        <AdminPanel />

        {/* Sección de Acciones Rápidas */}
        {empresaSeleccionada.id && (
            <div style={estilos.barraAccion}>
                <span>Analizando: <strong>{empresaSeleccionada.nombre}</strong></span>
                <AnalisisIAButton 
                    empresaId={empresaSeleccionada.id} 
                    onComplete={() => console.log("IA finalizada, resultados actualizados")}
                />
            </div>
        )}

        <div style={estilos.seccionMaestras}>
          <div style={{ flex: 1 }}><SectorList /></div>
          <div style={{ flex: 1 }}><RolList /></div>
        </div>

        <div style={estilos.seccionAnalisis}>
            <div style={{ flex: 3, minWidth: '300px' }}>
                <PrecioChart 
                    empresaId={empresaSeleccionada.id} 
                    nombreEmpresa={empresaSeleccionada.nombre} 
                />
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
  layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f2f5', minHeight: '100vh', paddingBottom: '3rem' },
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
  seccionMaestras: { display: 'flex', gap: '20px', width: '100%', flexWrap: 'wrap' },
  seccionAnalisis: { display: 'flex', flexDirection: 'row', gap: '20px', width: '100%', alignItems: 'flex-start', flexWrap: 'wrap' },
  seccionDatos: { width: '100%' }
};

export default App;