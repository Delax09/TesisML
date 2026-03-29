// ml-frontend/src/components/EntrenamientoSelector.js
import React, { useState, useEffect } from 'react';
import { iaService } from 'services';

function EntrenamientoSelector() {
    const [modelos, setModelos] = useState([]);
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [entrenando, setEntrenando] = useState(false);

    // Cargar los modelos al iniciar el componente
    useEffect(() => {
        const fetchModelos = async () => {
            try {
                const data = await iaService.obtenerModelosActivos();
                setModelos(data);
                if (data.length > 0) {
                    setModeloSeleccionado(data[0].IdModelo); // Selecciona el primero por defecto
                }
            } catch (error) {
                console.error("Error al cargar modelos", error);
            }
        };
        fetchModelos();
    }, []);

    const manejarEntrenamiento = async () => {
        if (!modeloSeleccionado) return;
        
        const modeloInfo = modelos.find(m => m.IdModelo === parseInt(modeloSeleccionado));
        const confirmar = window.confirm(`¿Iniciar entrenamiento solo para: ${modeloInfo.Nombre}?`);
        if (!confirmar) return;

        setEntrenando(true);
        try {
            const response = await iaService.entrenarModelo(modeloSeleccionado);
            alert(response.message || "Entrenamiento iniciado en segundo plano.");
        } catch (error) {
            console.error(error);
            alert("Error al intentar entrenar el modelo.");
        } finally {
            setEntrenando(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px', color: '#334155' }}>Seleccionar IA:</label>
                <select 
                    value={modeloSeleccionado} 
                    onChange={(e) => setModeloSeleccionado(e.target.value)}
                    disabled={entrenando}
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
                onClick={manejarEntrenamiento}
                disabled={entrenando || modelos.length === 0}
                style={{
                    backgroundColor: entrenando ? '#94a3b8' : '#8b5cf6', // Color morado IA
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: entrenando ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                }}
            >
                {entrenando ? '⏳ Entrenando...' : '🧠 Entrenar Seleccionado'}
            </button>
        </div>
    );
}

export default EntrenamientoSelector;