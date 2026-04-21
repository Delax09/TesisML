// src/pages/Usuario/ProyeccionesIA/ProyeccionesIA.js
import React, { useState } from 'react';
import { Box, Typography, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material'; 
import AreaChartIcon from '@mui/icons-material/AreaChart';

import { useAuth } from 'context'; 
import { PageHeader } from 'components';
import { 
    useModelosActivos, 
    ComparadorEmpresas, 
    ComparadorModelos 
} from 'features';

const VistaProyecciones = () => {
    const { usuario } = useAuth(); 
    const [modoComparacion, setModoComparacion] = useState('empresas');

    // 1. Obtenemos datos globales necesarios para ambas vistas
    const { modelosActivos, cargandoModelos } = useModelosActivos(usuario?.id);

    if (cargandoModelos) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={6} gap={2} sx={{ width: '100%', minHeight: '60vh' }}>
                <CircularProgress size={40} color="primary" />
                <Typography color="text.secondary" fontWeight="500">
                    Sincronizando modelos de Inteligencia Artificial...
                </Typography>
            </Box>
        );
    } 

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                titulo="Análisis Predictivo de tu Portafolio"
                subtitulo="Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial."
                icono={AreaChartIcon} 
            />

            {!cargandoModelos && modelosActivos.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2, border: '1px solid #ef4444' }}>
                    <Typography color="error" fontWeight="bold">
                        Actualmente no tienes modelos de IA habilitados en tu cuenta.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                        Contacta a un administrador para solicitar acceso a las proyecciones.
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* TABS PARA CAMBIAR EL MODO */}
                    {modelosActivos.length > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <ToggleButtonGroup
                                value={modoComparacion}
                                exclusive
                                onChange={(e, newMode) => newMode && setModoComparacion(newMode)}
                                color="primary"
                                size="small"
                                sx={{ bgcolor: 'background.paper' }}
                            >
                                <ToggleButton value="empresas" sx={{ px: 3, fontWeight: 'bold' }}>Comparar Empresas</ToggleButton>
                                <ToggleButton value="modelos" sx={{ px: 3, fontWeight: 'bold' }}>Comparar Modelos IA</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    )}

                    {/* ORQUESTACIÓN DE VISTAS */}
                    {modoComparacion === 'empresas' ? (
                        <ComparadorEmpresas modelosActivos={modelosActivos} usuarioId={usuario?.id} />
                    ) : (
                        <ComparadorModelos modelosActivos={modelosActivos} usuarioId={usuario?.id} />
                    )}
                </>
            )}
        </Box>
    );
};

export default VistaProyecciones;