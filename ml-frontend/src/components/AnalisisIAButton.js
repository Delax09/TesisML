import React, { useState } from 'react';
import iaService from '../services/iaService';

function AnalisisIAButton({ empresaId, onComplete }) {
    const [ejecutando, setEjecutando] = useState(false);

    const manejarEjecucionIA = async () => {
        if (!empresaId) return alert("Selecciona una empresa");
        setEjecutando(true);
        try {
            await iaService.analizar(empresaId);
            alert("¡Análisis completado!");
            if (onComplete) onComplete(); 
        } catch (error) {
            alert("Error al ejecutar IA");
        } finally {
            setEjecutando(false);
        }
    };

    return (
        <button 
            onClick={manejarEjecucionIA}
            disabled={ejecutando}
            style={{
                backgroundColor: ejecutando ? '#ccc' : '#6366f1',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: ejecutando ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)'
            }}
        >
            {ejecutando ? '🧠 Procesando...' : '🚀 Ejecutar Análisis IA'}
        </button>
    );
}

export default AnalisisIAButton;