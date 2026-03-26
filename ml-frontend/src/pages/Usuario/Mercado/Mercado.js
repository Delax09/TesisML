// src/pages/Usuario/Mercado/Mercado.js
import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Alert } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import { EmpresaTable, PrecioChart, ResultadoPanel } from 'components';

export default function Mercado() {
  // Estado para controlar a qué empresa se le hizo clic en la tabla
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });

  const manejarSeleccionEmpresa = (id, nombre) => {
    setEmpresaSeleccionada({ id, nombre });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1600px', margin: '0 auto', pb: 4 }}>
      
      {/* HEADER: Título de la sección */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ backgroundColor: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
           <ShowChartIcon fontSize="large" />
        </Box>
        <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Laboratorio de Mercado
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial.
            </Typography>
        </Box>
      </Paper>

      {/* AVISO DE UX: Instrucción inicial */}
      {!empresaSeleccionada.id && (
         <Alert severity="info" sx={{ borderRadius: 2, fontSize: '1.05rem', alignItems: 'center' }}>
           Haz clic en cualquier empresa del directorio inferior para visualizar su gráfico de precios y su análisis predictivo.
         </Alert>
      )}

        {/* SECCIÓN 1: Gráficos de Análisis y Resultados IA */}
        <Grid container spacing={3} alignItems="center"  justify="center">
            
            {/* Gráfico de Precios */}
            <Grid item xs={12} lg={8} xl={9}>
                <Paper elevation={2} sx={{ 
                    p: {xs: 1, md: 2}, 
                    borderRadius: 3, 
                    height: '100%', 
                    // AQUÍ ESTÁ LA MAGIA: Si hay id, mide 450px, si no, mide 100px
                    minHeight: empresaSeleccionada.id ? '450px' : '100px', 
                    transition: 'min-height 0.3s ease' // Agrega una animación suave
                    }}>
                    <PrecioChart 
                    empresaId={empresaSeleccionada.id} 
                    nombreEmpresa={empresaSeleccionada.nombre} 
                    />
                </Paper>
            </Grid>
            
            {/* Panel de Resultados IA */}
            <Grid item xs={12} lg={4} xl={3}>
            <Paper elevation={2} sx={{ 
                p: {xs: 1, md: 2}, 
                borderRadius: 3, 
                height: '100%', 
                // Lo mismo aquí para el panel de IA
                minHeight: empresaSeleccionada.id ? '320px' : '100px',
                transition: 'min-height 0.3s ease'
                }}>
                <ResultadoPanel 
                empresaId={empresaSeleccionada.id} 
                />
            </Paper>
            </Grid>

        </Grid>

      {/* SECCIÓN 2: Tabla de Datos (Directorio) */}
      <Paper elevation={2} sx={{ p: {xs: 2, md: 3}, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 3, pl: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            &nbsp;Directorio de Empresas
        </Typography>
        
        <Box sx={{ overflowX: 'auto' }}>
            <EmpresaTable 
                onSelect={manejarSeleccionEmpresa} 
                esAdmin={false} // Por seguridad, nos aseguramos que el usuario no vea botones de edición
            />
        </Box>
      </Paper>

    </Box>
  );
}