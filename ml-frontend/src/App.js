// src/App.js

import React from 'react';
import AuthForm from './components/AuthForm'; 
import SectorList from './components/SectorList';
import EmpresaTable from './components/EmpresaTable';
import RolList from './components/RolList';


function App() {
  return (
    <div style={estilos.layout}>
      <header style={estilos.header}>
        <h1>Plataforma ML - Análisis Financiero</h1>
      </header>
      
      <main style={estilos.contenido}>
        {/* Mantenemos el AuthForm que es importante */}
        <AuthForm />

        <div style={estilos.seccionMaestras}>
          <div style={{ flex: 1 }}><SectorList /></div>
          <div style={{ flex: 1 }}><RolList /></div>
        </div>
        
        <div style={estilos.seccionDatos}>
          <EmpresaTable />
        </div>
      </main>
    </div>
  );
}

const estilos = {
  layout: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    backgroundColor: '#f0f2f5', 
    minHeight: '100vh' 
  },
  header: { padding: '1rem', color: '#333' },
  contenido: { 
    marginTop: '2rem',
    display: 'flex',          // Asegura que los elementos dentro de main
    flexDirection: 'column',   // se apilen uno debajo del otro
    alignItems: 'center',
    gap: '2rem'                // Crea una separación automática entre el Login y la Tabla
  },
  espaciador: {
    width: '100%',             // Para que la tabla ocupe el ancho deseado
    maxWidth: '800px'          // Limita el ancho de la tabla para que no se vea gigante
  }
};

export default App;
