// src/pages/Usuario/Mercado/Mercado.js
import React, { useState, useCallback, useTransition } from 'react';
import { Box, Typography, Paper, Grid, Alert, CircularProgress, Collapse } from '@mui/material'; // <-- Agregamos Collapse
import AnalyticsIcon from '@mui/icons-material/Analytics';

import { ErrorBoundary, PageHeader } from 'components'; 
import { 
    useEmpresas,
    EmpresaTable,
    PrecioChart,
    ResultadoPanel
} from 'features'; 

export default function Mercado() {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });
  const [isPending, startTransition] = useTransition(); 
  
  const { empresas, sectores, cargando } = useEmpresas();

  const manejarSeleccion = useCallback((id, nombre) => {
      startTransition(() => {
          setEmpresaSeleccionada({ id, nombre });
      });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

        <PageHeader 
            titulo="Laboratorio de Mercado"
            subtitulo="Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial."
            icono={AnalyticsIcon} 
        />

      {/* 1. ANIMACIÓN DE LA ALERTA: Desaparece suavemente hacia arriba */}
      <Collapse in={!empresaSeleccionada.id} unmountOnExit>
         <Alert severity="info" sx={{ borderRadius: 2, fontSize: '1.05rem', alignItems: 'center' }}>
           Haz clic en cualquier empresa del directorio inferior para visualizar su gráfico de precios y su análisis predictivo.
         </Alert>
      </Collapse>

      {/* 2. ANIMACIÓN DEL CONTENEDOR: Se despliega suavemente hacia abajo */}
      <Collapse in={!!empresaSeleccionada.id} unmountOnExit>
          <Grid container spacing={3} alignItems="stretch" justifyContent="center">
              {/* Gráfico de Precios */}
              <Grid size={{ xs: 12, lg: 8 }}>
                  <Paper 
                      sx={{ 
                          p: {xs: 1, md: 2}, 
                          height: '100%', 
                          minHeight: '450px', // Altura estática para evitar saltos internos
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Transición curva súper fluida
                          opacity: isPending ? 0.5 : 1,
                          transform: isPending ? 'scale(0.98)' : 'scale(1)', // Efecto de zoom out al cambiar de empresa
                          position: 'relative'
                      }}
                  >
                      {/* Spinner centrado correctamente */}
                      {isPending && (
                          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                              <CircularProgress size={40} color="primary" />
                          </Box>
                      )}
                      
                      <ErrorBoundary mensajeFallo="Error al renderizar el gráfico histórico.">
                          {empresaSeleccionada.id && (
                              <PrecioChart empresaId={empresaSeleccionada.id} nombreEmpresa={empresaSeleccionada.nombre} />
                          )}
                      </ErrorBoundary>                
                  </Paper>
              </Grid>
              
              {/* Panel de Resultados IA */}
              <Grid size={{ xs: 12, lg: 4, xl: 3 }}>
                  <Paper 
                      sx={{ 
                          p: {xs: 1, md: 2}, 
                          height: '100%', 
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          opacity: isPending ? 0.5 : 1,
                          transform: isPending ? 'scale(0.98)' : 'scale(1)',
                          position: 'relative'
                      }}
                  >
                      <ErrorBoundary mensajeFallo="Error al evaluar la predicción de IA.">
                          {empresaSeleccionada.id && (
                              <ResultadoPanel empresaId={empresaSeleccionada.id} />
                          )}
                      </ErrorBoundary>                
                  </Paper>
              </Grid>
          </Grid>
      </Collapse>

      {/* Directorio de Empresas */}
      <Paper sx={{ p: {xs: 2, md: 3}}}>
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
