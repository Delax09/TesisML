// src/components/PrecioChart.js
import React, { useState, useEffect } from 'react';
import { /*LineChart, Line,*/ XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import precioService from '../services/precioService';


function PrecioChart({ empresaId, nombreEmpresa }) {
    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (empresaId) {
            const cargarPrecios = async () => {
                setCargando(true);
                try {
                    const data = await precioService.getByEmpresa(empresaId);
                    // Formateamos la fecha para que sea legible en la gráfica
                    const datosFormateados = data.map(item => ({
                        ...item,
                        FechaCorta: new Date(item.Fecha).toLocaleDateString()
                    }));
                    setDatos(datosFormateados);
                } catch (error) {
                    console.error("Error al cargar gráfica");
                } finally {
                    setCargando(false);
                }
            };
            cargarPrecios();
        }
    }, [empresaId]);

    if (!empresaId) return <p>Selecciona una empresa para ver su historial.</p>;
    if (cargando) return <p>Dibujando gráfica...</p>;

    return (
        <div style={estilos.contenedor}>
            <h4>Historial de Precios: {nombreEmpresa}</h4>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <AreaChart data={datos}>
                        <defs>
                            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="FechaCorta" fontSize={12} />
                        <YAxis domain={['auto', 'auto']} fontSize={12} />
                        <Tooltip />
                        <Area 
                            type="monotone" 
                            dataKey="PrecioCierre" 
                            stroke="#8884d8" 
                            fillOpacity={1} 
                            fill="url(#colorPrecio)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: '1rem' }
};

export default PrecioChart;