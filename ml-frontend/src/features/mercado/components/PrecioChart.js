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
        { label: '1D', v: '1D' }, { label: '5D', v: '5D' },
        { label: '1M', v: '1M' }, { label: '6M', v: '6M' },
        { label: '1Y', v: '1Y' }, { label: '6Y', v: 'TODO' }
    ];

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
            },
            autoSize: true, // Esto es vital para que responda al contenedor flexible
        });
        
        chartRef.current = chart;

        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            seriesRefs.current = {}; 
        };
    }, [theme.palette.text.secondary, theme.palette.divider]);

    useEffect(() => {
        if (!chartRef.current || !datosFiltrados || datosFiltrados.length === 0) return;

        const chart = chartRef.current;
        const mapTime = (d) => Math.floor(d.tiempoMs / 1000);

        Object.values(seriesRefs.current).forEach(serie => {
            if (serie) { try { chart.removeSeries(serie); } catch (e) {} }
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
            
            // Medias y Bandas
            const addLine = (key, color, dataKey, style = 1) => {
                const s = chart.addSeries(LineSeries, { color, lineWidth: style === 2 ? 2 : 1, lineStyle: style });
                s.setData(datosFiltrados.filter(d => d[dataKey] != null).map(d => ({ time: mapTime(d), value: Number(d[dataKey]) })));
                seriesRefs.current[key] = s;
            };
            addLine('sma', '#ff9800', 'SMA_20', 2);
            addLine('bandaSup', '#f44336', 'Banda_Superior');
            addLine('bandaInf', '#4caf50', 'Banda_Inferior');
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

    const aplicarZoomNativo = (nuevoRango, dataArray) => {
        if (!chartRef.current || !dataArray || dataArray.length === 0) return;
        const timeScale = chartRef.current.timeScale();
        const primerDato = dataArray[0];
        const ultimoDato = dataArray[dataArray.length - 1];
        const fromTimeMin = Math.floor(primerDato.tiempoMs / 1000);
        const toTimeMax = Math.floor(ultimoDato.tiempoMs / 1000);
        const diasSegundos = 24 * 60 * 60;

        if (nuevoRango === 'TODO') {
            timeScale.setVisibleRange({ from: fromTimeMin, to: toTimeMax + diasSegundos });
            return;
        }

        let fromTime = toTimeMax;
        switch(nuevoRango) {
            case '1D': fromTime -= 1 * diasSegundos; break;
            case '5D': fromTime -= 5 * diasSegundos; break;
            case '1M': fromTime -= 30 * diasSegundos; break;
            case '6M': fromTime -= 180 * diasSegundos; break;
            case '1Y': fromTime -= 365 * diasSegundos; break;
            default: fromTime -= 180 * diasSegundos;
        }
        timeScale.setVisibleRange({ from: Math.max(fromTime, fromTimeMin), to: toTimeMax + diasSegundos });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Header: Tamaño fijo basado en contenido */}
            <Box sx={{ 
                flex: '0 0 auto',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                gap: 1, mb: 1.5 
            }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" noWrap>
                        {nombreEmpresa || 'Cargando...'}
                    </Typography>
                    <FormControlLabel
                        sx={{ ml: 0 }}
                        control={<Switch size="small" checked={modoTecnico} onChange={(e) => setModoTecnico(e.target.checked)} color="secondary" />}
                        label={<Typography variant="caption" color="text.secondary">Análisis Técnico</Typography>}
                    />
                </Box>

                <ToggleButtonGroup value={rango} exclusive onChange={handleCambioRango} size="small" color="primary">
                    {botonesRango.map((b) => (
                        <ToggleButton key={b.v} value={b.v} sx={{ px: 1, py: 0.5, fontSize: '0.65rem' }}>
                            {b.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {/* Contenedor del Gráfico: Ocupa el 100% del resto del Paper sin desbordar */}
            <Box sx={{ 
                flex: '1 1 auto', 
                width: '100%', 
                position: 'relative',
                minHeight: 0 // CRÍTICO: Permite que el contenedor se encoja dentro del modal
            }}>
                {empresaId && cargando && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                
                {/* El Canvas se monta aquí y llena exactamente el área sobrante */}
                <Box ref={chartContainerRef} sx={{ position: 'absolute', inset: 0 }} />
            </Box>
        </Box>
    );
} 

export default memo(PrecioChart);