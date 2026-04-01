// src/components/PageHeader.js
import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

export default function PageHeader({ titulo, subtitulo, icono: Icono }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
      <Box sx={{ backgroundColor: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
        {Icono && <Icono fontSize="large" />}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {titulo}
        </Typography>
        {subtitulo && (
          <Typography variant="body1" color="text.secondary">
            {subtitulo}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}