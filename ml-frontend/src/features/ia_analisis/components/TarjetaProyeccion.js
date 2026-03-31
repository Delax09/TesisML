// src/features/ia_analisis/components/TarjetaProyeccion.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpTwoToneIcon from '@mui/icons-material/TrendingUpTwoTone';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';
import { Box, Card, Typography, Checkbox, alpha } from '@mui/material';

const TarjetaProyeccion = ({ datos, seleccionado, onToggle }) => {
    if (!datos || !datos.historial || !datos.prediccion) {
        return <Box sx={{ p: 3, textAlign: 'center' }}>Cargando datos del gráfico...</Box>;
    }

    const chartData = [...datos.historial, ...datos.prediccion];
    const esAlza = datos.tendencia === 'ALZA';

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
                // Usamos alpha para darle un tono transparente del color primario
                bgcolor: seleccionado ? (theme) => alpha(theme.palette.primary.main, 0.05) : 'background.paper', 
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
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={10} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        <Line type="monotone" dataKey="precio" stroke="#475569" strokeWidth={2} dot={false} name="Histórico" connectNulls />
                        {/* Usamos el color de éxito o error del tema según la tendencia */}
                        <Line 
                            type="monotone" 
                            dataKey="precioEsperado" 
                            stroke={esAlza ? '#10b981' : '#ef4444'} 
                            strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Proyección IA" connectNulls 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            <Box sx={{ 
                mt: 2, p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                // Colores dinámicos del tema para el mensaje de recomendación
                bgcolor: esAlza ? 'success.light' : 'error.light', 
                color: 'white' // Letra blanca para contrastar
            }}>
                {esAlza ? <TrendingUpTwoToneIcon fontSize="large" /> : <TrendingDownTwoToneIcon fontSize="large" />}
                <Typography variant="body2" fontWeight="500">
                    <strong>Recomendación IA:</strong> {esAlza 
                        ? 'Se proyecta tendencia al alza. Considerar mantener o acumular.' 
                        : 'Riesgo de caída detectado. Sugerencia de monitoreo estricto.'}
                </Typography>
            </Box>
        </Card>
    );
};

export default TarjetaProyeccion;