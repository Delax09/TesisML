// src/features/mercado/components/PrecioChart.js
import React, { memo, useState, useMemo } from 'react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    ComposedChart, Area, Line, Legend, Bar, Cell
} from 'recharts';
import { 
    Box, Typography, ToggleButton, ToggleButtonGroup, 
    CircularProgress, Switch, FormControlLabel 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePrecioHistorico } from '../hooks/usePrecioHistorico';

function PrecioChart({ empresaId, nombreEmpresa }) {
    const theme = useTheme();
    const { datosFiltrados, rango, cargando, handleCambioRango } = usePrecioHistorico(empresaId);
    
    // Estado unificado para el modo de análisis técnico
    const [modoTecnico, setModoTecnico] = useState(false);

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    const { datosProcesadosVelas, minGlobal, maxGlobal, anchoCuerpo } = useMemo(() => {
        if (!datosFiltrados || datosFiltrados.length === 0) {
            return { datosProcesadosVelas: [], minGlobal: 0, maxGlobal: 100, anchoCuerpo: 10 };
        }

        let minG = Infinity;
        let maxG = -Infinity;

        const datos = datosFiltrados.map(d => {
            const open = d.PrecioApertura !== null && d.PrecioApertura !== undefined ? Number(d.PrecioApertura) : Number(d.PrecioCierre);
            const close = Number(d.PrecioCierre);
            const high = d.PrecioMaximo !== null && d.PrecioMaximo !== undefined ? Number(d.PrecioMaximo) : Math.max(open, close);
            const low = d.PrecioMinimo !== null && d.PrecioMinimo !== undefined ? Number(d.PrecioMinimo) : Math.min(open, close);
            
            if (low < minG) minG = low;
            if (high > maxG) maxG = high;

            return {
                ...d,
                open, close, high, low,
                velaCuerpo: [Math.min(open, close), Math.max(open, close)],
                velaMecha: [low, high],
                esAlcista: close >= open
            };
        });

        const margen = (maxG - minG) * 0.05;
        const cantidadPuntos = datos.length;
        let grosor = 10; 
        
        if (cantidadPuntos > 400) grosor = 1;
        else if (cantidadPuntos > 200) grosor = 3;
        else if (cantidadPuntos > 100) grosor = 5;
        else if (cantidadPuntos > 40) grosor = 8;
        else grosor = 12;

        return { 
            datosProcesadosVelas: datos,
            minGlobal: Math.max(0, minG - margen), 
            maxGlobal: maxG + margen,
            anchoCuerpo: grosor
        };
    }, [datosFiltrados]);

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
                        {/* Toggle unificado para Velas + Bollinger */}
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

            <Box sx={{ width: '100%', flexGrow: 1, minHeight: 300, position: 'relative' }}>
                {!empresaId && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography color="text.secondary">Selecciona una empresa para ver su historial</Typography>
                    </Box>
                )}
                
                {empresaId && cargando && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2">Procesando datos...</Typography>
                    </Box>
                )}
                
                {empresaId && !cargando && datosProcesadosVelas?.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={datosProcesadosVelas} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                            
                            <XAxis 
                                xAxisId={0}
                                dataKey="tiempoMs" 
                                type="number" 
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => {
                                    const date = new Date(unixTime);
                                    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                }}
                                fontSize={10} 
                                tick={{fill: theme.palette.text.secondary}} 
                                minTickGap={30}
                            />

                            <XAxis xAxisId={1} dataKey="tiempoMs" type="number" hide domain={['dataMin', 'dataMax']} />
                            
                            <YAxis 
                                domain={[minGlobal, maxGlobal]} 
                                fontSize={10} 
                                orientation="right" 
                                tick={{fill: theme.palette.text.secondary}} 
                            />
                            
                            <Tooltip 
                                labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { dateStyle: 'long' })}
                                contentStyle={{
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: theme.shadows[3],
                                    backgroundColor: theme.palette.background.paper,
                                }} 
                                // AGREGAR ESTAS DOS LÍNEAS PARA EL COLOR DEL TEXTO:
                                itemStyle={{ color: theme.palette.text.primary, fontSize: '0.875rem' }}
                                labelStyle={{ color: theme.palette.text.secondary, marginBottom: '4px', fontWeight: 'bold' }}
                                
                                formatter={(value, name, props) => {
                                    if (name === "Cuerpo de Vela") {
                                        const { open, close, high, low } = props.payload;
                                        return [
                                            `A: ${open.toFixed(2)} | C: ${close.toFixed(2)} | Max: ${high.toFixed(2)} | Min: ${low.toFixed(2)}`,
                                            "OHLC"
                                        ];
                                    }
                                    // Si es Mecha, no devolvemos nada para evitar el ":" vacío
                                    if (name === "Mecha") return null; 
                                    return [Number(value).toFixed(2), name];
                                }}
                            />
                            
                            {modoTecnico && <Legend verticalAlign="top" height={36}/>}

                            {/* Renderizado condicional unificado */}
                            {modoTecnico ? (
                                <>
                                    {/* Velas Japonesas */}
                                    <Bar xAxisId={1} dataKey="velaMecha" name="Mecha" barSize={1} isAnimationActive={false} tooltipType="none">
                                        {datosProcesadosVelas.map((entry, index) => (
                                            <Cell key={`mecha-${index}`} fill={theme.palette.mode === 'dark' ? '#99a1b3' : '#474d57'} />
                                        ))}
                                    </Bar>
                                    <Bar xAxisId={0} dataKey="velaCuerpo" name="Cuerpo de Vela" barSize={anchoCuerpo} isAnimationActive={false}>
                                        {datosProcesadosVelas.map((entry, index) => (
                                            <Cell key={`cuerpo-${index}`} fill={entry.esAlcista ? '#4caf50' : '#ef5350'} />
                                        ))}
                                    </Bar>

                                    {/* Bandas de Bollinger sobrepuestas */}
                                    <Line name="Media Móvil 20d" type="monotone" dataKey="SMA_20" stroke="#ff9800" strokeDasharray="5 5" dot={false} strokeWidth={2} connectNulls={true} />
                                    <Line name="Banda Sup" type="monotone" dataKey="Banda_Superior" stroke="#f44336" dot={false} opacity={0.8} strokeWidth={2} connectNulls={true} />
                                    <Line name="Banda Inf" type="monotone" dataKey="Banda_Inferior" stroke="#4caf50" dot={false} opacity={0.8} strokeWidth={2} connectNulls={true} />
                                </>
                            ) : (
                                /* Gráfico de Área estándar */
                                <Area 
                                    name="Precio"
                                    type="monotone" 
                                    dataKey="PrecioCierre" 
                                    stroke={theme.palette.primary.main} 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#colorPrecio)" 
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Box>
    );
} 

export default memo(PrecioChart);