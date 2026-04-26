import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material'; 
import QueryStatsIcon from '@mui/icons-material/QueryStats';

import { useAuth } from 'context'; 
import { PageHeader } from 'components';
import { useModelosActivos, ComparadorModelos } from 'features';

const VistaCompararModelos = () => {
    const { usuario } = useAuth(); 
    const { modelosActivos, cargandoModelos } = useModelosActivos(usuario?.id);

    if (cargandoModelos) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={6} gap={2} sx={{ width: '100%', minHeight: '60vh' }}>
                <CircularProgress size={40} color="primary" />
                <Typography color="text.secondary" fontWeight="500">
                    Cargando entorno de comparación multimodelo...
                </Typography>
            </Box>
        );
    } 

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                titulo="Comparativa Multimodelo IA"
                subtitulo="Evalúa y compara el rendimiento de diferentes arquitecturas de redes neuronales (LSTM, CNN) sobre una misma empresa."
                icono={QueryStatsIcon} 
            />

            {!cargandoModelos && modelosActivos.length < 2 ? (
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 2, border: '1px solid #f59e0b' }}>
                    <Typography color="warning.main" fontWeight="bold">
                        Necesitas al menos 2 modelos de IA habilitados para realizar comparaciones.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                        Actualmente tienes {modelosActivos.length} modelo(s) activo(s).
                    </Typography>
                </Box>
            ) : (
                <ComparadorModelos modelosActivos={modelosActivos} usuarioId={usuario?.id} />
            )}
        </Box>
    );
};

export default VistaCompararModelos;