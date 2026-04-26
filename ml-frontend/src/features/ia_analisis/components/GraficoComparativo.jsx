// src/features/ia_analisis/components/GraficoComparativo.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, useTheme } from '@mui/material';

const procesarDatosParaGrafico = (datosEntrada, compararModelos) => {
    const datosAgrupados = {};

    // 1. Procesar Historiales
    datosEntrada.forEach(item => {
        const historial = item.historial || [];
        historial.forEach(punto => {
            const fecha = punto.fecha || punto.date;
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            
            // Si es modo modelos, todos comparten 'precio_real'
            const keyReal = compararModelos ? 'precio_real' : `${item.simbolo}_real`;
            datosAgrupados[fecha][keyReal] = punto.precio;
        });
    });

    // 2. Procesar Predicciones (Sin filtrar por fecha para evitar que desaparezcan puntos)
    datosEntrada.forEach(item => {
        const prediccion = item.prediccion || [];
        const keyPred = `${item.simbolo}_pred`;

        prediccion.forEach(punto => {
            const fecha = punto.fecha || punto.date;
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            datosAgrupados[fecha][keyPred] = punto.precioEsperado;
        });
    });

    // Convertir a array y ordenar por fecha para que la línea no "salte"
    return Object.values(datosAgrupados).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

const GraficoComparativo = ({ datos, compararModelos = false }) => {
    const theme = useTheme();
    const datosProcesados = procesarDatosParaGrafico(datos, compararModelos);

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
                    <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                        minTickGap={30}
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }} 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '12px', border: 'none', 
                            boxShadow: theme.shadows[3],
                            backgroundColor: theme.palette.background.paper 
                        }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {/* LÍNEA REAL ÚNICA (Solo en modo Comparar Modelos) */}
                    {compararModelos && (
                        <Line 
                            type="monotone" 
                            dataKey="precio_real" 
                            name="Precio Real"
                            stroke={theme.palette.text.primary} 
                            strokeWidth={3} 
                            dot={false} 
                            connectNulls 
                        />
                    )}

                    {datos.map((item, index) => {
                        const color = coloresPalette[index % coloresPalette.length];
                        return (
                            <React.Fragment key={item.simbolo}>
                                {/* LÍNEA REAL POR EMPRESA (Solo en modo Comparar Empresas) */}
                                {!compararModelos && (
                                    <Line 
                                        type="monotone" 
                                        dataKey={`${item.simbolo}_real`} 
                                        name={`${item.simbolo} (Real)`} 
                                        stroke={color} 
                                        strokeWidth={3} 
                                        dot={false} 
                                        connectNulls 
                                    />
                                )}
                                {/* LÍNEA DE PROYECCIÓN (Punteada) */}
                                <Line 
                                    type="monotone" 
                                    dataKey={`${item.simbolo}_pred`} 
                                    name={compararModelos ? `Proyección ${item.simbolo}` : `${item.simbolo} (IA)`}
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