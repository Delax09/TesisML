// src/components/PrecioChart.js
import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { precioService } from 'services';

function PrecioChart({ empresaId, nombreEmpresa }) {
    const [datosOriginales, setDatosOriginales] = useState([]);
    const [rango, setRango] = useState('6M'); // Rango por defecto
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (empresaId) {
            const cargarPrecios = async () => {
                setCargando(true);
                try {
                    const data = await precioService.getByEmpresa(empresaId); 
                    setDatosOriginales(data);
                } catch (error) {
                    console.error("Error al cargar gráfica", error);
                } finally {
                    setCargando(false);
                }
            };
            cargarPrecios();
        }
    }, [empresaId]);

    // LÓGICA DE FILTRADO RESPONSIVA (Intacta)
    const datosFiltrados = useMemo(() => {
        if (!datosOriginales || !datosOriginales.length) return [];

        const formatearParaGrafica = (item, tipoCorta = true) => {
            let fechaObj;
            
            try {
                if (item.Fecha instanceof Date) {
                    fechaObj = item.Fecha;
                } else if (typeof item.Fecha === 'string') {
                    const isoStr = item.Fecha.replace(' ', 'T').split('.')[0];
                    fechaObj = new Date(isoStr);
                } else if (typeof item.Fecha === 'number') {
                    fechaObj = new Date(item.Fecha);
                }

                if (!fechaObj || isNaN(fechaObj.getTime())) {
                    fechaObj = new Date(item.Fecha);
                }

                if (isNaN(fechaObj.getTime())) return { ...item, fechaValida: null, FechaCorta: 'Err' };

                return {
                    ...item,
                    fechaValida: fechaObj,
                    FechaCorta: tipoCorta 
                        ? fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : fechaObj.toLocaleDateString('es-ES')
                };
            } catch (e) {
                return { ...item, fechaValida: null, FechaCorta: 'Err' };
            }
        };

        const datosProcesados = datosOriginales.map(d => formatearParaGrafica(d, rango !== 'TODO'));

        datosProcesados.sort((a, b) => {
            if (!a.fechaValida || !b.fechaValida) return 0;
            return a.fechaValida.getTime() - b.fechaValida.getTime();
        });
        
        if (rango === 'TODO') return datosProcesados;

        const datosConFecha = datosProcesados.filter(d => d.fechaValida);
        if (!datosConFecha.length) return [];

        const ultimaFecha = datosConFecha[datosConFecha.length - 1].fechaValida;
        const fechaLimite = new Date(ultimaFecha.getTime());

        if (rango === '1D') fechaLimite.setDate(fechaLimite.getDate() - 1);
        else if (rango === '5D') fechaLimite.setDate(fechaLimite.getDate() - 5);
        else if (rango === '1M') fechaLimite.setMonth(fechaLimite.getMonth() - 1);
        else if (rango === '6M') fechaLimite.setMonth(fechaLimite.getMonth() - 6);
        else if (rango === '1Y') fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);
        else if (rango === '5Y') fechaLimite.setFullYear(fechaLimite.getFullYear() - 5);

        return datosProcesados.filter(d => d.fechaValida && d.fechaValida >= fechaLimite);
    }, [datosOriginales, rango]);

    // Manejador para el ToggleButtonGroup de MUI
    const handleCambioRango = (event, nuevoRango) => {
        // Evita que el usuario deseleccione la opción actual dejando el valor en null
        if (nuevoRango !== null) {
            setRango(nuevoRango);
        }
    };

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
        <Paper 
            elevation={0} 
            sx={{ 
                p: 3, 
                borderRadius: '12px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
                mt: 2,
                bgcolor: 'background.paper' 
            }}
        >
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 2, 
                    mb: 3 
                }}
            >
                <Typography variant="h6" component="h4" fontWeight="bold">
                    Historial de Precios: {nombreEmpresa}
                </Typography>
                
                <ToggleButtonGroup
                    value={rango}
                    exclusive
                    onChange={handleCambioRango}
                    aria-label="Rango de tiempo"
                    size="small"
                    color="primary"
                >
                    {botonesRango.map(btn => (
                        <ToggleButton 
                            key={btn.v} 
                            value={btn.v}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: rango === btn.v ? 'bold' : 'normal',
                                px: 2
                            }}
                        >
                            {btn.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ width: '100%' }}> {/* Añade minHeight aquí */}
                <ResponsiveContainer width="100%" height={350}> {/* Añade minWidth={0} */}
                    <AreaChart data={datosFiltrados}>
                        <defs>
                            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="FechaCorta" fontSize={10} tick={{fill: '#666'}} minTickGap={30}/>
                        <YAxis domain={['auto', 'auto']} fontSize={10} orientation="right" tick={{fill: '#666'}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Area 
                            type="monotone" 
                            dataKey="PrecioCierre" 
                            stroke="#1a73e8" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPrecio)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}

export default PrecioChart;