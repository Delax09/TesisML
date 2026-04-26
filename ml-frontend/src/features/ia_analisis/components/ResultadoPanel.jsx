// src/features/ia_analisis/components/ResultadoPanel.js
import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Chip, Divider, Stack, FormControl, Select, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles'; 
import { useResultadoIA } from '../hooks/useResultadoIA';

// --- NUEVAS IMPORTACIONES ---
import { useAuth } from '../../../context/AuthContext';
import iaService from '../../../services/iaService';

const MedidorRSI = ({ rsi }) => {
    const theme = useTheme(); 
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
    // --- OBTENEMOS EL USUARIO ---
    const { usuario } = useAuth();

    const [modelosActivos, setModelosActivos] = useState([]);
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [cargandoModelos, setCargandoModelos] = useState(true);
    
    const { resultado, cargando: cargandoPrediccion, recomendacionTexto, esCompra } = useResultadoIA(empresaId, modeloSeleccionado);

    useEffect(() => {
        let montado = true;
        const fetchModelos = async () => {
            // Validación de seguridad para que no intente buscar si no hay ID
            if (!usuario?.id) return; 

            try {
                // --- LLAMADA AL ENDPOINT PROTEGIDO DEL USUARIO ---
                const data = await iaService.obtenerModelosPorUsuario(usuario.id);
                if (montado) {
                    setModelosActivos(data);
                    if (data.length > 0) {
                        setModeloSeleccionado(data[0].IdModelo);
                    } else {
                        // Si no tiene modelos, limpiamos el estado
                        setModeloSeleccionado('');
                    }
                }
            } catch (error) {
                console.error("Error cargando modelos:", error);
            } finally {
                if (montado) setCargandoModelos(false);
            }
        };
        fetchModelos();
        return () => { montado = false; };
    }, [usuario?.id]); // --- AGREGAMOS EL ID A LAS DEPENDENCIAS ---

    if (!empresaId) {
        return (
            <Box sx={{ bgcolor: 'market.nullState.bg', p: 2, borderRadius: 3, border: '2px dashed', borderColor: 'market.nullState.border', textAlign: 'center', color: 'text.secondary', height: '100%', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight="500">Esperando análisis de IA...</Typography>
            </Box>
        );
    }

    const recomendacionIA = resultado?.Recomendacion ? resultado.Recomendacion.toUpperCase() : (recomendacionTexto || 'N/A').toUpperCase();
    const esTendenciaAlcista = recomendacionIA.includes('ALCISTA') || recomendacionIA.includes('COMPRA') || esCompra;
    
    const porcentajeATR = resultado ? (resultado.ATR / resultado.PrecioActual) * 100 : 0;
    const volatilidadAlta = porcentajeATR > 1.5;

    return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflowY: 'auto', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, minHeight: '32px' }}>
                <Typography variant="h6" component="h4" fontWeight="700" color="text.primary">
                    Análisis Explicativo
                </Typography>
                
                {!cargandoModelos && modelosActivos.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={modeloSeleccionado}
                            onChange={(e) => setModeloSeleccionado(e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', fontWeight: 'bold' }}
                        >
                            {modelosActivos.map((modelo) => (
                                <MenuItem key={modelo.IdModelo} value={modelo.IdModelo} sx={{ fontSize: '0.8rem' }}>
                                    {modelo.Nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Box>
            
            {cargandoModelos || cargandoPrediccion ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={24} color="primary" />
                    <Typography color="text.secondary" fontWeight="500" fontSize="0.85rem">
                        Analizando parámetros...
                    </Typography>
                </Box>
            ) : modelosActivos.length === 0 ? (
                // --- NUEVO ESTADO: EL USUARIO NO TIENE MODELOS ---
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    <Typography color="error" sx={{ fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center', fontWeight: 'bold' }}>
                        No tienes acceso a modelos de IA.
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

                    {/* CAJA PRINCIPAL DE RECOMENDACIÓN CENTRALIZADA */}
                    <Box sx={{ 
                        p: 1, borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '1rem', letterSpacing: '1px', 
                        bgcolor: esTendenciaAlcista ? 'market.positive.bg' : 'market.negative.bg', 
                        color: esTendenciaAlcista ? 'market.positive.text' : 'market.negative.text', 
                        border: '1px solid',
                        borderColor: esTendenciaAlcista ? 'market.positive.border' : 'market.negative.border' 
                    }}>
                        {recomendacionIA}
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
                            label={`Tendencia: ${recomendacionIA}`}
                            sx={{ 
                                bgcolor: esTendenciaAlcista ? 'market.positive.bg' : 'market.negative.bg', 
                                color: esTendenciaAlcista ? 'market.positive.text' : 'market.negative.text',
                                border: '1px solid', 
                                borderColor: esTendenciaAlcista ? 'market.positive.border' : 'market.negative.border',
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
                            label={`Score: ${Number(resultado.Score || 0).toFixed(2)}`}
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
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    <Typography color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center' }}>
                        Este modelo aún no tiene predicciones para esta empresa.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}