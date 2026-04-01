// src/features/mercado/components/PrecioChart.js
import React, { memo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles'; // 1. IMPORTAMOS USETHEME
import { usePrecioHistorico } from '../hooks/usePrecioHistorico';

function PrecioChart({ empresaId, nombreEmpresa }) {
    const theme = useTheme(); // 2. INSTANCIAMOS EL TEMA
    const { datosFiltrados, rango, cargando, handleCambioRango } = usePrecioHistorico(empresaId);

    if (!empresaId) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight="80px" color="text.secondary">
                <Typography variant="body1" fontWeight="500">
                    Esperando selección de empresa...
                </Typography>
            </Box>
        );
    }

    if (cargando) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight="80px" gap={2} color="text.secondary">
                <CircularProgress size={24} />
                <Typography>Dibujando gráfica...</Typography>
            </Box>
        );
    }

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    return (
        // 3. LIMPIEZA DEL PAPER GIGANTE
        <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Typography variant="h6" component="h4" fontWeight="bold" color="text.primary">
                    Historial de Precios: {nombreEmpresa}
                </Typography>
                
                <ToggleButtonGroup value={rango} exclusive onChange={handleCambioRango} size="small" color="primary">
                    {botonesRango.map(btn => (
                        <ToggleButton key={btn.v} value={btn.v} sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: rango === btn.v ? 'bold' : 'normal', px: 2 }}>
                            {btn.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ width: '100%' }}>
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={datosFiltrados}>
                        <defs>
                            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                {/* 4. USAMOS EL COLOR PRIMARIO DEL TEMA PARA EL GRÁFICO */}
                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        {/* 5. COLORES DEL TEMA PARA LAS LÍNEAS DE LA GRILLA Y LOS TEXTOS */}
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                        <XAxis dataKey="FechaCorta" fontSize={10} tick={{fill: theme.palette.text.secondary}} minTickGap={30}/>
                        <YAxis domain={['auto', 'auto']} fontSize={10} orientation="right" tick={{fill: theme.palette.text.secondary}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="PrecioCierre" stroke={theme.palette.primary.main} strokeWidth={2} fillOpacity={1} fill="url(#colorPrecio)" />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}

export default memo(PrecioChart);