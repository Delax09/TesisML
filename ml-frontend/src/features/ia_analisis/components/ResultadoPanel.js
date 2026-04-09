// src/features/ia_analisis/components/ResultadoPanel.js
import React from 'react';
import { Box, Paper, Typography, CircularProgress, Chip, Divider, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles'; 
import { useResultadoIA } from '../hooks/useResultadoIA';

// Componente auxiliar para el Medidor Semicircular del RSI
const MedidorRSI = ({ rsi }) => {
    const theme = useTheme(); // Aquí SÍ usamos el tema para el SVG
    const valorRSI = Number(rsi || 0);
    const rotacion = (valorRSI / 100) * 180 - 90;
    
    let estado = "Neutral";
    let colorTexto = theme.palette.warning.main; 
    
    if (valorRSI < 30) { 
        estado = "Sobreventa"; 
        colorTexto = theme.palette.market.positive.text; 
    } 
    if (valorRSI > 70) { 
        estado = "Sobrecompra"; 
        colorTexto = theme.palette.market.negative.text; 
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1 }}>
            <Box sx={{ position: 'relative', width: '160px', height: '80px', overflow: 'hidden' }}>
                <svg width="160" height="80" viewBox="0 0 160 80">
                    <path d="M 10 75 A 70 70 0 0 1 35 25" fill="none" stroke={theme.palette.market.positive.icon} strokeWidth="12" strokeLinecap="round" />
                    <path d="M 35 25 A 70 70 0 0 1 125 25" fill="none" stroke={theme.palette.warning.main} strokeWidth="12" />
                    <path d="M 125 25 A 70 70 0 0 1 150 75" fill="none" stroke={theme.palette.market.negative.icon} strokeWidth="12" strokeLinecap="round" />
                </svg>
                <Box sx={{
                    position: 'absolute', bottom: '0px', left: '50%', width: '4px', height: '65px',
                    bgcolor: 'text.primary', transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${rotacion}deg)`,
                    transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '4px'
                }}>
                    <Box sx={{ width: '12px', height: '12px', bgcolor: 'text.primary', borderRadius: '50%', position: 'absolute', bottom: '-4px', left: '-4px' }}/>
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
    // ELIMINAMOS EL const theme = useTheme(); QUE NO SE USABA
    const { resultado, cargando, recomendacionTexto, esCompra } = useResultadoIA(empresaId);

    if (!empresaId) {
        return (
            <Box sx={{ bgcolor: 'market.nullState.bg', p: 2, borderRadius: 3, border: '2px dashed', borderColor: 'market.nullState.border', textAlign: 'center', color: 'text.secondary', height: '100%', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight="500">Esperando análisis de IA...</Typography>
            </Box>
        );
    }

    const tendenciaAlcista = resultado && (resultado.PrecioActual > resultado.EMA20); 
    const porcentajeATR = resultado ? (resultado.ATR / resultado.PrecioActual) * 100 : 0;
    const volatilidadAlta = porcentajeATR > 1.5;

    return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflowY: 'auto', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="h4" fontWeight="700" color="text.primary">
                    Análisis Explicativo (XAI)
                </Typography>
                {resultado && (
                    <Chip label="Live" size="small" color="error" variant="outlined" sx={{ fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase', height: '20px', fontSize: '0.7rem' }} />
                )}
            </Box>
            
            {cargando ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={24} color="primary" />
                    <Typography color="primary" fontWeight="500">
                        Analizando parámetros...
                    </Typography>
                </Box>
            ) : resultado ? (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Typography component="span" color="text.secondary">Predicción Cierre:</Typography>
                        <Typography component="strong" sx={{ fontSize: '1.25rem', color: 'text.primary', fontWeight: '900' }}>
                            ${Number(resultado.PrediccionIA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                    </Box>

                    <Box sx={{ 
                        p: 1, borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '1rem', letterSpacing: '1px', 
                        bgcolor: esCompra ? 'market.positive.bg' : 'market.negative.bg', 
                        color: esCompra ? 'market.positive.text' : 'market.negative.text', 
                        border: '1px solid',
                        borderColor: esCompra ? 'market.positive.border' : 'market.negative.border' 
                    }}>
                        {recomendacionTexto.toUpperCase()}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Índice de Fuerza Relativa (RSI)
                        </Typography>
                        <MedidorRSI rsi={resultado.RSI} />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Contexto del Mercado
                    </Typography>
                    
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip 
                            label={`Tendencia: ${tendenciaAlcista ? 'ALCISTA' : 'BAJISTA'}`}
                            sx={{ 
                                bgcolor: tendenciaAlcista ? 'market.positive.bg' : 'market.negative.bg', 
                                color: tendenciaAlcista ? 'market.positive.text' : 'market.negative.text',
                                border: '1px solid', borderColor: tendenciaAlcista ? 'market.positive.border' : 'market.negative.border',
                                fontWeight: '600', fontSize: '0.75rem' 
                            }} 
                        />
                        <Chip 
                            label={`Volatilidad: ${volatilidadAlta ? 'ALTA' : 'NORMAL'}`}
                            color={volatilidadAlta ? "warning" : "default"}
                            variant="outlined"
                            sx={{ fontWeight: '600', fontSize: '0.75rem', bgcolor: volatilidadAlta ? '#fffbeb' : 'background.default' }} 
                        />
                        <Chip 
                            label={`Fuerza de Señal (Score): ${Number(resultado.Score || 0).toFixed(2)}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: '600', fontSize: '0.75rem', bgcolor: 'primary.light', color: 'primary.contrastText' }} 
                        />
                    </Stack>
                    
                    <Box sx={{ mt: 'auto', pt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Actualizado: {new Date(resultado.FechaAnalisis).toLocaleDateString()} a las {new Date(resultado.FechaAnalisis).toLocaleTimeString()}
                        </Typography>
                    </Box>
                </>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center' }}>
                        No existen predicciones para esta empresa. Ejecuta el análisis masivo para generar datos.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}