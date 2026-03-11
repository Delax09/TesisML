// src/App.js
import React, { useState } from 'react'; // Importamos useState para la interacción
import AuthForm from './components/AuthForm'; 
import SectorList from './components/SectorList';
import EmpresaTable from './components/EmpresaTable';
import RolList from './components/RolList';
import PrecioChart from './components/PrecioChart';
import ResultadoPanel from './components/ResultadoPanel';

function App() {
  // Estado para capturar qué empresa seleccionamos
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });

  // Función para manejar la selección (se la pasaremos a la tabla)
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

        <div style={estilos.seccionMaestras}>
          <div style={{ flex: 1 }}><SectorList /></div>
          <div style={{ flex: 1 }}><RolList /></div>
        </div>

        <div style={estilos.seccionAnalisis}>
            <div style={{ flex: 3 }}>
                <PrecioChart 
                    empresaId={empresaSeleccionada.id} 
                    nombreEmpresa={empresaSeleccionada.nombre} 
                />
            </div>
            <div style={{ flex: 1 }}>
                <ResultadoPanel empresaId={empresaSeleccionada.id} />
            </div>
        </div>
        
        <div style={estilos.seccionDatos}>
          {/* Pasamos la función de selección como una 'prop' a la tabla */}
          <EmpresaTable onSelect={manejarSeleccionEmpresa} />
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
    minHeight: '100vh',
    paddingBottom: '3rem'
  },
  header: { padding: '1rem', color: '#333' },
  contenido: { 
    marginTop: '2rem',
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    width: '90%',        // Ocupa más ancho en pantallas grandes
    maxWidth: '1200px'   // Pero con un tope para que no se deforme
  },
  seccionMaestras: { 
    display: 'flex', 
    gap: '20px', 
    width: '100%',
    flexWrap: 'wrap' 
  },
  seccionAnalisis: {
      display: 'flex',
      flexDirection: 'row', // Esto los pone al lado
      gap: '20px',
      width: '100%',
      alignItems: 'flex-start',
      flexWrap: 'wrap' // Para que en móviles se ponga uno abajo del otro
  },
  seccionDatos: { 
    width: '100%' 
  }
};

export default App;