import React from 'react';
import { useEmpresas } from '../../../features/empresas/hooks/useEmpresas';
import EmpresaTable from '../../../features/empresas/components/EmpresaTable';
import { Box, Typography, Paper, Alert } from '@mui/material';

const AdminEmpresas = () => {
  // Ya no necesitamos la función de eliminar, solo traemos los datos
  const { empresas, sectores, cargando } = useEmpresas();

  return (
    // CAMBIO: Quitamos maxWidth y agregamos width: '100%'
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            Directorio de Empresas
            </Typography>
            <Typography variant="body1" color="text.secondary">
            Administración de activos cargados automáticamente desde Yahoo Finance.
            </Typography>
        </Paper>

      {empresas.length === 0 && !cargando && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No hay empresas registradas. Ejecuta el script de descarga en la vista de "Tareas ML".
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, width: '100%' }}>
        {/* CAMBIO: Pasamos esAdmin={false} y quitamos onDelete para ocultar las acciones */}
        <EmpresaTable 
          empresas={empresas}
          sectores={sectores}
          cargando={cargando}
          esAdmin={false} 
        />
      </Paper>
    </Box>
  );
};

export default AdminEmpresas;