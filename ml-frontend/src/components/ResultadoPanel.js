// src/components/ResultadoPanel.js
import React, { useState, useEffect } from 'react';
import resultadoService from '../services/resultadoService';
import iaService from '../services/iaService'; // Importamos el nuevo servicio

function ResultadoPanel({ empresaId }) {
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [ejecutandoIA, setEjecutandoIA] = useState(false);

    // Función para cargar los datos desde la BD
    const cargarResultado = async () => {
        if (!empresaId) return;
        setCargando(true);
        try {
            const data = await resultadoService.getByEmpresa(empresaId);
            if (data && data.length > 0) {
                // Tomamos el último resultado generado
                setResultado(data[data.length - 1]);
            } else {
                setResultado(null);
            }
        } catch (error) {
            console.error("Error cargando resultados:", error);
            setResultado(null);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarResultado();
    }, [empresaId]);

    // Función para disparar el motor de IA del backend
    const manejarEjecucionIA = async () => {
        setEjecutandoIA(true);
        try {
            await iaService.analizar(empresaId);
            alert("¡Análisis completado! La IA ha generado nuevos datos.");
            // Refrescamos los datos automáticamente después de la IA
            await cargarResultado();
        } catch (error) {
            alert("Error al ejecutar el motor de IA. Verifica el backend.");
        } finally {
            setEjecutandoIA(false);
        }
    };

    if (!empresaId) return null;

    // Lógica visual para la recomendación
    const recomendacionTexto = resultado?.Recomendacion || "Sin datos";
    const esCompra = recomendacionTexto.toLowerCase().includes('alcista') || 
                    recomendacionTexto.toLowerCase().includes('compra');

    return (
        <div style={estilos.panel}>
            <h4 style={estilos.titulo}>Análisis de IA</h4>
            
            {cargando && !ejecutandoIA ? (
                <p style={estilos.loading}>Consultando base de datos...</p>
            ) : resultado ? (
                <>
                    <div style={estilos.metrica}>
                        <span>Predicción IA:</span>
                        <strong>${Number(resultado.PrediccionIA || 0).toFixed(2)}</strong>
                    </div>

                    <div style={estilos.metrica}>
                        <span>RSI:</span>
                        <span style={{ 
                            color: resultado.RSI > 70 ? '#d9534f' : resultado.RSI < 30 ? '#5cb85c' : '#f0ad4e',
                            fontWeight: 'bold' 
                        }}>
                            {Number(resultado.RSI || 0).toFixed(2)}
                        </span>
                    </div>

                    <div style={estilos.metrica}>
                        <span>Confianza IA (Score):</span>
                        <div style={estilos.barraFondo}>
                            <div style={{ 
                                ...estilos.barraProgreso, 
                                width: `${Math.min(Math.max((resultado.Score + 5) * 10, 0), 100)}%`,
                                backgroundColor: resultado.Score > 0 ? '#4f46e5' : '#d9534f'
                            }}></div>
                        </div>
                    </div>

                    <div style={{
                        ...estilos.badge, 
                        backgroundColor: esCompra ? '#d4edda' : '#f8d7da', 
                        color: esCompra ? '#155724' : '#721c24'
                    }}>
                        {recomendacionTexto}
                    </div>
                    
                    <small style={estilos.fecha}>
                        Datos del: {new Date(resultado.FechaAnalisis).toLocaleDateString()}
                    </small>
                </>
            ) : (
                <p style={estilos.noData}>No hay predicciones previas para esta empresa.</p>
            )}

            {/* Botón para ejecutar la IA */}
            <button 
                onClick={manejarEjecucionIA} 
                disabled={ejecutandoIA}
                style={{
                    ...estilos.botonIA,
                    backgroundColor: ejecutandoIA ? '#ccc' : '#6366f1',
                    cursor: ejecutandoIA ? 'not-allowed' : 'pointer'
                }}
            >
                {ejecutandoIA ? '🤖 Procesando Modelos...' : '🚀 Ejecutar IA ahora'}
            </button>
        </div>
    );
}

const estilos = {
    panel: { 
        backgroundColor: '#fff', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        border: '1px solid #e0e0e0', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '100%', // Responsivo
        boxSizing: 'border-box'
    },
    titulo: { margin: '0 0 1rem 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' },
    metrica: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem' },
    barraFondo: { width: '80px', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden', alignSelf: 'center' },
    barraProgreso: { height: '100%', transition: 'width 0.5s ease-in-out' },
    badge: { marginTop: '1rem', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' },
    fecha: { display: 'block', marginTop: '10px', fontSize: '0.75rem', color: '#999', textAlign: 'center' },
    loading: { textAlign: 'center', fontSize: '0.9rem', color: '#666' },
    noData: { textAlign: 'center', fontSize: '0.85rem', color: '#999', padding: '1rem' },
    botonIA: {
        marginTop: '1.5rem',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
};

export default ResultadoPanel;