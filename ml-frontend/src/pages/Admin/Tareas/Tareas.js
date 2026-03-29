import React from 'react';
import AdminPanelTareas from '../../../features/admin/components/AdminPanelTareas';
import AnalisisIAButton from '../../../features/ia_analisis/components/AnalisisIAButton';
import EntrenamientoSelector from '../../../features/ia_analisis/components/EntrenamientoSelector';
import { useEmpresas } from '../../../features/empresas/hooks/useEmpresas';

import { Box, Typography, Paper, Divider } from '@mui/material';

const AdminTareas = () => {
  const { cargarDatos } = useEmpresas();

  return (
    // CAMBIO: Quitamos maxWidth y agregamos width: '100%'
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            Tareas y Mantenimiento ML
            </Typography>
            <Typography variant="body1" color="text.secondary">
            Ejecución de scripts de base de datos y operaciones de Inteligencia Artificial.
            </Typography>
        </Paper>

        {/* SECCIÓN: IA y Modelos */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, width: '100%' }}>
            
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            Ejecutar Inteligencia Artificial Predictiva
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {/* Botón para ejecutar análisis IA */}
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <AnalisisIAButton onComplete={cargarDatos} />
                <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                <EntrenamientoSelector />
                </Box>
            </Box>
        </Paper>

        {/* SECCIÓN: Web Scraping / BD */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, width: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            Extracción de Datos (Yahoo Finance)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <AdminPanelTareas />
        </Paper>

    </Box>
  );
};

export default AdminTareas;