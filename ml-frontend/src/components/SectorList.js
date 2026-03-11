// src/components/SectorList.js
import React, { useState, useEffect } from 'react';
import { sectorService } from '../services/sectorService';

function SectorList() {
    const [sectores, setSectores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await sectorService.getAll();
                setSectores(data);
                setCargando(false);
            } catch (err) {
                setError("No se pudo conectar con el servidor de Sectores");
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    if (cargando) return <p>Cargando sectores...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div style={estilos.contenedor}>
            <h3>Sectores Disponibles</h3>
            <table style={estilos.tabla}>
                <thead>
                    <tr style={estilos.filaEncabezado}>
                        <th>ID</th>
                        <th>Nombre del Sector</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {sectores.map((sector) => (
                        <tr key={sector.IdSector} style={estilos.fila}>
                            <td>{sector.IdSector}</td>
                            <td>{sector.NombreSector}</td>
                            <td>
                                <span style={sector.Activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                                    {sector.Activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const estilos = {
    contenedor: { marginTop: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    tabla: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    filaEncabezado: { borderBottom: '2px solid #eee', color: '#666' },
    fila: { borderBottom: '1px solid #eee' },
    badgeActivo: { backgroundColor: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' },
    badgeInactivo: { backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }
};

export default SectorList;