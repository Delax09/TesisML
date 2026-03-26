// src/components/EmpresaTable.js
import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, CircularProgress, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, InputAdornment 
} from '@mui/material';
import { ChevronLeft, ChevronRight, Edit, Delete, Search } from '@mui/icons-material';
import { empresaService } from 'services'; 

function EmpresaTable({ onSelect = () => {}, esAdmin = false, onEdit, onDelete }) {
    const [empresas, setEmpresas] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [sectorSeleccionado, setSectorSeleccionado] = useState('todos'); 
    const [busqueda, setBusqueda] = useState(''); // NUEVO ESTADO: Texto de búsqueda
    const [cargando, setCargando] = useState(true);

    // Referencia para controlar el scroll de la barra de sectores
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

    // NUEVA LÓGICA DE FILTRADO COMBINADA (Sector + Búsqueda de Texto)
    const empresasAMostrar = empresas.filter((emp) => {
        // 1. Filtro por sector
        const coincideSector = sectorSeleccionado === 'todos' || emp.IdSector === sectorSeleccionado;
        
        // 2. Filtro por búsqueda (Nombre o Ticker)
        const termino = busqueda.toLowerCase().trim();
        const coincideBusqueda = 
            emp.NombreEmpresa.toLowerCase().includes(termino) || 
            emp.Ticket.toLowerCase().includes(termino);

        // Ambas condiciones deben cumplirse
        return coincideSector && coincideBusqueda;
    });

    // Función para desplazar la barra lateralmente
    const desplazar = (direccion) => {
        if (scrollRef.current) {
            const cantidad = direccion === 'izq' ? -250 : 250;
            scrollRef.current.scrollBy({ left: cantidad, behavior: 'smooth' });
        }
    };

    if (cargando) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" p={4} gap={2}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Cargando listado del mercado...</Typography>
            </Box>
        );
    }

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 3, 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
                width: '100%', 
                bgcolor: 'background.paper' 
            }}
        >
            {/* Cabecera con Buscador */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="#1f2937" gutterBottom>
                        Listado de Empresas
                    </Typography>
                </Box>
                
                {/* CAMPO DE BÚSQUEDA */}
                <TextField 
                    size="small"
                    variant="outlined"
                    placeholder="Buscar por nombre o ticker..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ 
                        minWidth: { xs: '100%', sm: '250px' },
                        bgcolor: '#f8fafc',
                        borderRadius: '8px',
                        '& fieldset': { borderRadius: '8px' }
                    }}
                />
            </Box>

            {/* Contenedor del Carrusel con Flechas */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5, 
                    mb: 2, 
                    pb: 1.5, 
                    borderBottom: '1px solid #e2e8f0' 
                }}
            >
                {/* Botón Izquierda */}
                <IconButton 
                    onClick={() => desplazar('izq')} 
                    size="small" 
                    sx={{ border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', bgcolor: '#fff' }}
                    title="Desplazar a la izquierda"
                >
                    <ChevronLeft fontSize="small" />
                </IconButton>

                {/* BARRA DE FILTROS POR SECTOR */}
                <Box 
                    ref={scrollRef} 
                    sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        overflowX: 'auto', 
                        flexGrow: 1,
                        scrollbarWidth: 'none', 
                        '&::-webkit-scrollbar': { display: 'none' } 
                    }}
                >
                    <Chip
                        label="Todos los sectores"
                        onClick={() => setSectorSeleccionado('todos')}
                        sx={{
                            fontWeight: '600',
                            bgcolor: sectorSeleccionado === 'todos' ? '#4f46e5' : '#f8fafc',
                            color: sectorSeleccionado === 'todos' ? 'white' : '#475569',
                            border: `1px solid ${sectorSeleccionado === 'todos' ? '#4338ca' : '#e2e8f0'}`,
                            '&:hover': { bgcolor: sectorSeleccionado === 'todos' ? '#4338ca' : '#f1f5f9' }
                        }}
                    />

                    {sectores.map((sector) => (
                        <Chip
                            key={sector.IdSector}
                            label={sector.NombreSector}
                            onClick={() => setSectorSeleccionado(sector.IdSector)}
                            sx={{
                                fontWeight: '600',
                                bgcolor: sectorSeleccionado === sector.IdSector ? '#4f46e5' : '#f8fafc',
                                color: sectorSeleccionado === sector.IdSector ? 'white' : '#475569',
                                border: `1px solid ${sectorSeleccionado === sector.IdSector ? '#4338ca' : '#e2e8f0'}`,
                                '&:hover': { bgcolor: sectorSeleccionado === sector.IdSector ? '#4338ca' : '#f1f5f9' }
                            }}
                        />
                    ))}
                </Box>

                {/* Botón Derecha */}
                <IconButton 
                    onClick={() => desplazar('der')} 
                    size="small" 
                    sx={{ border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', bgcolor: '#fff' }}
                    title="Desplazar a la derecha"
                >
                    <ChevronRight fontSize="small" />
                </IconButton>
            </Box>

            {/* TABLA DE RESULTADOS */}
            <TableContainer>
                <Table size="medium">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: '600', color: '#64748b', width: esAdmin ? '20%' : '30%' }}>TICKER</TableCell>
                            <TableCell sx={{ fontWeight: '600', color: '#64748b', width: esAdmin ? '35%' : '40%' }}>NOMBRE DE EMPRESA</TableCell>
                            <TableCell sx={{ fontWeight: '600', color: '#64748b', width: esAdmin ? '25%' : '30%' }}>SECTOR</TableCell>
                            {esAdmin && <TableCell align="center" sx={{ fontWeight: '600', color: '#64748b', width: '20%' }}>ACCIONES</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {empresasAMostrar.length > 0 ? (
                            empresasAMostrar.map((emp) => (
                                <TableRow 
                                    key={emp.IdEmpresa} 
                                    hover
                                    onClick={() => onSelect(emp.IdEmpresa, emp.NombreEmpresa)}
                                    sx={{ 
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#f0fdf4 !important' } 
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: '800', color: '#0f172a' }}>{emp.Ticket}</TableCell>
                                    <TableCell sx={{ color: '#334155' }}>{emp.NombreEmpresa}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={emp.NombreSector} 
                                            size="small" 
                                            sx={{ bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 'bold', fontSize: '0.75rem' }} 
                                        />
                                    </TableCell>
                                    {esAdmin && (
                                        <TableCell align="center">
                                            <Tooltip title="Editar">
                                                <IconButton 
                                                    onClick={(e) => { e.stopPropagation(); onEdit(emp); }} 
                                                    size="small"
                                                    sx={{ color: '#64748b', '&:hover': { color: '#1976d2' } }}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar">
                                                <IconButton 
                                                    onClick={(e) => { e.stopPropagation(); onDelete(emp.IdEmpresa); }} 
                                                    size="small"
                                                    sx={{ color: '#64748b', '&:hover': { color: '#d32f2f' } }}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={esAdmin ? 4 : 3} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                                    {busqueda 
                                        ? `No se encontraron resultados para "${busqueda}"` 
                                        : 'No hay empresas en la categoría seleccionada.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default EmpresaTable;