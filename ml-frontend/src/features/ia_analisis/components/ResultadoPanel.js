// src/features/ia_analisis/components/ResultadoPanel.js
import React from 'react';
import { Box, Paper, Typography, CircularProgress, Chip, Divider, Stack } from '@mui/material';
import { useResultadoIA } from '../hooks/useResultadoIA';

// Componente auxiliar para el Medidor Semicircular del RSI
const MedidorRSI = ({ rsi }) => {
    const valorRSI = Number(rsi || 0);
    // Calcular la rotación de la aguja (-90deg a 90deg)
    const rotacion = (valorRSI / 100) * 180 - 90;
    
    let estado = "Neutral";
    let colorTexto = "#eab308"; // Amarillo
    if (valorRSI < 30) { estado = "Sobreventa"; colorTexto = "#22c55e"; } // Verde
    if (valorRSI > 70) { estado = "Sobrecompra"; colorTexto = "#ef4444"; } // Rojo

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1 }}>
            <Box sx={{ position: 'relative', width: '160px', height: '80px', overflow: 'hidden' }}>
                {/* Arco SVG */}
                <svg width="160" height="80" viewBox="0 0 160 80">
                    {/* Zona Verde (0-30) */}
                    <path d="M 10 75 A 70 70 0 0 1 35 25" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" />
                    {/* Zona Amarilla (30-70) */}
                    <path d="M 35 25 A 70 70 0 0 1 125 25" fill="none" stroke="#eab308" strokeWidth="12" />
                    {/* Zona Roja (70-100) */}
                    <path d="M 125 25 A 70 70 0 0 1 150 75" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
                </svg>
                {/* Aguja indicadora */}
                <Box sx={{
                    position: 'absolute', bottom: '0px', left: '50%', width: '4px', height: '65px',
                    bgcolor: '#334155', transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${rotacion}deg)`,
                    transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '4px'
                }}>
                    <Box sx={{ width: '12px', height: '12px', bgcolor: '#334155', borderRadius: '50%', position: 'absolute', bottom: '-4px', left: '-4px' }}/>
                </Box>
            </Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: colorTexto, mt: 1 }}>
                {valorRSI.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
                {estado}
            </Typography>
        </Box>
    );
};

export default function ResultadoPanel({ empresaId }) {
    const { resultado, cargando, recomendacionTexto, esCompra } = useResultadoIA(empresaId);

    if (!empresaId) {
        return (
            <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: '12px', border: '2px dashed #e2e8f0', textAlign: 'center', color: 'text.secondary', height: '100%', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight="500">Esperando análisis de IA...</Typography>
            </Box>
        );
    }

    // Datos simulados (Puedes reemplazar EMA y ATR si los trae tu 'resultado' desde el backend)
    const tendenciaAlcista = resultado && (resultado.PrecioActual > resultado.EMA20); 
    const porcentajeATR = resultado ? (resultado.ATR / resultado.PrecioActual) * 100 : 0;
    const volatilidadAlta = porcentajeATR > 1.5;

    return (
        <Paper elevation={0} sx={{ bgcolor: 'background.paper', p: 3, borderRadius: '16px', border: '1px solid #f0f0f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: '400px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="h4" fontWeight="700" color="#1e293b">
                    Análisis Explicativo (XAI)
                </Typography>
                {resultado && (
                    <Chip label="Live" size="small" sx={{ bgcolor: '#fee2e2', color: '#ef4444', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase', height: '20px', fontSize: '0.7rem' }} />
                )}
            </Box>
            
            {cargando ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={24} sx={{ color: '#6366f1' }} />
                    <Typography sx={{ color: '#6366f1', fontWeight: '500' }}>
                        Analizando parámetros...
                    </Typography>
                </Box>
            ) : resultado ? (
                <>
                    {/* 1. SECCIÓN DE PRECIO Y RECOMENDACIÓN */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Typography component="span" color="text.secondary">Predicción Cierre:</Typography>
                        <Typography component="strong" sx={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '900' }}>
                            ${Number(resultado.PrediccionIA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                    </Box>

                    <Box sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '1px', bgcolor: esCompra ? '#dcfce7' : '#fee2e2', color: esCompra ? '#166534' : '#991b1b', border: `1px solid ${esCompra ? '#bbf7d0' : '#fecaca'}` }}>
                        {recomendacionTexto.toUpperCase()}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* 2. MEDIDOR VISUAL RSI */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Índice de Fuerza Relativa (RSI)
                        </Typography>
                        <MedidorRSI rsi={resultado.RSI} />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* 3. RESUMEN DE SEÑALES (BADGES) */}
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Contexto del Mercado
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip 
                            label={`Tendencia: ${tendenciaAlcista ? 'ALCISTA' : 'BAJISTA'}`}
                            sx={{ 
                                bgcolor: tendenciaAlcista ? '#f0fdf4' : '#fef2f2', 
                                color: tendenciaAlcista ? '#166534' : '#991b1b',
                                border: `1px solid ${tendenciaAlcista ? '#bbf7d0' : '#fecaca'}`,
                                fontWeight: '600', fontSize: '0.75rem' 
                            }} 
                        />
                        <Chip 
                            label={`Volatilidad: ${volatilidadAlta ? 'ALTA' : 'NORMAL'}`}
                            sx={{ 
                                bgcolor: volatilidadAlta ? '#fffbeb' : '#f8fafc', 
                                color: volatilidadAlta ? '#b45309' : '#475569',
                                border: `1px solid ${volatilidadAlta ? '#fde68a' : '#e2e8f0'}`,
                                fontWeight: '600', fontSize: '0.75rem' 
                            }} 
                        />
                        <Chip 
                            label={`Fuerza de Señal (Score): ${Number(resultado.Score || 0).toFixed(2)}`}
                            sx={{ 
                                bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
                                fontWeight: '600', fontSize: '0.75rem' 
                            }} 
                        />
                    </Stack>
                    
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