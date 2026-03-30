// src/features/ia_analisis/components/GraficoComparativo.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const procesarDatosComparativos = (datosEmpresas) => {
    const datosAgrupados = {};

    datosEmpresas.forEach(empresa => {
        const historial = empresa.historial || [];
        let ultimaFechaReal = null;
        let ultimoPrecioReal = null;

        // 1. Procesar el Historial (Precios Reales)
        historial.forEach(punto => {
            const fecha = punto.fecha || punto.date; 
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            
            // Guardamos el precio real
            datosAgrupados[fecha][`${empresa.simbolo}_real`] = punto.precio;

            // Almacenamos siempre el último punto recorrido
            ultimaFechaReal = fecha;
            ultimoPrecioReal = punto.precio;
        });

        // 2. Procesar la Predicción IA
        const prediccion = empresa.prediccion || [];

        // EL FIX: CREAMOS EL PUENTE VISUAL
        // Le asignamos el último precio real como el punto de inicio de la predicción 
        // para que las líneas se conecten sin dejar un espacio en blanco.
        if (ultimaFechaReal !== null && ultimoPrecioReal !== null && prediccion.length > 0) {
            datosAgrupados[ultimaFechaReal][`${empresa.simbolo}_pred`] = ultimoPrecioReal;
        }

        prediccion.forEach(punto => {
            const fecha = punto.fecha || punto.date; 
            if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha };
            
            datosAgrupados[fecha][`${empresa.simbolo}_pred`] = punto.precioEsperado;
        });
    });

    // Devolvemos el array ordenado cronológicamente
    return Object.values(datosAgrupados).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

const colores = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#e83e8c'];

const GraficoComparativo = ({ datos }) => {
    const datosProcesados = procesarDatosComparativos(datos);

    return (
        <div style={{ width: '100%', height: 400, minHeight: 400, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={datosProcesados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    
                    {datos.map((empresa, index) => {
                        const color = colores[index % colores.length];
                        return (
                            <React.Fragment key={empresa.simbolo}>
                                {/* LÍNEA HISTÓRICA */}
                                <Line 
                                    type="monotone" 
                                    dataKey={`${empresa.simbolo}_real`} 
                                    name={`${empresa.simbolo} (Real)`}
                                    stroke={color} 
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 8 }} 
                                    connectNulls 
                                />
                                {/* LÍNEA DE PREDICCIÓN */}
                                <Line 
                                    type="monotone" 
                                    dataKey={`${empresa.simbolo}_pred`} 
                                    name={`${empresa.simbolo} (Proyección IA)`}
                                    stroke={color} 
                                    strokeWidth={2}
                                    strokeDasharray="5 5" 
                                    dot={{ r: 4 }} 
                                    connectNulls 
                                />
                            </React.Fragment>
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoComparativo;