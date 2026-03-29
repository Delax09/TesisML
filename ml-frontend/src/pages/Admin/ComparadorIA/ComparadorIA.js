// ml-frontend/src/pages/Admin/ComparadorIA/ComparadorIA.js
import React from 'react';
import ComparadorIAComponent from '../../../features/ia_analisis/components/ComparadorIA';
import { Box, Typography, Paper } from '@mui/material';


const ComparadorIAPage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto' }}>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Rendimiento de Modelos IA
        </Typography>
      </Paper>

      <ComparadorIAComponent />
    </Box>
  );
};

export default ComparadorIAPage;