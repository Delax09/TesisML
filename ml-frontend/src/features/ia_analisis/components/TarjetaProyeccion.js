// src/features/ia_analisis/components/TarjetaProyeccion.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpTwoToneIcon from '@mui/icons-material/TrendingUpTwoTone';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';

const TarjetaProyeccion = ({ datos }) => {
    // 1. Validación de seguridad para evitar errores de undefined
    if (!datos || !datos.historial || !datos.prediccion) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos del gráfico...</div>;
    }

    // Combinamos historial y predicción para el gráfico
    const chartData = [...datos.historial, ...datos.prediccion];

    const colorTendencia = datos.tendencia === 'ALZA' ? '#4ade80' : '#f87171';
    const colorFondoMensaje = datos.tendencia === 'ALZA' ? '#f0fdf4' : '#fef2f2';

    return (
        <div className="tarjeta-proyeccion" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px', backgroundColor: '#ffffff' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#334155' }}>
                    {datos.empresa} ({datos.simbolo})
                </h3>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    Confianza del Modelo: <strong>{datos.confianza}%</strong>
                </span>
            </div>

            {/* 2. Contenedor con altura definida y ResponsiveContainer con minWidth */}
            <div style={{ height: '250px', width: '100%', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={10} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        {/* 3. connectNulls={true} es VITAL para que las líneas no se corten */}
                        <Line 
                            type="monotone" 
                            dataKey="precio" 
                            stroke="#475569" 
                            strokeWidth={2} 
                            dot={false} 
                            name="Histórico" 
                            connectNulls={true} 
                        />
                        <Line 
                            type="monotone" 
                            dataKey="precioEsperado" 
                            stroke={colorTendencia} 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={{ r: 3 }} 
                            name="Proyección IA" 
                            connectNulls={true} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: colorFondoMensaje, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                    {datos.tendencia === 'ALZA' ? <TrendingUpTwoToneIcon /> : <TrendingDownTwoToneIcon />}
                </span>
                <p style={{ margin: 0, fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)', color: '#334155' }}>
                    <strong>Recomendación IA:</strong> {datos.tendencia === 'ALZA' 
                        ? 'Se proyecta una tendencia al alza. Considerar mantener o acumular.' 
                        : 'Riesgo de caída detectado. Sugerencia de monitoreo estricto.'}
                </p>
            </div>
        </div>
    );
};

export default TarjetaProyeccion;