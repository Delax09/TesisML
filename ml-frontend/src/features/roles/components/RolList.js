import React from 'react';
import { useRolesList } from '../hooks/useRoles';

function RolList() {
    const { roles, cargando } = useRolesList();

    if (cargando) return <p>Cargando roles...</p>;

    return (
        <div style={estilos.contenedor}>
            <h3>Roles del Sistema</h3>
            <div style={estilos.grid}>
                {roles.map((rol) => (
                    <div key={rol.IdRol} style={estilos.card}>
                        <span style={estilos.id}>#{rol.IdRol}</span>
                        <strong style={estilos.nombre}>{rol.NombreRol}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    grid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' },
    card: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '20px' },
    id: { fontSize: '0.7rem', color: '#adb5bd', fontWeight: 'bold' },
    nombre: { color: '#495057', fontSize: '0.9rem' }
};

export default RolList;