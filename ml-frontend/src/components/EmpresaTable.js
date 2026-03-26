// src/components/EmpresaTable.js
import React, { useState, useEffect, useRef } from 'react';
import { empresaService } from 'services'; 

function EmpresaTable({ onSelect = () => {}, esAdmin = false, onEdit, onDelete }) {
    const [empresas, setEmpresas] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [sectorSeleccionado, setSectorSeleccionado] = useState('todos'); 
    const [cargando, setCargando] = useState(true);

    // 1. NUEVO: Referencia para controlar el scroll de la barra de sectores
    const scrollRef = useRef(null);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await empresaService.obtenerEmpresasConSectores();
                setEmpresas(data.empresas);
                setSectores(data.sectores);
            } catch (error) {
                console.error("Error cargando tabla de empresas:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    const empresasAMostrar = sectorSeleccionado === 'todos'
        ? empresas
        : empresas.filter((emp) => emp.IdSector === sectorSeleccionado);

    // 2. NUEVO: Función para desplazar la barra lateralmente
    const desplazar = (direccion) => {
        if (scrollRef.current) {
            // Se mueve 250 pixeles hacia la izq o der
            const cantidad = direccion === 'izq' ? -250 : 250;
            scrollRef.current.scrollBy({ left: cantidad, behavior: 'smooth' });
        }
    };

    if (cargando) return <p style={{padding: '2rem', textAlign: 'center'}}>Cargando listado del mercado...</p>;

    return (
        <div style={estilos.contenedor}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap'}}>
                <div>
                    <h3 style={{margin: '0 0 5px 0', color: '#1f2937'}}>Listado de Empresas Activas</h3>
                    <p style={{margin: 0, fontSize: '0.85rem', color: '#6b7280'}}>
                        {esAdmin ? "* Gestión administrativa de activos." : "* Haz clic en una fila para ver su análisis gráfico."}
                    </p>
                </div>
            </div>

            {/* 3. NUEVO: Contenedor del Carrusel con Flechas */}
            <div style={estilos.carruselContenedor}>
                
                {/* Botón Izquierda */}
                <button 
                    onClick={() => desplazar('izq')} 
                    style={estilos.botonScroll}
                    title="Desplazar a la izquierda"
                >
                    &#10094;
                </button>

                {/* BARRA DE FILTROS POR SECTOR (Ahora controlada por scrollRef) */}
                <div ref={scrollRef} style={estilos.barraSectores}>
                    <button
                        onClick={() => setSectorSeleccionado('todos')}
                        style={{
                            ...estilos.botonSector,
                            backgroundColor: sectorSeleccionado === 'todos' ? '#4f46e5' : '#f8fafc',
                            color: sectorSeleccionado === 'todos' ? 'white' : '#475569',
                            borderColor: sectorSeleccionado === 'todos' ? '#4338ca' : '#e2e8f0',
                        }}
                    >
                        Todos los sectores
                    </button>

                    {sectores.map((sector) => (
                        <button
                            key={sector.IdSector}
                            onClick={() => setSectorSeleccionado(sector.IdSector)}
                            style={{
                                ...estilos.botonSector,
                                backgroundColor: sectorSeleccionado === sector.IdSector ? '#4f46e5' : '#f8fafc',
                                color: sectorSeleccionado === sector.IdSector ? 'white' : '#475569',
                                borderColor: sectorSeleccionado === sector.IdSector ? '#4338ca' : '#e2e8f0',
                            }}
                        >
                            {sector.NombreSector}
                        </button>
                    ))}
                </div>

                {/* Botón Derecha */}
                <button 
                    onClick={() => desplazar('der')} 
                    style={estilos.botonScroll}
                    title="Desplazar a la derecha"
                >
                    &#10095;
                </button>

            </div>

            {/* TABLA DE RESULTADOS */}
            <div style={{overflowX: 'auto'}}>
                <table style={estilos.tabla}>
                    <thead>
                        <tr style={estilos.header}>
                            {/* Ajustamos los porcentajes dinámicamente para que siempre sumen 100% */}
                            <th style={{ ...estilos.th, width: esAdmin ? '20%' : '30%' }}>Ticker</th>
                            <th style={{ ...estilos.th, width: esAdmin ? '35%' : '40%' }}>Nombre de Empresa</th>
                            <th style={{ ...estilos.th, width: esAdmin ? '25%' : '30%' }}>Sector</th>
                            
                            {/* La columna de acciones ocupa el 20% restante */}
                            {esAdmin && <th style={{ ...estilos.th, width: '20%', textAlign: 'center' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {empresasAMostrar.length > 0 ? (
                            empresasAMostrar.map((emp) => (
                                <tr 
                                    key={emp.IdEmpresa} 
                                    style={estilos.fila}
                                    onClick={() => onSelect(emp.IdEmpresa, emp.NombreEmpresa)}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{...estilos.td, ...estilos.ticker}}>{emp.Ticket}</td>
                                    <td style={estilos.td}>{emp.NombreEmpresa}</td>
                                    <td style={estilos.td}>
                                        <span style={estilos.sectorBadge}>{emp.NombreSector}</span>
                                    </td>
                                    {/* 3. Celdas condicionales para Admin */}
                                    {esAdmin && (
                                        <td style={{...estilos.td, textAlign: 'center'}}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEdit(emp); }} 
                                                style={estilos.btnAccionEdit}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(emp.IdEmpresa); }} 
                                                style={estilos.btnAccionDelete}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{textAlign: 'center', padding: '2rem', color: '#94a3b8'}}>
                                    No hay empresas en la categoría seleccionada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', boxSizing: 'border-box' },
    
    // NUEVOS ESTILOS PARA EL CARRUSEL
    carruselContenedor: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' },
    barraSectores: { display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', flexGrow: 1 },
    botonScroll: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: '#475569', flexShrink: 0, transition: '0.2s', padding: 0 },
    
    botonSector: { padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', transition: '0.2s', fontSize: '0.85rem', border: '1px solid transparent' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    header: { textAlign: 'left', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' },
    th: { padding: '12px 15px', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' },
    td: { padding: '12px 15px', fontSize: '0.95rem', color: '#334155' },
    fila: { borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s ease' }, 
    ticker: { fontWeight: '800', color: '#0f172a' },
    sectorBadge: { backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },

    btnAccionEdit: { background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px', fontSize: '1.1rem' },
    btnAccionDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }
};

export default EmpresaTable;