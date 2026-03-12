// src/components/PrecioChart.js
import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import precioService from '../services/precioService';

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
                    console.error("Error al cargar gráfica");
                } finally {
                    setCargando(false);
                }
            };
            cargarPrecios();
        }
    }, [empresaId]);

    // LÓGICA DE FILTRADO RESPONSIVA
    const datosFiltrados = useMemo(() => {
        if (!datosOriginales.length) return [];
        if (rango === 'TODO') return datosOriginales.map(d => ({...d, FechaCorta: new Date(d.Fecha).toLocaleDateString()}));

        const ahora = new Date();
        const fechaLimite = new Date();

        if (rango === '1D') fechaLimite.setDate(ahora.getDate() - 1);
        else if (rango === '5D') fechaLimite.setDate(ahora.getDate() - 5);
        else if (rango === '1M') fechaLimite.setMonth(ahora.getMonth() - 1);
        else if (rango === '6M') fechaLimite.setMonth(ahora.getMonth() - 6);
        else if (rango === '1Y') fechaLimite.setFullYear(ahora.getFullYear() - 1);
        else if (rango === '5Y') fechaLimite.setFullYear(ahora.getFullYear() - 5);

        return datosOriginales
            .filter(item => new Date(item.Fecha) >= fechaLimite)
            .map(item => ({
                ...item,
                FechaCorta: new Date(item.Fecha).toLocaleDateString()
            }));
    }, [datosOriginales, rango]);

    if (!empresaId) return <p style={{padding: '2rem'}}>Selecciona una empresa para ver su historial.</p>;
    if (cargando) return <p style={{padding: '2rem'}}>Dibujando gráfica...</p>;

    const botonesRango = [
        { label: '1 día', v: '1D' }, { label: '5 días', v: '5D' },
        { label: '1 mes', v: '1M' }, { label: '6 meses', v: '6M' },
        { label: '1 año', v: '1Y' }, { label: '5 años', v: '5Y' },
        { label: 'Todo', v: 'TODO' }
    ];

    return (
        <div style={estilos.contenedor}>
            <div style={estilos.headerGrafica}>
                <h4>Historial de Precios: {nombreEmpresa}</h4>
                <div style={estilos.toolbar}>
                    {botonesRango.map(btn => (
                        <button 
                            key={btn.v} 
                            onClick={() => setRango(btn.v)}
                            style={{
                                ...estilos.btnRango,
                                backgroundColor: rango === btn.v ? '#e8f0fe' : 'transparent',
                                color: rango === btn.v ? '#1a73e8' : '#5f6368',
                                fontWeight: rango === btn.v ? 'bold' : 'normal'
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    <AreaChart data={datosFiltrados}>
                        <defs>
                            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="FechaCorta" fontSize={10} tick={{fill: '#666'}} />
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
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: '1rem' },
    headerGrafica: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' },
    toolbar: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
    btnRango: { border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', transition: '0.2s' }
};

export default PrecioChart;