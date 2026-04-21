// src/features/mercado/components/PrecioChart.js
import React, { memo, useState, useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { 
    Box, Typography, ToggleButton, ToggleButtonGroup, 
    CircularProgress, Switch, FormControlLabel 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePrecioHistorico } from '../hooks/usePrecioHistorico';

function PrecioChart({ empresaId, nombreEmpresa }) {
    const theme = useTheme();
    const { datosFiltrados, rango, cargando, handleCambioRango } = usePrecioHistorico(empresaId);
    
    const [modoTecnico, setModoTecnico] = useState(false);
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    useEffect(() => {
        if (!chartContainerRef.current || !datosFiltrados || datosFiltrados.length === 0) return;

        // Limpiar gráfico anterior si existe
        if (chartRef.current) {
            chartRef.current.remove();
        }

        // Configuración inicial del gráfico
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: theme.palette.text.secondary,
            },
            grid: {
                vertLines: { color: theme.palette.divider, style: 1 }, // 1 = Dotted
                horzLines: { color: theme.palette.divider, style: 1 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: theme.palette.divider,
            },
            timeScale: {
                borderColor: theme.palette.divider,
                timeVisible: true,
                secondsVisible: false,
            },
            autoSize: true, // Maneja el resize automáticamente
        });
        
        chartRef.current = chart;

        // Preparar y ordenar datos. Lightweight Charts requiere timestamps en segundos (UNIX)
        const datosOrdenados = [...datosFiltrados].sort((a, b) => a.tiempoMs - b.tiempoMs);
        
        const mapTime = (d) => Math.floor(d.tiempoMs / 1000);

        if (modoTecnico) {
            // --- MODO ANÁLISIS TÉCNICO (Velas + Bollinger) ---
            const dataVelas = datosOrdenados.map(d => ({
                time: mapTime(d),
                open: Number(d.PrecioApertura || d.PrecioCierre),
                high: Number(d.PrecioMaximo || Math.max(d.PrecioApertura, d.PrecioCierre)),
                low: Number(d.PrecioMinimo || Math.min(d.PrecioApertura, d.PrecioCierre)),
                close: Number(d.PrecioCierre),
            }));

            const serieVelas = chart.addCandlestickSeries({
                upColor: '#4caf50',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#4caf50',
                wickDownColor: '#ef5350',
            });
            serieVelas.setData(dataVelas);

            // Bollinger: Media Móvil 20d
            const serieSMA = chart.addLineSeries({
                color: '#ff9800',
                lineWidth: 2,
                lineStyle: 2, // Dashed
                title: 'SMA 20',
            });
            const dataSMA = datosOrdenados
                .filter(d => d.SMA_20 !== null && d.SMA_20 !== undefined)
                .map(d => ({ time: mapTime(d), value: Number(d.SMA_20) }));
            serieSMA.setData(dataSMA);

            // Bollinger: Banda Superior
            const serieBandaSup = chart.addLineSeries({
                color: '#f44336',
                lineWidth: 1,
                opacity: 0.8,
            });
            const dataBandaSup = datosOrdenados
                .filter(d => d.Banda_Superior != null)
                .map(d => ({ time: mapTime(d), value: Number(d.Banda_Superior) }));
            serieBandaSup.setData(dataBandaSup);

            // Bollinger: Banda Inferior
            const serieBandaInf = chart.addLineSeries({
                color: '#4caf50',
                lineWidth: 1,
                opacity: 0.8,
            });
            const dataBandaInf = datosOrdenados
                .filter(d => d.Banda_Inferior != null)
                .map(d => ({ time: mapTime(d), value: Number(d.Banda_Inferior) }));
            serieBandaInf.setData(dataBandaInf);

        } else {
            // --- MODO ESTÁNDAR (Área) ---
            const dataArea = datosOrdenados.map(d => ({
                time: mapTime(d),
                value: Number(d.PrecioCierre),
            }));

            const serieArea = chart.addAreaSeries({
                lineColor: theme.palette.primary.main,
                topColor: `${theme.palette.primary.main}40`, // Añade opacidad (hex)
                bottomColor: `${theme.palette.primary.main}00`,
                lineWidth: 2,
            });
            serieArea.setData(dataArea);
        }

        chart.timeScale().fitContent();

        // Cleanup al desmontar
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [datosFiltrados, modoTecnico, theme]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: { xs: 'wrap', md: 'nowrap' }, 
                gap: 2, mb: 3 
            }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                        {nombreEmpresa || 'Cargando...'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch 
                                    size="small"
                                    checked={modoTecnico} 
                                    onChange={(e) => setModoTecnico(e.target.checked)}
                                    color="secondary"
                                />
                            }
                            label={
                                <Typography variant="caption" color="text.secondary">
                                    Análisis Técnico (Velas + Bollinger)
                                </Typography>
                            }
                        />
                    </Box>
                </Box>

                <ToggleButtonGroup
                    value={rango}
                    exclusive
                    onChange={handleCambioRango}
                    size="small"
                    color="primary"
                >
                    {botonesRango.map((b) => (
                        <ToggleButton key={b.v} value={b.v} sx={{ px: { xs: 1, sm: 2 }, fontSize: '0.75rem' }}>
                            {b.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ width: '100%', flexGrow: 1, minHeight: 400, position: 'relative' }}>
                {!empresaId && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography color="text.secondary">Selecciona una empresa para ver su historial</Typography>
                    </Box>
                )}
                
                {empresaId && cargando && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, zIndex: 10 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2">Procesando datos...</Typography>
                    </Box>
                )}
                
                {/* Contenedor del gráfico de TradingView */}
                <Box 
                    ref={chartContainerRef} 
                    sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} 
                />
            </Box>
        </Box>
    );
} 

export default memo(PrecioChart);