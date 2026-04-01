// src/features/portafolio/components/DashboardAnalitico.js
import React from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAnalisisPortafolio } from '../hooks/useAnalisisPortafolio';

const DashboardAnalitico = () => {
    const theme = useTheme(); // Acceso al tema global
    const { data, isLoading, error } = useAnalisisPortafolio();

    // Colores dinámicos extraídos del tema
    const COLORS = [
        theme.palette.primary.main, 
        theme.palette.secondary.main, 
        theme.palette.success.main, 
        theme.palette.warning.main, 
        theme.palette.info.main, 
        theme.palette.error.main
    ];

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (error) return <Typography color="error" align="center">Error al cargar el análisis.</Typography>;
    if (!data || data.distribucion_sectores.length === 0) {
        return <Typography align="center" sx={{ mt: 4 }}>No hay suficientes datos. Añade empresas a tu portafolio.</Typography>;
    }

    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                {/* Métricas Resumen */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ opacity: 0.9 }}>Volatilidad (Anualizada)</Typography>
                            <Typography variant="h2" fontWeight="900" sx={{ my: 1 }}>{data.metricas?.volatilidad ?? 0}%</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>Riesgo estimado en base a fluctuación de precios (últimos 30 días).</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ opacity: 0.9 }}>Ratio de Sharpe</Typography>
                            <Typography variant="h2" fontWeight="900" sx={{ my: 1 }}>{data.metricas?.sharpe_ratio ?? 0}</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                {(data.metricas?.sharpe_ratio ?? 0) > 1 ? "Excelente rendimiento frente al riesgo." : "Rendimiento promedio frente al riesgo asumido."}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gráfico de Sectores */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" align="center" gutterBottom>Distribución por Sector</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distribucion_sectores}
                                        dataKey="porcentaje"
                                        nameKey="sector"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60} // Lo hacemos tipo "Donut" para que sea más moderno
                                        outerRadius={80}
                                        paddingAngle={5}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.distribucion_sectores.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadows[3] }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gráfico Histórico */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" align="center" gutterBottom>Rendimiento Histórico Consolidado (30 días)</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data.rendimiento_historico}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                                    <YAxis 
                                        domain={['dataMin', 'dataMax']} 
                                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                                        tickFormatter={(value) => `$${value}`} 
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadows[3] }}
                                        formatter={(value) => [`$${value.toFixed(2)}`, "Valor Total"]} 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="valor_total" 
                                        stroke={theme.palette.primary.main} 
                                        strokeWidth={4} 
                                        dot={{ r: 4, fill: theme.palette.primary.main }} 
                                        activeDot={{ r: 8 }}
                                        connectNulls={true} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardAnalitico;