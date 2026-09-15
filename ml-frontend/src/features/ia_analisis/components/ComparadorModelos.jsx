// src/features/ia_analisis/components/ComparadorModelos.js
import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, CircularProgress } from '@mui/material';
import { iaService } from 'services';
import GraficoComparativo from './GraficoComparativo';

import { useProyeccionesIA } from 'features/portafolio/hooks/useProyeccionesIA'; 

const ComparadorModelos = ({ modelosActivos, modelosVisibles, usuarioId }) => {
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
    const [datosModelosMultiples, setDatosModelosMultiples] = useState([]);
    const [cargandoMultiples, setCargandoMultiples] = useState(false);

    const modeloBase = modelosActivos?.length > 0 ? modelosActivos[0].IdModelo : '';
    const { proyecciones } = useProyeccionesIA(usuarioId, modeloBase);

    useEffect(() => {
        if (!empresaSeleccionada && proyecciones?.length > 0) {
            setEmpresaSeleccionada(proyecciones[0].idEmpresa);
        }
    }, [proyecciones, empresaSeleccionada]);

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
                            idModelo: modelo.IdModelo, // Identificador clave para el filtro visual
                            simbolo: modelo.Nombre, 
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
    }, [empresaSeleccionada, modelosActivos]); // Modelos activos ya no muta, no hay peticiones extra

    const infoEmpresa = proyecciones?.find(p => p.idEmpresa === empresaSeleccionada);

    // Filtramos la data en memoria RAM para no activar el useEffect
    const datosParaGrafico = datosModelosMultiples.filter(dato => 
        !modelosVisibles || modelosVisibles.includes(dato.idModelo)
    );

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
                        {proyecciones?.map(p => (
                            <MenuItem key={p.idEmpresa} value={p.idEmpresa}>
                                {p.simbolo} - {p.empresa}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {empresaSeleccionada && infoEmpresa && (
                <Paper sx={{ p: { xs: 2, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                        Análisis Multimodelo: {infoEmpresa.simbolo}
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
                            {/* Pasamos los datos ya filtrados al gráfico */}
                            <GraficoComparativo datos={datosParaGrafico} compararModelos={true} />
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default ComparadorModelos;