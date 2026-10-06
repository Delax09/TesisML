// src/features/ia_analisis/components/TarjetaProyeccion.jsx
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpTwoToneIcon from '@mui/icons-material/TrendingUpTwoTone';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';
import TrendingFlatTwoToneIcon from '@mui/icons-material/TrendingFlatTwoTone';
import { Box, Card, Typography, Checkbox, alpha, useTheme, Chip } from '@mui/material';

// ALGORITMO DE CONFIANZA REAL: Calcula R^2 y Volatilidad
const calcularConfianzaDinamica = (historial) => {
    if (!historial || historial.length < 2) return 85; // Fallback de seguridad
    
    const prices = historial.map(p => p.precio);
    const n = prices.length;
    
    // 1. Calcular R^2 (Fuerza de la tendencia mediante regresión lineal simple)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    prices.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    });
    
    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;
    
    let sumaErroresCuadrados = 0;
    let sumaTotalCuadrados = 0;
    const mediaY = sumY / n;
    
    prices.forEach((y, x) => {
        const yPred = pendiente * x + intercepto;
        sumaErroresCuadrados += Math.pow(y - yPred, 2);
        sumaTotalCuadrados += Math.pow(y - mediaY, 2);
    });
    
    const r2 = sumaTotalCuadrados === 0 ? 0 : 1 - (sumaErroresCuadrados / sumaTotalCuadrados);
    
    // 2. Calcular Volatilidad (Desviación estándar de los retornos diarios)
    let sumRetornos = 0;
    const retornos = [];
    for(let i = 1; i < n; i++){
        const ret = (prices[i] - prices[i-1]) / prices[i-1];
        retornos.push(ret);
        sumRetornos += ret;
    }
    const mediaRetornos = sumRetornos / retornos.length;
    let varRetornos = 0;
    retornos.forEach(r => varRetornos += Math.pow(r - mediaRetornos, 2));
    const volatilidad = Math.sqrt(varRetornos / retornos.length);
    
    // 3. Fórmula heurística: Base 60% + (Fuerza de tendencia * 35) - (Penalización por volatilidad)
    let confianza = 60 + (r2 * 35) - (volatilidad * 100); 
    
    // Limitar el resultado a un rango realista entre 50% y 98%
    return Math.min(Math.max(Math.round(confianza), 50), 98);
};

const TarjetaProyeccion = ({ datos, seleccionado, onToggle }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    // Calcula la confianza dinámicamente basada en los datos reales de esta empresa
    const confianzaReal = useMemo(() => calcularConfianzaDinamica(datos?.historial), [datos?.historial]);

    // LÓGICA ORIGINAL INTACTA: Unificar historial y predicción por fecha
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
    if (estado === 'positivo') mensajeRecomendacion = 'Se proyecta tendencia al alza.';
    if (estado === 'negativo') mensajeRecomendacion = 'Riesgo de caída detectado.';

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
                    </Typography>
                    
                    {/* Caso de Uso N°49: Tag visual distintivo con el sector económico */}
                    {datos.sector && (
                        <Chip 
                            label={datos.sector} 
                            color="primary" 
                            variant="filled" 
                            size="small" 
                            sx={{ fontWeight: 'bold' }}
                        />
                    )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        Confianza IA
                    </Typography>
                    <Typography variant="body2" fontWeight="800" color="primary.main">
                        {confianzaReal}%
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