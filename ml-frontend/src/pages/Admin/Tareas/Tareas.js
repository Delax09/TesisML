// src/pages/Admin/Tareas/Tareas.js
import React from 'react';
import { PageHeader } from 'components';
import { useEmpresas, AdminPanelTareas, AnalisisIAButton, AnalisisPorModeloSelector, EntrenamientoSelector } from 'features';
import { Box, Typography, Paper, Divider } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';

const AdminTareas = () => {
  const { cargarDatos } = useEmpresas();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 4 }, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

        <PageHeader 
            titulo="Tareas y Mantenimiento ML"
            subtitulo="Ejecución de scripts de base de datos y operaciones de Inteligencia Artificial."
            icono={BuildIcon} 
        />

        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                Ejecutar Inteligencia Artificial Predictiva
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 4 } }}>
                {/* Botón para analizar todo con todos los modelos */}
                <AnalisisIAButton onComplete={cargarDatos} />
                
                {/* NUEVO: Selector para ejecutar un modelo específico */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <AnalisisPorModeloSelector />
                </Box>
                
                {/* Selector para entrenar modelos */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <EntrenamientoSelector />
                </Box>
            </Box>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
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