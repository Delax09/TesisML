// src/features/mercado/components/PrecioChart.js
import React, { memo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Box, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePrecioHistorico } from '../hooks/usePrecioHistorico';

function PrecioChart({ empresaId, nombreEmpresa }) {
    const theme = useTheme();
    const { datosFiltrados, rango, cargando, handleCambioRango } = usePrecioHistorico(empresaId);

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            
            {/* CABECERA */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2, mb: 2 }}>
                <Typography variant="h6" component="h4" fontWeight="bold" color="text.primary">
                    Historial de Precios{nombreEmpresa ? `: ${nombreEmpresa}` : ''}
                </Typography>
                
                {empresaId && !cargando && (
                    <Box sx={{ width: { xs: '100%', md: 'auto' }, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                        <ToggleButtonGroup 
                            value={rango} 
                            exclusive 
                            onChange={handleCambioRango} 
                            size="small" 
                            color="primary"
                            sx={{ display: 'flex', width: 'max-content' }} 
                        >
                            {botonesRango.map(btn => (
                                <ToggleButton 
                                    key={btn.v} 
                                    value={btn.v} 
                                    sx={{ 
                                        textTransform: 'none', 
                                        fontSize: '0.75rem', 
                                        fontWeight: rango === btn.v ? 'bold' : 'normal', 
                                        px: 2,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {btn.label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                )}
            </Box>

            {/* CONTENEDOR DEL GRÁFICO: relative y flexGrow garantizan que ocupa el 100% de lo que sobra */}
            <Box sx={{ width: '100%', flexGrow: 1, minHeight: 250, position: 'relative' }}>
                
                {!empresaId ? (
                    /* Centrado absoluto para que no rompa el flexbox del padre */
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight="500" color="text.secondary">
                            Esperando selección de empresa...
                        </Typography>
                    </Box>
                
                ) : cargando ? (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
                        <CircularProgress size={24} />
                        <Typography>Dibujando gráfica...</Typography>
                    </Box>
                
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {/* Se añadió un margin interno para alinear mejor las etiquetas y aprovechar el espacio */}
                        <AreaChart data={datosFiltrados} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                            <XAxis dataKey="FechaCorta" fontSize={10} tick={{fill: theme.palette.text.secondary}} minTickGap={30}/>
                            <YAxis domain={['auto', 'auto']} fontSize={10} orientation="right" tick={{fill: theme.palette.text.secondary}} />
                            <Tooltip 
                                labelFormatter={(label, payload) => {
                                    if (payload && payload.length > 0) {
                                        return payload[0].payload.FechaLarga;
                                    }
                                    return label;
                                }}
                                contentStyle={{
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    backgroundColor: theme.palette.background.paper, 
                                    color: theme.palette.text.primary,
                                    textTransform: 'capitalize'
                                }} 
                            />
                            <Area type="monotone" dataKey="PrecioCierre" stroke={theme.palette.primary.main} strokeWidth={2} fillOpacity={1} fill="url(#colorPrecio)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Box>
    );
} 

export default memo(PrecioChart);