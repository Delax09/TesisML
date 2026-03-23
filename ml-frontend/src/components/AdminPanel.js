// src/components/AdminPanel.js
import React, { useState } from 'react';
import adminService from '../services/adminService';
import iaService from '../services/iaService'; 

function AdminPanel() {
    const [cargando, setCargando] = useState(false);

    const ejecutarTarea = async (nombreTarea, funcion) => {
        if (!window.confirm(`¿Seguro que deseas ${nombreTarea}?`)) return;
        setCargando(true);
        try {
            const response = await funcion();
            alert(response.message);
        } catch (e) {
            alert(`Error al ejecutar la tarea: ${nombreTarea}`);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={estilos.panel}>
            <h3>Mantenimiento del Sistema</h3>
            <div style={estilos.grid}>
                <button 
                    style={estilos.botonImportar}
                    onClick={() => ejecutarTarea("importar tickers", adminService.importarTickers)}
                    disabled={cargando}
                >
                    📥 Cargar Tickers (CSV)
                </button>
                <button 
                    style={estilos.botonPrecios}
                    onClick={() => ejecutarTarea("actualizar precios", adminService.actualizarPrecios)}
                    disabled={cargando}
                >
                    📈 Actualizar Precios (Yahoo Finance)
                </button>
                
                {/* NUEVO BOTÓN DE ENTRENAMIENTO */}
                <button 
                    style={estilos.botonEntrenar}
                    onClick={() => ejecutarTarea("ENTRENAR la IA (Esto consumirá recursos y tomará varios minutos)", iaService.entrenarLSTM)}
                    disabled={cargando}
                >
                    🧠 Entrenar Modelo IA
                </button>
            </div>
            {cargando && <p style={estilos.aviso}>Procesando... no cierres la ventana.</p>}
        </div>
    );
}

const estilos = {
    panel: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #e0e0e0', marginBottom: '2rem' },
    grid: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    botonImportar: { backgroundColor: '#34495e', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    botonPrecios: { backgroundColor: '#27ae60', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    // Estilo para el nuevo botón (morado para diferenciarlo)
    botonEntrenar: { backgroundColor: '#8e44ad', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }, 
    aviso: { color: '#e67e22', fontWeight: 'bold', marginTop: '10px' }
};

export default AdminPanel;