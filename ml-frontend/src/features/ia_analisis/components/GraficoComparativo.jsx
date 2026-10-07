// src/features/ia_analisis/components/GraficoComparativo.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, useTheme } from '@mui/material';

const procesarDatosParaGrafico = (datosEntrada, compararModelos) => {
    const datosAgrupados = {};
    const ordenFechas = new Set(); 

    // Helper para manejar fechas DD-MM-YYYY y ordenarlas de forma segura
    const parseDate = (dStr) => {
        if (!dStr) return 0;
        if (dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts[2]?.length === 4) { // Formato DD-MM-YYYY
                return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
            }
        }
        return new Date(dStr).getTime();
    };

    // 1. Procesar Historiales (Mostramos solo la mitad más reciente)
    datosEntrada.forEach(item => {
        const historialCompleto = item.historial || [];
        const mitadHistorial = Math.floor(historialCompleto.length / 2);
        const historialRecortado = historialCompleto.slice(mitadHistorial);

        let lastHistTime = 0;
        let lastHistDateStr = null;
        let lastHistPrice = null;

        historialRecortado.forEach(punto => {
            const fecha = punto.fecha || punto.date;
            ordenFechas.add(fecha);

            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };

            const keyReal = compararModelos ? 'precio_real' : `${item.simbolo}_real`;
            datosAgrupados[fecha][keyReal] = punto.precio;

            // Extraer el último punto real
            const t = parseDate(fecha);
            if (t > lastHistTime) {
                lastHistTime = t;
                lastHistDateStr = fecha;
                lastHistPrice = punto.precio;
            }
        });
        
        // Guardamos el ancla en el item temporalmente
        item._lastHistDateStr = lastHistDateStr;
        item._lastHistPrice = lastHistPrice;
    });

    // 2. Procesar Predicciones (Solo el análisis más reciente)
    datosEntrada.forEach(item => {
        const preds = item.prediccion || [];
        const keyPred = `${item.simbolo}_pred`;
        
        if (preds.length > 0) {
            // Filtrar y dejar solo la iteración más reciente del modelo
            const maxAnalisisTime = Math.max(...preds.map(p => parseDate(p.fechaAnalisis)));
            const prediccionesRecientes = preds.filter(p => parseDate(p.fechaAnalisis) === maxAnalisisTime);

            prediccionesRecientes.forEach(punto => {
                const fecha = punto.fechaPrediccion || punto.fecha || punto.date;
                ordenFechas.add(fecha);

                if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };

                const precioPred = punto.precioPrediccion !== undefined ? punto.precioPrediccion : punto.precioEsperado;
                datosAgrupados[fecha][keyPred] = precioPred;
            });
            
            // ANCLAJE: Conectar línea punteada con el último precio real
            if (item._lastHistDateStr && item._lastHistPrice !== null) {
                ordenFechas.add(item._lastHistDateStr);
                if (!datosAgrupados[item._lastHistDateStr]) {
                    datosAgrupados[item._lastHistDateStr] = { fecha: item._lastHistDateStr };
                }
                datosAgrupados[item._lastHistDateStr][keyPred] = item._lastHistPrice;
            }
        }
    });

    // Retornamos el array ordenándolo cronológicamente de forma estricta
    return Array.from(ordenFechas)
        .map(fecha => datosAgrupados[fecha])
        .sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
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