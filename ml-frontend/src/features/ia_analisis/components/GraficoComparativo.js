// src/features/ia_analisis/components/GraficoComparativo.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, useTheme } from '@mui/material'; // Importamos Box y useTheme

const procesarDatosComparativos = (datosEmpresas) => {
    const datosAgrupados = {};

    datosEmpresas.forEach(empresa => {
        const historial = empresa.historial || [];
        let ultimaFechaReal = null;
        let ultimoPrecioReal = null;

        historial.forEach(punto => {
            const fecha = punto.fecha || punto.date; 
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            datosAgrupados[fecha][`${empresa.simbolo}_real`] = punto.precio;
            ultimaFechaReal = fecha;
            ultimoPrecioReal = punto.precio;
        });

        const prediccion = empresa.prediccion || [];

        if (ultimaFechaReal !== null && ultimoPrecioReal !== null && prediccion.length > 0) {
            datosAgrupados[ultimaFechaReal][`${empresa.simbolo}_pred`] = ultimoPrecioReal;
        }

        prediccion.forEach(punto => {
            const fecha = punto.fecha || punto.date; 
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            datosAgrupados[fecha][`${empresa.simbolo}_pred`] = punto.precioEsperado;
        });
    });

    return Object.values(datosAgrupados).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

const GraficoComparativo = ({ datos }) => {
    const theme = useTheme();
    const datosProcesados = procesarDatosComparativos(datos);

    // Colores extraídos del tema para las diferentes empresas
    const coloresPalette = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.info.main,
        theme.palette.error.main
    ];

    return (
        <Box sx={{ width: '100%', height: 400, minHeight: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosProcesados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }} 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: theme.shadows[3],
                            backgroundColor: theme.palette.background.paper 
                        }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {datos.map((empresa, index) => {
                        const color = coloresPalette[index % coloresPalette.length];
                        return (
                            <React.Fragment key={empresa.simbolo}>
                                <Line 
                                    type="monotone" 
                                    dataKey={`${empresa.simbolo}_real`} 
                                    name={`${empresa.simbolo} (Real)`}
                                    stroke={color} 
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6 }} 
                                    connectNulls 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey={`${empresa.simbolo}_pred`} 
                                    name={`${empresa.simbolo} (Proyección IA)`}
                                    stroke={color} 
                                    strokeWidth={2}
                                    strokeDasharray="5 5" 
                                    dot={{ r: 4, fill: color }} 
                                    connectNulls 
                                />
                            </React.Fragment>
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default GraficoComparativo;