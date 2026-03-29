// src/pages/Admin/Panel/Panel.js
import React, { useState } from 'react';
import toast from 'react-hot-toast';

// 1. Nuevas Importaciones por Features
import { useEmpresas } from '../../../features/empresas/hooks/useEmpresas';
import EmpresaTable from '../../../features/empresas/components/EmpresaTable';
import EmpresaForm from '../../../features/empresas/components/EmpresaForm';
import AnalisisIAButton from '../../../features/ia_analisis/components/AnalisisIAButton';
import EntrenamientoSelector from '../../../features/ia_analisis/components/EntrenamientoSelector';
import AdminPanelTareas from '../../../features/admin/components/AdminPanelTareas';

import { empresaService } from '../../../services';

// MUI
import { Box, Typography, Paper, Tabs, Tab, Button, Divider } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import StorageIcon from '@mui/icons-material/Storage';
import AddIcon from '@mui/icons-material/Add';

export default function Panel() {
  const [tabActiva, setTabActiva] = useState('empresas');
  
  // Estados para la gestión de Empresas
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState(null);

  // Consumimos los datos de las empresas para pasárselos a la tabla
  const { empresas, sectores, cargando, cargarDatos } = useEmpresas();

  const manejarCambioTab = (event, newValue) => {
    setTabActiva(newValue);
    setMostrarForm(false); 
  };

  // CRUD Lógica de Empresas (Se mantiene aquí porque maneja vistas locales)
  const manejarGuardar = async (datos) => {
    try {
      if (empresaAEditar) {
        await empresaService.actualizar(datos.IdEmpresa, datos);
        toast.success("Empresa actualizada");
      } else {
        await empresaService.crear(datos);
        toast.success("Empresa creada");
      }
      setMostrarForm(false);
      setEmpresaAEditar(null);
      cargarDatos(); // <-- Recargamos la tabla
    } catch (error) {
      toast.error("Error en la operación.");
    }
  };

  const eliminarEmpresa = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta empresa?")) {
      try {
        await empresaService.eliminar(id);
        toast.success("Empresa eliminada");
        cargarDatos(); // <-- Recargamos la tabla
      } catch(e) {
        toast.error("No se pudo eliminar la empresa");
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>Panel de Administración</Typography>
        <Typography variant="body1" color="text.secondary">Gestión integral de activos, empresas y procesos de IA.</Typography>
      </Paper>

      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#fafafa' }}>
          <Tabs value={tabActiva} onChange={manejarCambioTab} indicatorColor="primary" textColor="primary" variant="fullWidth">
            <Tab icon={<BusinessIcon />} iconPosition="start" label="Empresas" value="empresas" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab icon={<PrecisionManufacturingIcon />} iconPosition="start" label="Modelos IA" value="ia" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab icon={<StorageIcon />} iconPosition="start" label="Datos Maestros" value="maestros" sx={{ fontWeight: 'bold', py: 2 }} />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, md: 4 } }}>
          
          {tabActiva === 'empresas' && (
            <Box>
              {!mostrarForm ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">Listado Maestro de Empresas</Typography>
                    <Button 
                      variant="contained" color="secondary" startIcon={<AddIcon />}
                      onClick={() => { setEmpresaAEditar(null); setMostrarForm(true); }}
                      sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                      Nueva Empresa
                    </Button>
                  </Box>
                  
                  {/* TABLA PASANDO PROPS */}
                  <EmpresaTable 
                    empresas={empresas}
                    sectores={sectores}
                    cargando={cargando}
                    esAdmin={true} 
                    onEdit={(emp) => { setEmpresaAEditar(emp); setMostrarForm(true); }} 
                    onDelete={eliminarEmpresa} 
                  />
                </>
              ) : (
                <EmpresaForm empresaInicial={empresaAEditar} onSave={manejarGuardar} onCancel={() => setMostrarForm(false)} />
              )}
            </Box>
          )}

          {tabActiva === 'ia' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">Ejecución de Modelos Predictivos</Typography>
              <Divider sx={{ mb: 4, width: '50%', mx: 'auto' }} />
              <AnalisisIAButton onComplete={() => toast.success("Análisis Masivo Completado")} />
              <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                <EntrenamientoSelector />
              </Box>
            </Box>
          )}

          {tabActiva === 'maestros' && (
             <AdminPanelTareas />
          )}
          
        </Box>
      </Paper>
    </Box>
  );
}