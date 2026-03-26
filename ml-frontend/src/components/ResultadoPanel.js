import React, { useState, useEffect } from 'react';
import { resultadoService } from 'services';

function ResultadoPanel({ empresaId }) {
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);


    // Recargar cada vez que cambie la empresa seleccionada
    useEffect(() => {
        // Función para cargar los datos desde la BD (Movida aquí adentro)
        const cargarResultado = async () => {
            if (!empresaId) return;
            setCargando(true);
            try {
                const data = await resultadoService.getByEmpresa(empresaId);
                if (data && data.length > 0) {
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

        cargarResultado();
    }, [empresaId]); // Ahora empresaId es la única dependencia real

    if (!empresaId) {
        return (
            <div style={estilos.panelVacio}>
                <p style={{ margin: 0, fontWeight: '500' }}>Esperando análisis de IA...</p>
            </div>
        );
    }

    // Lógica visual para la recomendación
    const recomendacionTexto = resultado?.Recomendacion || "Sin datos";
    const esCompra = recomendacionTexto.toLowerCase().includes('alcista') || 
                    recomendacionTexto.toLowerCase().includes('compra');

    return (
        <div style={estilos.panel}>
            <header style={estilos.header}>
                <h4 style={estilos.titulo}>Último Análisis de IA</h4>
                {resultado && <span style={estilos.badgeLive}>Live</span>}
            </header>
            
            {cargando ? (
                <div style={estilos.centro}>
                    <p style={estilos.loading}>Consultando base de datos...</p>
                </div>
            ) : resultado ? (
                <>
                    <div style={estilos.metrica}>
                        <span>Predicción de Cierre:</span>
                        <strong style={estilos.valorPrincipal}>
                            ${Number(resultado.PrediccionIA || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </strong>
                    </div>

                    <div style={estilos.metrica}>
                        <span>Índice RSI:</span>
                        <span style={{ 
                            color: resultado.RSI > 70 ? '#d9534f' : resultado.RSI < 30 ? '#5cb85c' : '#f0ad4e',
                            fontWeight: 'bold' 
                        }}>
                            {Number(resultado.RSI || 0).toFixed(2)}
                        </span>
                    </div>

                    <div style={estilos.metrica}>
                        <span>Confianza (Score):</span>
                        <div style={estilos.barraFondo}>
                            <div style={{ 
                                ...estilos.barraProgreso, 
                                width: `${Math.min(Math.max((resultado.Score + 5) * 10, 0), 100)}%`,
                                backgroundColor: resultado.Score > 0 ? '#4f46e5' : '#d9534f'
                            }}></div>
                        </div>
                    </div>

                    <div style={{
                        ...estilos.badgeRecomendacion, 
                        backgroundColor: esCompra ? '#dcfce7' : '#fee2e2', 
                        color: esCompra ? '#166534' : '#991b1b',
                        border: `1px solid ${esCompra ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        {recomendacionTexto.toUpperCase()}
                    </div>
                    
                    <footer style={estilos.footer}>
                        <small>Actualizado: {new Date(resultado.FechaAnalisis).toLocaleDateString()} a las {new Date(resultado.FechaAnalisis).toLocaleTimeString()}</small>
                    </footer>
                </>
            ) : (
                <div style={estilos.centro}>
                    <p style={estilos.noData}>No existen predicciones para esta empresa. Ejecuta el análisis masivo para generar datos.</p>
                </div>
            )}
        </div>
    );
}

const estilos = {
    panel: { 
        backgroundColor: '#fff', 
        padding: '1.5rem', 
        borderRadius: '16px', 
        border: '1px solid #f0f0f0', 
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '320px'
    },
    panelVacio: {
        backgroundColor: '#f8fafc',
        padding: '1rem',
        borderRadius: '12px', // Borde más suave
        border: '2px dashed #e2e8f0',
        textAlign: 'center',
        color: '#64748b',
        height: '100%',
        minHeight: '60px', // Evita que se estire sin necesidad
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center' // Centra horizontalmente
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    titulo: { margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: '700' },
    badgeLive: { backgroundColor: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' },
    metrica: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' },
    valorPrincipal: { fontSize: '1.2rem', color: '#0f172a' },
    barraFondo: { width: '80px', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
    barraProgreso: { height: '100%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' },
    badgeRecomendacion: { marginTop: '1.5rem', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '1px' },
    footer: { marginTop: 'auto', paddingTop: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.7rem' },
    centro: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    loading: { color: '#6366f1', fontWeight: '500', animate: 'pulse' },
    noData: { color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }
};

export default ResultadoPanel;