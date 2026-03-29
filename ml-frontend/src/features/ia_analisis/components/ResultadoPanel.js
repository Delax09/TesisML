// src/features/ia_analisis/components/ResultadoPanel.js
import React from 'react';
import { Box, Paper, Typography, CircularProgress, Chip } from '@mui/material';
import { useResultadoIA } from '../hooks/useResultadoIA';

export default function ResultadoPanel({ empresaId }) {
    // 1. Consumimos la lógica limpia
    const { resultado, cargando, recomendacionTexto, esCompra } = useResultadoIA(empresaId);

    if (!empresaId) {
        return (
            <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: '12px', border: '2px dashed #e2e8f0', textAlign: 'center', color: 'text.secondary', height: '100%', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight="500">Esperando análisis de IA...</Typography>
            </Box>
        );
    }

    return (
        <Paper elevation={0} sx={{ bgcolor: 'background.paper', p: 3, borderRadius: '16px', border: '1px solid #f0f0f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: '320px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h4" fontWeight="700" color="#1e293b">
                    Último Análisis de IA
                </Typography>
                {resultado && (
                    <Chip label="Live" size="small" sx={{ bgcolor: '#fee2e2', color: '#ef4444', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase', height: '20px', fontSize: '0.7rem' }} />
                )}
            </Box>
            
            {cargando ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={24} sx={{ color: '#6366f1' }} />
                    <Typography sx={{ color: '#6366f1', fontWeight: '500' }}>
                        Consultando base de datos...
                    </Typography>
                </Box>
            ) : resultado ? (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #f8fafc' }}>
                        <Typography component="span" color="text.secondary">Predicción de Cierre:</Typography>
                        <Typography component="strong" sx={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 'bold' }}>
                            ${Number(resultado.PrediccionIA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #f8fafc' }}>
                        <Typography component="span" color="text.secondary">Índice RSI:</Typography>
                        <Typography component="span" sx={{ color: resultado.RSI > 70 ? '#d9534f' : resultado.RSI < 30 ? '#5cb85c' : '#f0ad4e', fontWeight: 'bold' }}>
                            {Number(resultado.RSI || 0).toFixed(2)}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #f8fafc' }}>
                        <Typography component="span" color="text.secondary">Confianza (Score):</Typography>
                        <Box sx={{ width: '80px', height: '6px', bgcolor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', width: `${Math.min(Math.max((resultado.Score + 5) * 10, 0), 100)}%`, bgcolor: resultado.Score > 0 ? '#4f46e5' : '#d9534f' }} />
                        </Box>
                    </Box>

                    <Box sx={{ mt: 3, p: 2, borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '1px', bgcolor: esCompra ? '#dcfce7' : '#fee2e2', color: esCompra ? '#166534' : '#991b1b', border: `1px solid ${esCompra ? '#bbf7d0' : '#fecaca'}` }}>
                        {recomendacionTexto.toUpperCase()}
                    </Box>
                    
                    <Box sx={{ mt: 'auto', pt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Actualizado: {new Date(resultado.FechaAnalisis).toLocaleDateString()} a las {new Date(resultado.FechaAnalisis).toLocaleTimeString()}
                        </Typography>
                    </Box>
                </>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center' }}>
                        No existen predicciones para esta empresa. Ejecuta el análisis masivo para generar datos.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}