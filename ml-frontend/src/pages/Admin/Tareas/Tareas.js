// src/pages/Admin/Tareas/Tareas.js
import React from 'react';
import AdminPanelTareas from '../../../features/admin/components/AdminPanelTareas';
import AnalisisIAButton from '../../../features/ia_analisis/components/AnalisisIAButton';
import EntrenamientoSelector from '../../../features/ia_analisis/components/EntrenamientoSelector';
import { useEmpresas } from '../../../features/empresas/hooks/useEmpresas';

import { Box, Typography, Paper, Divider } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build'; // Importamos un ícono para el Header
import PageHeader from '../../../components/PageHeader'; // Importamos tu componente Header

const AdminTareas = () => {
  const { cargarDatos } = useEmpresas();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

        {/* REEMPLAZAMOS EL PAPER GIGANTE POR EL PAGEHEADER */}
        <PageHeader 
            titulo="Tareas y Mantenimiento ML"
            subtitulo="Ejecución de scripts de base de datos y operaciones de Inteligencia Artificial."
            icono={BuildIcon} 
        />

        {/* SECCIÓN: IA y Modelos */}
        {/* LIMPIAMOS EL PAPER (sin elevation ni borderRadius manual) */}
        <Paper sx={{ p: 3, width: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                Ejecutar Inteligencia Artificial Predictiva
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <AnalisisIAButton onComplete={cargarDatos} />
                <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                    <EntrenamientoSelector />
                </Box>
            </Box>
        </Paper>

        {/* SECCIÓN: Web Scraping / BD */}
        {/* LIMPIAMOS EL PAPER */}
        <Paper sx={{ p: 3, width: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                Extracción de Datos (Yahoo Finance)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <AdminPanelTareas />
        </Paper>

    </Box>
  );
};

export default AdminTareas;