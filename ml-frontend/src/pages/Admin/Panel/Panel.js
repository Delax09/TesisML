// src/pages/Admin/Panel/Panel.js
import React, { useState } from 'react';
import { 
  AdminPanel, 
  AnalisisIAButton, 
  EmpresaForm,
  EmpresaTable,
  EntrenamientoSelector
} from 'components';
import { empresaService } from 'services';

// Importaciones MUI
import { Box, Typography, Paper, Tabs, Tab, Button, Divider } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import StorageIcon from '@mui/icons-material/Storage';
import AddIcon from '@mui/icons-material/Add';
import toast from 'react-hot-toast'; // Reemplazo de alerts

export default function Panel() {
  const [tabActiva, setTabActiva] = useState('empresas');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState(null);

  const manejarCambioTab = (event, newValue) => {
    setTabActiva(newValue);
    setMostrarForm(false); // Resetea el form al cambiar de tab
  };

  const manejarGuardar = async (datos) => {
    try {
      if (empresaAEditar) {
        await empresaService.actualizar(datos.IdEmpresa, datos);
        toast.success("Empresa actualizada correctamente");
      } else {
        await empresaService.crear(datos);
        toast.success("Empresa creada exitosamente");
      }
      setMostrarForm(false);
      setEmpresaAEditar(null);
    } catch (error) {
      console.error(error);
      toast.error("Error en la operación. Intenta nuevamente.");
    }
  };

  const eliminarEmpresa = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta empresa? Esta acción es irreversible.")) {
      try {
        await empresaService.eliminar(id);
        toast.success("Empresa eliminada");
      } catch(e) {
        toast.error("No se pudo eliminar la empresa");
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ENCABEZADO */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Panel de Administración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión integral de activos, empresas y procesos de Inteligencia Artificial.
        </Typography>
      </Paper>

      {/* CONTENIDO PRINCIPAL CON PESTAÑAS */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        
        {/* BARRA DE PESTAÑAS MUI */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#fafafa' }}>
          <Tabs 
            value={tabActiva} 
            onChange={manejarCambioTab} 
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth" // Para que ocupen todo el ancho
          >
            <Tab icon={<BusinessIcon />} iconPosition="start" label="Empresas" value="empresas" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab icon={<PrecisionManufacturingIcon />} iconPosition="start" label="Modelos IA" value="ia" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab icon={<StorageIcon />} iconPosition="start" label="Datos Maestros" value="maestros" sx={{ fontWeight: 'bold', py: 2 }} />
          </Tabs>
        </Box>

        {/* CONTENEDOR DINÁMICO */}
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          
          {tabActiva === 'empresas' && (
            <Box>
              {!mostrarForm ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">
                      Listado Maestro de Empresas
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="secondary" // Usa el verde que definimos en theme.js
                      startIcon={<AddIcon />}
                      onClick={() => { setEmpresaAEditar(null); setMostrarForm(true); }}
                      sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                      Nueva Empresa
                    </Button>
                  </Box>
                  
                  {/* Aquí va tu tabla temporalmente (pronto la migraremos) */}
                  <EmpresaTable 
                    esAdmin={true} 
                    onEdit={(emp) => { setEmpresaAEditar(emp); setMostrarForm(true); }} 
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
            </Box>
          )}

          {tabActiva === 'ia' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">
                Ejecución de Modelos Predictivos
              </Typography>
              <Divider sx={{ mb: 4, width: '50%', mx: 'auto' }} />
              
              <AnalisisIAButton onComplete={() => toast.success("Análisis Masivo Completado")} />
              
              <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                <EntrenamientoSelector />
              </Box>
            </Box>
          )}

          {tabActiva === 'maestros' && (
             <Box>
               <AdminPanel />
             </Box>
          )}
          
        </Box>
      </Paper>
    </Box>
  );
}