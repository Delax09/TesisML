// src/components/ResultadoPanel.js
import React, { useState, useEffect } from 'react';
import resultadoService from '../services/resultadoService';

function ResultadoPanel({ empresaId }) {
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (empresaId) {
            const cargarResultado = async () => {
                setCargando(true);
                try {
                    const data = await resultadoService.getByEmpresa(empresaId);
                    // Tomamos el resultado más reciente (el último de la lista)
                    if (data.length > 0) setResultado(data[data.length - 1]);
                    else setResultado(null);
                } catch (error) {
                    setResultado(null);
                } finally {
                    setCargando(false);
                }
            };
            cargarResultado();
        }
    }, [empresaId]);

    if (!empresaId) return null;
    if (cargando) return <p>Analizando...</p>;
    if (!resultado) return <p style={{fontSize: '0.8rem'}}>Sin predicciones disponibles.</p>;

    // Lógica de colores para la recomendación
    const esCompra = resultado.Recomendacion.toLowerCase().includes('compra');

    return (
        <div style={estilos.panel}>
            <h4 style={{margin: '0 0 1rem 0'}}>Análisis de IA</h4>
            
            <div style={estilos.metrica}>
                <span>Predicción IA:</span>
                <strong>${resultado.PrediccionIA}</strong>
            </div>

            <div style={estilos.metrica}>
                <span>RSI:</span>
                <span style={{color: resultado.RSI > 70 ? 'red' : 'green'}}>{resultado.RSI}</span>
            </div>

            <div style={estilos.metrica}>
                <span>Score:</span>
                <div style={estilos.barraFondo}>
                    <div style={{...estilos.barraProgreso, width: `${resultado.Score * 10}%`}}></div>
                </div>
            </div>

            <div style={{...estilos.badge, backgroundColor: esCompra ? '#d4edda' : '#f8d7da', color: esCompra ? '#155724' : '#721c24'}}>
                {resultado.Recomendacion}
            </div>
            
            <small style={estilos.fecha}>Actualizado: {new Date(resultado.FechaAnalisis).toLocaleDateString()}</small>
        </div>
    );
}

const estilos = {
    panel: { backgroundColor: '#fff', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e0e0e0', minWidth: '200px' },
    metrica: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem' },
    barraFondo: { width: '60px', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden', alignSelf: 'center' },
    barraProgreso: { height: '100%', backgroundColor: '#4f46e5' },
    badge: { marginTop: '1rem', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' },
    fecha: { display: 'block', marginTop: '10px', fontSize: '0.7rem', color: '#999', textAlign: 'center' }
};

export default ResultadoPanel;