// src/pages/Usuario/AnalisisPortafolio/AnalisisPortafolio.js
import React from 'react';
import { Box } from '@mui/material';
import DashboardAnalitico from '../../../features/portafolio/components/DashboardAnalitico'; // Ajusta la ruta si es necesario
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PageHeader from '../../../components/PageHeader';

const AnalisisPortafolio = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
      <PageHeader 
        titulo="Análisis de Portafolio:"
        subtitulo="Revisa el rendimiento histórico, métricas de riesgo y la distribución sectorial de tus activos."
        icono={ShowChartIcon} 
      />

      {/* Aquí renderizamos el dashboard que creamos en el paso anterior */}
      <DashboardAnalitico />

    </Box>
  );
};

export default AnalisisPortafolio;