// src/pages/Usuario/ProyeccionesIA/ProyeccionesIA.js
import React from 'react';
import { useAuth } from '../../../context/AuthContext'; 
import { useProyeccionesIA } from '../../../features/portafolio/hooks/useProyeccionesIA';
import TarjetaProyeccion from '../../../features/ia_analisis/components/TarjetaProyeccion';
import { Box, Typography, Paper } from '@mui/material'; 
import ShowChartIcon from '@mui/icons-material/ShowChart';

const VistaProyecciones = () => {
  const { usuario } = useAuth(); 

  // Buscamos el ID sin importar cómo lo llame tu backend (id, IdUsuario, ID)
  const idUsuarioFiltro = usuario?.id;

  const { proyecciones, cargando, error } = useProyeccionesIA(idUsuarioFiltro);

  if (cargando) return <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Generando proyecciones con IA...</div>;
  if (error) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>{error}</div>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ backgroundColor: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
            <ShowChartIcon fontSize="large" />
            </Box>
            <Box>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                Análisis Predictivo de tu Portafolio
                </Typography>
                <Typography variant="body1" color="text.secondary">
                Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial.
                </Typography>
            </Box>
        </Paper>

      
        {/* MENSAJE DE SEGURIDAD: Si está vacío, te lo dirá en pantalla */}
        {proyecciones.length === 0 && !cargando && (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No se encontraron empresas activas en tu portafolio.</p>
            </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px' }}>
            {proyecciones.map((empresaData, index) => (
            <TarjetaProyeccion key={index} datos={empresaData} />
            ))}
        </div>
    </Box>
  );
};

export default VistaProyecciones;