// src/pages/Usuario/Mercado/Mercado.js
import React, { useState, useCallback, useTransition } from 'react';
import { Box, Typography, Paper, Grid, Alert, CircularProgress } from '@mui/material'; 
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Importaciones de features refactorizadas
import { useEmpresas } from '../../../features/empresas/hooks/useEmpresas';
import EmpresaTable from '../../../features/empresas/components/EmpresaTable';
import PrecioChart from '../../../features/mercado/components/PrecioChart';
import ResultadoPanel from '../../../features/ia_analisis/components/ResultadoPanel';

export default function Mercado() {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });
  
  // useTransition permite que la UI siga respondiendo (scroll, clics) 
  // mientras se prepara el renderizado pesado del gráfico.
  const [isPending, startTransition] = useTransition(); 
  
  const { empresas, sectores, cargando } = useEmpresas();

  const manejarSeleccion = useCallback((id, nombre) => {
      startTransition(() => {
          setEmpresaSeleccionada({ id, nombre });
      });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1600px', margin: '0 auto', pb: 4 }}>
      
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

      {!empresaSeleccionada.id && (
         <Alert severity="info" sx={{ borderRadius: 2, fontSize: '1.05rem', alignItems: 'center' }}>
           Haz clic en cualquier empresa del directorio inferior para visualizar su gráfico de precios y su análisis predictivo.
         </Alert>
      )}

        <Grid container spacing={3} alignItems="center" justifyContent="center">
            {/* Gráfico de Precios */}
            <Grid size={{ xs: 12, lg: 8 }}>
                <Paper 
                    elevation={2} 
                    sx={{ 
                        p: {xs: 1, md: 2}, 
                        borderRadius: 3, 
                        height: '100%', 
                        minHeight: empresaSeleccionada.id ? '450px' : '100px', 
                        transition: 'min-height 0.3s ease, opacity 0.2s ease',
                        opacity: isPending ? 0.7 : 1,
                        position: 'relative'
                    }}
                >
                    {/* Usamos CircularProgress aquí para dar feedback visual y eliminar el warning de ESLint */}
                    {isPending && (
                        <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                            <CircularProgress size={24} color="primary" />
                        </Box>
                    )}
                    <PrecioChart empresaId={empresaSeleccionada.id} nombreEmpresa={empresaSeleccionada.nombre} />
                </Paper>
            </Grid>
            
            {/* Panel de Resultados IA */}
            <Grid size={{ xs: 12, lg: 4, xl: 3 }}>
                <Paper 
                    elevation={2} 
                    sx={{ 
                        p: {xs: 1, md: 2}, 
                        borderRadius: 3, 
                        height: '100%', 
                        minHeight: empresaSeleccionada.id ? '320px' : '100px', 
                        transition: 'min-height 0.3s ease, opacity 0.2s ease',
                        opacity: isPending ? 0.7 : 1
                    }}
                >
                    <ResultadoPanel empresaId={empresaSeleccionada.id} />
                </Paper>
            </Grid>
        </Grid>

      {/* Directorio de Empresas */}
      <Paper elevation={2} sx={{ p: {xs: 2, md: 3}, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 3, pl: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            &nbsp;Directorio de Empresas
        </Typography>
        
        <Box sx={{ overflowX: 'auto' }}>
            <EmpresaTable 
                empresas={empresas}
                sectores={sectores}
                cargando={cargando}
                onSelect={manejarSeleccion} 
                esAdmin={false}
            />
        </Box>
      </Paper>
    </Box>
  );
}