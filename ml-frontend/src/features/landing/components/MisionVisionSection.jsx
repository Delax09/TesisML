import React from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';

export default function MisionVisionSection() {
  return (
    <Box id="nosotros" sx={{ width: '100%', maxWidth: '1200px' }}>
      <Grid container spacing={4}>
        {/* Sección Misión */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              height: '100%', 
              borderRadius: 4, 
              backgroundColor: 'background.paper', 
              border: '1px solid', 
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', // Centra el contenido horizontalmente
              textAlign: 'center'    // Centra el texto
            }}
          >
            <Typography variant="h4" component="h3" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                Misión
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: '800px' }}>
              Proveer herramientas de inteligencia artificial accesibles y precisas que empoderen a analistas y entusiastas del mercado para tomar decisiones financieras basadas en datos, reduciendo la incertidumbre y maximizando el valor de cada estrategia.
            </Typography>
          </Paper>
        </Grid>

        {/* Sección Visión */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              height: '100%', 
              borderRadius: 4, 
              backgroundColor: 'background.paper', 
              border: '1px solid', 
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', // Centra el contenido horizontalmente
              textAlign: 'center'    // Centra el texto
            }}
          >
            <Typography variant="h4" component="h3" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                Visión
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: '800px' }}>
              Convertirnos en el estándar de la industria en análisis predictivo, democratizando el uso del machine learning y la analítica avanzada para la gestión y optimización de portafolios a nivel global.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}