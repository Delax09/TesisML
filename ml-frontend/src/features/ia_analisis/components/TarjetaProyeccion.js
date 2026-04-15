// src/features/ia_analisis/components/TarjetaProyeccion.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpTwoToneIcon from '@mui/icons-material/TrendingUpTwoTone';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';
import TrendingFlatTwoToneIcon from '@mui/icons-material/TrendingFlatTwoTone'; // <-- NUEVO ÍCONO NEUTRAL
import { Box, Card, Typography, Checkbox, alpha, useTheme } from '@mui/material';

const TarjetaProyeccion = ({ datos, seleccionado, onToggle }) => {
    const theme = useTheme();

    if (!datos || !datos.historial || !datos.prediccion) {
        return <Box sx={{ p: 3, textAlign: 'center' }}>Cargando datos del gráfico...</Box>;
    }

    const chartData = [...datos.historial, ...datos.prediccion];
    
    // 1. Extraemos la recomendación (soportando distintos nombres de campo por seguridad)
    const recomendacionTexto = String(datos.recomendacion || datos.tendencia || '').toUpperCase();
    
    // 2. Evaluamos los 3 estados posibles
    let estado = 'neutral';
    if (recomendacionTexto.includes('ALCISTA') || recomendacionTexto.includes('ALZA') || recomendacionTexto.includes('COMPRA')) {
        estado = 'positivo';
    } else if (recomendacionTexto.includes('BAJISTA') || recomendacionTexto.includes('BAJA') || recomendacionTexto.includes('VEN')) {
        estado = 'negativo';
    } // Si dice MANTENER u otra cosa, se queda en 'neutral'

    // 3. Asignación dinámica de estilos según el estado
    const colorLineaProyeccion = estado === 'positivo' ? '#10b981' : estado === 'negativo' ? '#ef4444' : '#f59e0b'; // Verde, Rojo, Ámbar
    const boxBgColor = estado === 'positivo' ? 'success.main' : estado === 'negativo' ? 'error.main' : 'warning.main';
    
    // Asignación de Ícono
    const IconoTendencia = estado === 'positivo' ? TrendingUpTwoToneIcon : estado === 'negativo' ? TrendingDownTwoToneIcon : TrendingFlatTwoToneIcon;

    // Asignación de Mensaje
    let mensajeRecomendacion = 'Se proyecta estabilidad. Sugerencia de mantener posición y observar.';
    if (estado === 'positivo') mensajeRecomendacion = 'Se proyecta tendencia al alza. Considerar acumular.';
    if (estado === 'negativo') mensajeRecomendacion = 'Riesgo de caída detectado. Sugerencia de monitoreo estricto.';

    return (
        <Card 
            elevation={seleccionado ? 3 : 0}
            onClick={onToggle}
            sx={{ 
                border: 1,
                borderColor: seleccionado ? 'primary.main' : 'divider',
                borderRadius: 2, 
                p: 2, 
                mb: 2.5, 
                bgcolor: seleccionado ? alpha(theme.palette.primary.main, 0.05) : 'background.paper', 
                cursor: onToggle ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {onToggle && (
                        <Checkbox 
                            checked={!!seleccionado} 
                            onChange={onToggle}
                            onClick={(e) => e.stopPropagation()} 
                            color="primary"
                            sx={{ p: 0 }}
                        />
                    )}
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                        {datos.empresa} ({datos.simbolo})
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Confianza: <strong>{datos.confianza}%</strong>
                </Typography>
            </Box>

            <Box sx={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={10} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        <Line type="monotone" dataKey="precio" stroke="#475569" strokeWidth={2} dot={false} name="Histórico" connectNulls />
                        
                        {/* Línea dinámica según el estado */}
                        <Line 
                            type="monotone" 
                            dataKey="precioEsperado" 
                            stroke={colorLineaProyeccion} 
                            strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Proyección IA" connectNulls 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            <Box sx={{ 
                mt: 2, p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: boxBgColor, 
                color: '#fff' // Letra blanca forzada para buen contraste con los .main
            }}>
                <IconoTendencia fontSize="large" />
                <Typography variant="body2" fontWeight="500">
                    <strong>Recomendación IA:</strong> {mensajeRecomendacion}
                </Typography>
            </Box>
        </Card>
    );
};

export default TarjetaProyeccion;