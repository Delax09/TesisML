// src/App.js

import React from 'react';
import AuthForm from './components/AuthForm'; 
import SectorList from './components/SectorList';
import EmpresaTable from './components/EmpresaTable';

function App() {
  return (
    <div style={estilos.layout}>
      <header style={estilos.header}>
        <h1>Plataforma ML - Análisis Financiero</h1>
      </header>
      
      <main style={estilos.contenido}>
        {/* Mantenemos el AuthForm que es importante */}
        <AuthForm />

        {/* 2. Añadimos un separador o espacio y mostramos la tabla */}
        <div style={estilos.espaciador}>
          <SectorList />
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
