// src/features/ia_analisis/components/ComparadorModelos.js
import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, CircularProgress } from '@mui/material';
import { iaService } from 'services';
import GraficoComparativo from './GraficoComparativo';

// 1. Importamos el hook original (usando ruta directa respetando la Regla de Oro)
import { useProyeccionesIA } from 'features/portafolio/hooks/useProyeccionesIA'; 

const ComparadorModelos = ({ modelosActivos, usuarioId }) => {
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
    const [datosModelosMultiples, setDatosModelosMultiples] = useState([]);
    const [cargandoMultiples, setCargandoMultiples] = useState(false);

    // 2. Obtenemos las proyecciones usando el primer modelo activo como referencia
    // Esto asegura que la lista de empresas del selector provenga de datos reales de IA
    const modeloBase = modelosActivos?.length > 0 ? modelosActivos[0].IdModelo : '';
    const { proyecciones } = useProyeccionesIA(usuarioId, modeloBase);

    // 3. Autoseleccionar la primera empresa válida disponible
    useEffect(() => {
        if (!empresaSeleccionada && proyecciones?.length > 0) {
            setEmpresaSeleccionada(proyecciones[0].idEmpresa);
        }
    }, [proyecciones, empresaSeleccionada]);

    // Fetch dinámico para consultar todos los modelos sobre la empresa seleccionada
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
                            simbolo: modelo.Nombre, // Hack visual: usamos el nombre del modelo como símbolo para la leyenda del gráfico
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

    // Buscamos los datos completos de la empresa seleccionada para mostrar en el título
    const infoEmpresa = proyecciones?.find(p => p.idEmpresa === empresaSeleccionada);

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
                        {/* 4. Aplicamos las variables exactas (p.simbolo y p.empresa) de tu código original */}
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
                            <GraficoComparativo datos={datosModelosMultiples} compararModelos={true} />
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default ComparadorModelos;