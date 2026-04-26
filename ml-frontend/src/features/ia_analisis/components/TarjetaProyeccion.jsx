// src/features/ia_analisis/components/TarjetaProyeccion.js
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpTwoToneIcon from '@mui/icons-material/TrendingUpTwoTone';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';
import TrendingFlatTwoToneIcon from '@mui/icons-material/TrendingFlatTwoTone';
import { Box, Card, Typography, Checkbox, alpha, useTheme } from '@mui/material';

const TarjetaProyeccion = ({ datos, seleccionado, onToggle }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    // NUEVA LÓGICA: Unificar historial y predicción por fecha
    const chartData = useMemo(() => {
    if (!datos || (!datos.historial && !datos.prediccion)) return [];
    
    const map = {};

    // 1. Procesar historial
    (datos.historial || []).forEach(p => {
        const fecha = p.fecha || p.date;
        map[fecha] = { fecha, precio: p.precio };
    });

    // 2. Procesar predicciones (IA)
    (datos.prediccion || []).forEach(p => {
        const fecha = p.fecha || p.date;
        if (!map[fecha]) map[fecha] = { fecha };
        map[fecha].precioEsperado = p.precioEsperado;
    });

    return Object.values(map).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

}, [datos]);

    if (!datos || !datos.historial || !datos.prediccion) {
        return <Box sx={{ p: 3, textAlign: 'center' }}>Cargando datos del gráfico...</Box>;
    }

    const recomendacionTexto = String(datos.recomendacion || datos.tendencia || '').toUpperCase();
    
    // Determinación del estado
    let estado = 'neutral';
    if (recomendacionTexto.includes('ALCISTA') || recomendacionTexto.includes('ALZA') || recomendacionTexto.includes('COMPRA')) {
        estado = 'positivo';
    } else if (recomendacionTexto.includes('BAJISTA') || recomendacionTexto.includes('BAJA') || recomendacionTexto.includes('VEN')) {
        estado = 'negativo';
    }

    // Mapeo de colores basado en el estado
    const colorKey = estado === 'positivo' ? 'success' : estado === 'negativo' ? 'error' : 'warning';
    const colorBase = theme.palette[colorKey].main;
    
    const IconoTendencia = estado === 'positivo' ? TrendingUpTwoToneIcon : estado === 'negativo' ? TrendingDownTwoToneIcon : TrendingFlatTwoToneIcon;

    let mensajeRecomendacion = 'Se proyecta estabilidad. Sugerencia de mantener posición y observar.';
    if (estado === 'positivo') mensajeRecomendacion = 'Se proyecta tendencia al alza. Considerar acumular.';
    if (estado === 'negativo') mensajeRecomendacion = 'Riesgo de caída detectado. Sugerencia de monitoreo estricto.';

    return (
        <Card 
            elevation={seleccionado ? 4 : 0}
            onClick={onToggle}
            sx={{ 
                border: 1,
                borderColor: seleccionado ? 'primary.main' : 'divider',
                borderRadius: '24px', 
                p: 2.5, 
                mb: 2.5, 
                bgcolor: seleccionado ? alpha(theme.palette.primary.main, isDarkMode ? 0.1 : 0.04) : 'background.paper', 
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)'
                }
            }}
        >
            {/* Header de la tarjeta */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Checkbox 
                        checked={!!seleccionado} 
                        color="primary"
                        sx={{ p: 0 }}
                        disableRipple
                    />
                    <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
                        {datos.empresa}
                        <Box component="span" sx={{ ml: 1, fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' }}>
                            {datos.simbolo}
                        </Box>
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        Confianza IA
                    </Typography>
                    <Typography variant="body2" fontWeight="800" color="primary.main">
                        {datos.confianza}%
                    </Typography>
                </Box>
            </Box>

            {/* Área del Gráfico */}
            <Box sx={{ height: 220, width: '100%', mb: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                        <CartesianGrid 
                            strokeDasharray="4 4" 
                            stroke={theme.palette.divider} 
                            vertical={false}
                        />
                        <XAxis 
                            dataKey="fecha" 
                            tick={{ fontSize: 10, fill: theme.palette.text.secondary, fontWeight: 500 }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            tick={{ fontSize: 10, fill: theme.palette.text.secondary, fontWeight: 500 }} 
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: theme.palette.background.paper, 
                                borderRadius: '12px', 
                                border: `1px solid ${theme.palette.divider}`,
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                            }}
                            // Formateamos para que se vea más profesional al pasar el mouse
                            formatter={(value, name) => [
                                `$${Number(value).toFixed(2)}`, 
                                name === 'precio' ? 'Precio Real' : 'Predicción IA'
                            ]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="precio" 
                            stroke={isDarkMode ? theme.palette.grey[500] : theme.palette.grey[400]} 
                            strokeWidth={2.5} 
                            dot={false} 
                            name="Histórico" 
                            connectNulls 
                        />
                        
                        <Line 
                            type="monotone" 
                            dataKey="precioEsperado" 
                            stroke={colorBase} 
                            strokeWidth={2.5} 
                            strokeDasharray="6 4" 
                            dot={{ r: 4, fill: colorBase, strokeWidth: 0 }} 
                            name="Proyección" 
                            connectNulls 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            {/* CUADRO DE RECOMENDACIÓN OPTIMIZADO */}
            <Box sx={{ 
                mt: 2, 
                p: 2, 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 2,
                bgcolor: alpha(colorBase, isDarkMode ? 0.15 : 0.08), 
                color: isDarkMode ? theme.palette[colorKey].light : theme.palette[colorKey].dark,
                border: '1px solid',
                borderColor: alpha(colorBase, 0.2),
            }}>
                <IconoTendencia sx={{ fontSize: 28, mt: 0.2 }} />
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 0.3 }}>
                        Recomendación {estado === 'neutral' ? 'Observada' : estado}
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                        {mensajeRecomendacion}
                    </Typography>
                </Box>
            </Box>
        </Card>
    );
};

export default TarjetaProyeccion;