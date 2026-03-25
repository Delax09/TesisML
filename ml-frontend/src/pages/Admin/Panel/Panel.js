// src/pages/admin/Panel/Panel.js
import React, { useState } from 'react';
import { 
  AdminPanel, 
  AnalisisIAButton, 
  EmpresaForm,
  EmpresaTable,
  EntrenamientoSelector
  } from 'components';
import { empresaService } from 'services';

export default function Panel() {
  const [tabActiva, setTabActiva] = useState('empresas');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState(null);

  const manejarGuardar = async (datos) => {
    try {
      if (empresaAEditar) {
        await empresaService.actualizar(datos.IdEmpresa, datos);
        alert("Empresa actualizada");
      } else {
        await empresaService.crear(datos);
        alert("Empresa creada");
      }
      setMostrarForm(false);
      setEmpresaAEditar(null);
    } catch (error) {
      alert("Error en la operación");
    }
  };

  const eliminarEmpresa = async (id) => {
    if (window.confirm("¿Eliminar empresa?")) {
      await empresaService.eliminar(id);
      alert("Eliminada");
    }
  };

  return (
    <div style={estilos.container}>
      <header style={estilos.header}>
        <h1>Panel de Administración</h1>
        <p>Gestión integral de activos y procesos de IA.</p>
      </header>

      {/* TABS */}
      <div style={estilos.tabBar}>
        <button onClick={() => {setTabActiva('empresas'); setMostrarForm(false);}} 
                style={{...estilos.tab, borderBottom: tabActiva === 'empresas' ? '3px solid #4f46e5' : 'none'}}>
          🏢 Empresas
        </button>
        <button onClick={() => setTabActiva('ia')} 
                style={{...estilos.tab, borderBottom: tabActiva === 'ia' ? '3px solid #4f46e5' : 'none'}}>
          🤖 IA
        </button>
        <button onClick={() => setTabActiva('maestros')} 
                style={{...estilos.tab, borderBottom: tabActiva === 'maestros' ? '3px solid #4f46e5' : 'none'}}>
          📊 Maestros
        </button>
      </div>

      <div style={estilos.contenidoCard}>
        {tabActiva === 'empresas' && (
          <div>
            {!mostrarForm ? (
              <>
                <div style={estilos.seccionTitulo}>
                  <h3>Listado Maestro</h3>
                  <button onClick={() => {setEmpresaAEditar(null); setMostrarForm(true);}} style={estilos.btnNuevo}>
                    + Nueva Empresa
                  </button>
                </div>
                <EmpresaTable 
                  esAdmin={true} 
                  onEdit={(emp) => {setEmpresaAEditar(emp); setMostrarForm(true);}} 
                  onDelete={eliminarEmpresa} 
                />
              </>
            ) : (
              <EmpresaForm 
                empresaInicial={empresaAEditar} 
                onSave={manejarGuardar} 
                onCancel={() => setMostrarForm(false)} 
              />
            )}
          </div>
        )}


        {tabActiva === 'ia' && (
          <div style={estilos.iaContainer}>
            {/* Botón original de análisis masivo */}
            <AnalisisIAButton onComplete={() => alert("IA Actualizada")} />
            
            {/* NUEVO: Selector de entrenamiento */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <EntrenamientoSelector />
            </div>
          </div>
        )}

        {tabActiva === 'maestros' && <AdminPanel />}
      </div>
    </div>
  );
}

const estilos = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' },
  header: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  tabBar: { display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0' },
  tab: { padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' },
  contenidoCard: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  seccionTitulo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnNuevo: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  iaContainer: { textAlign: 'center', padding: '40px 0' }
};