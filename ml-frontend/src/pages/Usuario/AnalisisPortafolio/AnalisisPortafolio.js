// src/pages/Usuario/AnalisisPortafolio/AnalisisPortafolio.js
import React from 'react';
import { Box } from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import { PageHeader } from 'components';
import { DashboardAnalitico } from 'features';


const AnalisisPortafolio = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
      <PageHeader 
        titulo="Análisis de Portafolio:"
        subtitulo="Revisa el rendimiento histórico, métricas de riesgo y la distribución sectorial de tus activos."
        icono={PieChartIcon} 
      />

      {/* Aquí renderizamos el dashboard que creamos en el paso anterior */}
      <DashboardAnalitico />

    </Box>
  );
};

export default AnalisisPortafolio;