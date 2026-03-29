// src/features/ia_analisis/components/EntrenamientoSelector.js
import React from 'react';
import { useEntrenamientoIA } from '../hooks/useEntrenamientoIA';

export default function EntrenamientoSelector() {
    const { modelos, modeloSeleccionado, setModeloSeleccionado, entrenando, manejarEntrenamiento } = useEntrenamientoIA();

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px', color: '#334155' }}>Seleccionar IA:</label>
                <select 
                    value={modeloSeleccionado} onChange={(e) => setModeloSeleccionado(e.target.value)} disabled={entrenando}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                    {modelos.map((modelo) => (
                        <option key={modelo.IdModelo} value={modelo.IdModelo}>
                            {modelo.Nombre} (v{modelo.Version})
                        </option>
                    ))}
                </select>
            </div>
            <button 
                onClick={manejarEntrenamiento} disabled={entrenando || modelos.length === 0}
                style={{
                    backgroundColor: entrenando ? '#94a3b8' : '#8b5cf6', color: 'white', padding: '8px 16px', border: 'none',
                    borderRadius: '6px', fontWeight: 'bold', cursor: entrenando ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease'
                }}
            >
                {entrenando ? '⏳ Entrenando...' : '🧠 Entrenar Seleccionado'}
            </button>
        </div>
    );
}