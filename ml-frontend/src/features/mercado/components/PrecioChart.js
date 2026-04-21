// src/features/mercado/components/PrecioChart.js
import React, { memo, useState, useEffect, useRef } from 'react';
import { createChart, CrosshairMode, AreaSeries, CandlestickSeries, LineSeries } from 'lightweight-charts';
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
    const seriesRefs = useRef({});

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    // INICIALIZACIÓN DEL GRÁFICO (Solo 1 vez por ciclo de vida)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: theme.palette.text.secondary,
            },
            grid: {
                vertLines: { color: theme.palette.divider, style: 1 },
                horzLines: { color: theme.palette.divider, style: 1 },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: { borderColor: theme.palette.divider },
            timeScale: {
                borderColor: theme.palette.divider,
                timeVisible: true,     
                secondsVisible: false,
                shiftVisibleRangeOnNewBar: true, 
            },
            autoSize: true,
        });
        
        chartRef.current = chart;

        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            // CRÍTICO: Limpiar las referencias de las series si el gráfico muere
            seriesRefs.current = {}; 
        };
    // CRÍTICO: Dependemos de los colores específicos (strings), NO del objeto 'theme' completo
    }, [theme.palette.text.secondary, theme.palette.divider]);

    // INYECCIÓN DE DATOS Y RENDERIZADO
    useEffect(() => {
        if (!chartRef.current || !datosFiltrados || datosFiltrados.length === 0) return;

        const chart = chartRef.current;
        const mapTime = (d) => Math.floor(d.tiempoMs / 1000);

        // Limpieza ultra-segura de series anteriores
        Object.values(seriesRefs.current).forEach(serie => {
            if (serie) {
                try {
                    // Try-catch previene colapsos si la serie ya no existe en el DOM
                    chart.removeSeries(serie);
                } catch (error) {
                    console.warn("Serie fantasma ignorada al renderizar.");
                }
            }
        });
        seriesRefs.current = {}; 

        if (modoTecnico) {
            const serieVelas = chart.addSeries(CandlestickSeries, {
                upColor: '#4caf50', downColor: '#ef5350', borderVisible: false,
                wickUpColor: '#4caf50', wickDownColor: '#ef5350',
            });
            serieVelas.setData(datosFiltrados.map(d => ({
                time: mapTime(d),
                open: Number(d.PrecioApertura || d.PrecioCierre),
                high: Number(d.PrecioMaximo || Math.max(d.PrecioApertura, d.PrecioCierre)),
                low: Number(d.PrecioMinimo || Math.min(d.PrecioApertura, d.PrecioCierre)),
                close: Number(d.PrecioCierre),
            })));
            seriesRefs.current.principal = serieVelas;

            const serieSMA = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 2, lineStyle: 2 });
            serieSMA.setData(datosFiltrados.filter(d => d.SMA_20 != null).map(d => ({ time: mapTime(d), value: Number(d.SMA_20) })));
            seriesRefs.current.sma = serieSMA;

            const serieBandaSup = chart.addSeries(LineSeries, { color: '#f44336', lineWidth: 1, opacity: 0.8 });
            serieBandaSup.setData(datosFiltrados.filter(d => d.Banda_Superior != null).map(d => ({ time: mapTime(d), value: Number(d.Banda_Superior) })));
            seriesRefs.current.bandaSup = serieBandaSup;

            const serieBandaInf = chart.addSeries(LineSeries, { color: '#4caf50', lineWidth: 1, opacity: 0.8 });
            serieBandaInf.setData(datosFiltrados.filter(d => d.Banda_Inferior != null).map(d => ({ time: mapTime(d), value: Number(d.Banda_Inferior) })));
            seriesRefs.current.bandaInf = serieBandaInf;
        } else {
            const serieArea = chart.addSeries(AreaSeries, {
                lineColor: theme.palette.primary.main,
                topColor: `${theme.palette.primary.main}40`,
                bottomColor: `${theme.palette.primary.main}00`,
                lineWidth: 2,
            });
            serieArea.setData(datosFiltrados.map(d => ({ time: mapTime(d), value: Number(d.PrecioCierre) })));
            seriesRefs.current.principal = serieArea;
        }

        aplicarZoomNativo(rango, datosFiltrados);

    }, [datosFiltrados, modoTecnico, rango, theme.palette.primary.main]); 

    // LÓGICA DEL ZOOM NATIVO
    const aplicarZoomNativo = (nuevoRango, dataArray) => {
        if (!chartRef.current || !dataArray || dataArray.length === 0) return;
        const timeScale = chartRef.current.timeScale();

        const primerDato = dataArray[0];
        const ultimoDato = dataArray[dataArray.length - 1];
        
        const fromTimeMin = Math.floor(primerDato.tiempoMs / 1000);
        const toTimeMax = Math.floor(ultimoDato.tiempoMs / 1000);
        const diasSegundos = 24 * 60 * 60;

        if (nuevoRango === 'TODO') {
            timeScale.setVisibleRange({ 
                from: fromTimeMin, 
                to: toTimeMax + diasSegundos 
            });
            return;
        }

        let fromTime = toTimeMax;
        
        switch(nuevoRango) {
            case '1D': fromTime -= 1 * diasSegundos; break;
            case '5D': fromTime -= 5 * diasSegundos; break;
            case '1M': fromTime -= 30 * diasSegundos; break;
            case '6M': fromTime -= 180 * diasSegundos; break;
            case '1Y': fromTime -= 365 * diasSegundos; break;
            case '5Y': fromTime -= 1825 * diasSegundos; break;
            default: break;
        }

        const startRango = fromTime < fromTimeMin ? fromTimeMin : fromTime;
        timeScale.setVisibleRange({ from: startRango, to: toTimeMax + diasSegundos });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <Box sx={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2, mb: 3 
            }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                        {nombreEmpresa || 'Cargando...'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch size="small" checked={modoTecnico} onChange={(e) => setModoTecnico(e.target.checked)} color="secondary" />
                            }
                            label={<Typography variant="caption" color="text.secondary">Análisis Técnico (Velas + Bollinger)</Typography>}
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
                
                <Box ref={chartContainerRef} sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
            </Box>
        </Box>
    );
} 

export default memo(PrecioChart);