import React from 'react';
import { Paper, Box, Typography, CircularProgress, Grid } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ModeloCard from './ModeloCard';

const ModelosPanel = ({ usuarioSeleccionado, modelosDisponibles, modelosUsuario, alternarAcceso, loading }) => {
  const tieneModelo = (idModelo) => {
    return modelosUsuario.some((modelo) => modelo.IdModelo === idModelo);
  };

  if (!usuarioSeleccionado) {
    return (
      <Paper
        sx={{
          p: 3,
          minHeight: '400px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6
        }}
      >
        <SecurityIcon sx={{ fontSize: 64, mb: 2, color: 'primary.main' }} />
        <Typography variant="h6" align="center" color="text.secondary">
          Selecciona un usuario para gestionar sus accesos a los modelos de IA.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, minHeight: '400px', height: '100%' }}>
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Accesos de:{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {usuarioSeleccionado.Nombre} {usuarioSeleccionado.Apellido}
          </Box>
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {modelosDisponibles.map((modelo) => (
            <Grid size={{ xs: 12, sm: 6 }} key={modelo.IdModelo}>
              <ModeloCard
                modelo={modelo}
                activo={tieneModelo(modelo.IdModelo)}
                alternarAcceso={alternarAcceso}
                loading={loading}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default ModelosPanel;