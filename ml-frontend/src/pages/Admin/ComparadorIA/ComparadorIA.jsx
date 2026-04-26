// src/pages/Admin/ComparadorIA/ComparadorIA.js
import React from 'react';
import {ComparadorIAComponent} from 'features';
import { Box } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics'; // Ícono para el Header
import {PageHeader} from 'components'; // Importamos tu componente

const ComparadorIAPage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
      {/* HEADER ESTANDARIZADO */}
      <PageHeader 
        titulo="Rendimiento de Modelos IA"
        subtitulo="Compara la precisión y el margen de error de las distintas arquitecturas de redes neuronales."
        icono={AnalyticsIcon} 
      />

      {/* COMPONENTE PRINCIPAL */}
      <ComparadorIAComponent />
      
    </Box>
  );
};

export default ComparadorIAPage;