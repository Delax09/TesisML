// src/pages/Admin/Empresas/Empresas.js
import React from 'react';
import { Box, Paper, Alert } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business'; // Ícono para el Header
import { PageHeader } from 'components'; // Importamos tu componente
import { useEmpresas, EmpresaTable } from 'features';

const AdminEmpresas = () => {
  const { empresas, sectores, cargando } = useEmpresas();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

      {/* HEADER ESTANDARIZADO */}
      <PageHeader 
        titulo="Directorio de Empresas"
        subtitulo="Administración de activos cargados automáticamente desde Yahoo Finance."
        icono={BusinessIcon} 
      />

      {empresas.length === 0 && !cargando && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No hay empresas registradas. Ejecuta el script de descarga en la vista de "Tareas ML".
        </Alert>
      )}

      {/* PAPER LIMPIO SIN ELEVATION NI BORDERRADIUS QUEMADO */}
      <Paper sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
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