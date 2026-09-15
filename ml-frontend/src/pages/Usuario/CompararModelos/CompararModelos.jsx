import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    CircularProgress, 
    Paper, 
    FormGroup, 
    FormControlLabel, 
    Checkbox 
} from '@mui/material'; 
import QueryStatsIcon from '@mui/icons-material/QueryStats';

import { useAuth } from 'context'; 
import { PageHeader } from 'components';
import { useModelosActivos, ComparadorModelos } from 'features';

// Funciones seguras para extraer los datos del modelo venga como venga de FastAPI
const getModeloId = (m) => m.modelo_id || m.id || m;
const getModeloNombre = (m) => m.nombre_modelo || m.nombre || m.name || `Modelo ${getModeloId(m)}`;

const VistaCompararModelos = () => {
    const { usuario } = useAuth(); 
    const { modelosActivos, cargandoModelos } = useModelosActivos(usuario?.id);

    // Estado para controlar qué modelos se dibujan en el gráfico
    const [modelosVisibles, setModelosVisibles] = useState([]);

    // Cuando cargan los modelos, los marcamos todos como visibles por defecto
    useEffect(() => {
        if (modelosActivos && modelosActivos.length > 0) {
            setModelosVisibles(modelosActivos.map(m => getModeloId(m))); 
        }
    }, [modelosActivos]);

    const handleToggleModelo = (idModelo) => {
        setModelosVisibles(prev => 
            prev.includes(idModelo)
                ? prev.filter(id => id !== idModelo) // Lo oculta de la vista
                : [...prev, idModelo] // Lo muestra
        );
    };

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
                <>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Selecciona los modelos a visualizar en el gráfico:
                        </Typography>
                        <FormGroup row>
                            {modelosActivos.map((modelo) => (
                                <FormControlLabel 
                                    key={modelo.IdModelo}
                                    control={
                                        <Checkbox 
                                            checked={modelosVisibles.includes(modelo.IdModelo)} 
                                            onChange={() => handleToggleModelo(modelo.IdModelo)}
                                            color="primary"
                                        />
                                    } 
                                    label={modelo.Nombre} // Aquí usamos modelo.Nombre con 'N' mayúscula
                                />
                            ))}
                        </FormGroup>
                    </Paper>

                    {/* IMPORTANTE: Pasamos modelosActivos INTACTO para no romper tu Service/Features */}
                    {/* Y pasamos "modelosVisibles" como una nueva prop para el gráfico */}
                    <ComparadorModelos 
                        modelosActivos={modelosActivos} 
                        modelosVisibles={modelosVisibles} 
                        usuarioId={usuario?.id} 
                    />
                </>
            )}
        </Box>
    );
};

export default VistaCompararModelos;