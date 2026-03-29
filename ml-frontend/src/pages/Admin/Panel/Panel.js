// src/pages/Admin/Panel/Panel.js
import React, { useState, useCallback } from 'react'; // 1. Importamos useCallback
import toast from 'react-hot-toast';

// Importaciones por Features
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
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState(null);

  const { empresas, sectores, cargando, cargarDatos } = useEmpresas();

  // 2. MEMOIZAMOS LAS FUNCIONES CON useCallback

  const manejarCambioTab = useCallback((event, newValue) => {
    setTabActiva(newValue);
    setMostrarForm(false); 
  }, []);

  const manejarEditar = useCallback((emp) => {
    setEmpresaAEditar(emp);
    setMostrarForm(true);
  }, []);

  const manejarGuardar = useCallback(async (datos) => {
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
      cargarDatos(); 
    } catch (error) {
      toast.error("Error en la operación.");
    }
  }, [empresaAEditar, cargarDatos]); // Dependencias necesarias

  const eliminarEmpresa = useCallback(async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta empresa?")) {
      try {
        await empresaService.eliminar(id);
        toast.success("Empresa eliminada");
        cargarDatos(); 
      } catch(e) {
        toast.error("No se pudo eliminar la empresa");
      }
    }
  }, [cargarDatos]);

  const abrirNuevoForm = useCallback(() => {
    setEmpresaAEditar(null);
    setMostrarForm(true);
  }, []);

  const cancelarForm = useCallback(() => {
    setMostrarForm(false);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Panel de Administración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión integral de activos, empresas y procesos de IA.
        </Typography>
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
                      onClick={abrirNuevoForm}
                      sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                      Nueva Empresa
                    </Button>
                  </Box>
                  
                  <EmpresaTable 
                    empresas={empresas}
                    sectores={sectores}
                    cargando={cargando}
                    esAdmin={true} 
                    onEdit={manejarEditar} // Función estable
                    onDelete={eliminarEmpresa} // Función estable
                  />
                </>
              ) : (
                <EmpresaForm 
                  empresaInicial={empresaAEditar} 
                  onSave={manejarGuardar} 
                  onCancel={cancelarForm} 
                />
              )}
            </Box>
          )}

          {tabActiva === 'ia' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">Ejecución de Modelos Predictivos</Typography>
              <Divider sx={{ mb: 4, width: '50%', mx: 'auto' }} />
              <AnalisisIAButton onComplete={cargarDatos} />
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