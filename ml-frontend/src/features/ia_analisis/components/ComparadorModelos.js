import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, CircularProgress } from '@mui/material';
import { iaService } from 'services';
import { usePortafolio } from 'features/portafolio/hooks/usePortafolio';
import GraficoComparativo from './GraficoComparativo';

const ComparadorModelos = ({ modelosActivos, usuarioId }) => {
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
    const [datosModelosMultiples, setDatosModelosMultiples] = useState([]);
    const [cargandoMultiples, setCargandoMultiples] = useState(false);

    // Usamos el hook de portafolio existente para llenar el dropdown
    const { misEmpresas } = usePortafolio(usuarioId);

    // Autoseleccionar la primera empresa disponible
    useEffect(() => {
        if (!empresaSeleccionada && misEmpresas?.length > 0) {
            setEmpresaSeleccionada(misEmpresas[0].IdEmpresa);
        }
    }, [misEmpresas, empresaSeleccionada]);

    useEffect(() => {
        let montado = true;
        if (empresaSeleccionada && modelosActivos.length > 0) {
            const cargarModelos = async () => {
                setCargandoMultiples(true);
                try {
                    const promesas = modelosActivos.map(async (modelo) => {
                        const res = await iaService.obtenerPrediccionesMasivas([empresaSeleccionada], modelo.IdModelo);
                        const datosIA = res[empresaSeleccionada] || { historial: [], prediccion: [] };
                        return {
                            simbolo: modelo.Nombre, // El gráfico leerá el nombre del modelo
                            historial: datosIA.historial,
                            prediccion: datosIA.prediccion
                        };
                    });
                    const resultados = await Promise.all(promesas);
                    if (montado) setDatosModelosMultiples(resultados);
                } catch (error) {
                    console.error("Error obteniendo múltiples modelos", error);
                } finally {
                    if (montado) setCargandoMultiples(false);
                }
            };
            cargarModelos();
        }
        return () => { montado = false; };
    }, [empresaSeleccionada, modelosActivos]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <FormControl sx={{ width: { xs: '100%', sm: 350 } }} size="small">
                    <InputLabel id="filtro-empresa">Seleccionar Empresa a Analizar</InputLabel>
                    <Select
                        labelId="filtro-empresa"
                        value={empresaSeleccionada}
                        label="Seleccionar Empresa a Analizar"
                        onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    >
                        {misEmpresas?.map(empresa => (
                            <MenuItem key={empresa.IdEmpresa} value={empresa.IdEmpresa}>
                                {empresa.simbolo} - {empresa.nombre}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {empresaSeleccionada && (
                <Paper sx={{ p: { xs: 2, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                        Análisis Multimodelo: {misEmpresas?.find(p => p.IdEmpresa === empresaSeleccionada)?.Simbolo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Compara el rendimiento de tus modelos habilitados (LSTM, CNN, etc.) sobre este activo.
                    </Typography>

                    {cargandoMultiples ? (
                        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 400 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                            <GraficoComparativo datos={datosModelosMultiples} compararModelos={true} />
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default ComparadorModelos;