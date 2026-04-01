// src/features/empresas/components/EmpresaTable.js
import React, { useState, useRef, useMemo, memo } from 'react';
import { 
    Box, Typography, CircularProgress, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, InputAdornment 
} from '@mui/material';
import { ChevronLeft, ChevronRight, Edit, Delete, Search } from '@mui/icons-material';

function EmpresaTable({ 
    empresas = [], 
    sectores = [], 
    cargando = false,
    onSelect = () => {}, 
    esAdmin = false, 
    onEdit, 
    onDelete 
}) {
    const [sectorSeleccionado, setSectorSeleccionado] = useState('todos'); 
    const [busqueda, setBusqueda] = useState(''); 
    const scrollRef = useRef(null);

    const empresasAMostrar = useMemo(() => {
        return empresas.filter((emp) => {
            const coincideSector = sectorSeleccionado === 'todos' || emp.IdSector === sectorSeleccionado;
            const termino = busqueda.toLowerCase().trim();
            const coincideBusqueda = 
                emp.NombreEmpresa.toLowerCase().includes(termino) || 
                emp.Ticket.toLowerCase().includes(termino);

            return coincideSector && coincideBusqueda;
        });
    }, [empresas, sectorSeleccionado, busqueda]);

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
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                        Listado de Empresas
                    </Typography>
                </Box>
                
                <TextField 
                    size="small"
                    variant="outlined"
                    placeholder="Buscar por nombre o ticker..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: { xs: '100%', sm: '250px' } }}
                />
            </Box>

            <Box 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5, 
                    mb: 2, 
                    pb: 1.5, 
                    borderBottom: '1px solid', // <-- CORRECCIÓN BORDES
                    borderColor: 'divider'     // <-- SE ADAPTA AL MODO OSCURO
                }}
            >
                {/* BOTÓN IZQUIERDO CORREGIDO */}
                <IconButton 
                    onClick={() => desplazar('izq')} 
                    size="small" 
                    sx={{ 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        bgcolor: 'background.paper', // <-- EN VEZ DE #fff
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    <ChevronLeft fontSize="small" />
                </IconButton>

                <Box 
                    ref={scrollRef} 
                    sx={{ 
                        display: 'flex', gap: 1, overflowX: 'auto', flexGrow: 1,
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } 
                    }}
                >
                    {/* CHIPS SIMPLIFICADOS PARA EVITAR FALLOS DE TEMA */}
                    <Chip
                        label="Todos los sectores"
                        onClick={() => setSectorSeleccionado('todos')}
                        color={sectorSeleccionado === 'todos' ? "primary" : "default"}
                        variant={sectorSeleccionado === 'todos' ? "filled" : "outlined"}
                        sx={{ fontWeight: 'bold' }}
                    />
                    {sectores.map((sector) => (
                        <Chip
                            key={sector.IdSector}
                            label={sector.NombreSector}
                            onClick={() => setSectorSeleccionado(sector.IdSector)}
                            color={sectorSeleccionado === sector.IdSector ? "primary" : "default"}
                            variant={sectorSeleccionado === sector.IdSector ? "filled" : "outlined"}
                            sx={{ fontWeight: 'bold' }}
                        />
                    ))}
                </Box>

                {/* BOTÓN DERECHO CORREGIDO */}
                <IconButton 
                    onClick={() => desplazar('der')} 
                    size="small" 
                    sx={{ 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        bgcolor: 'background.paper', // <-- EN VEZ DE #fff
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    <ChevronRight fontSize="small" />
                </IconButton>
            </Box>

            <TableContainer>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: esAdmin ? '20%' : '30%' }}>TICKER</TableCell>
                            <TableCell sx={{ width: esAdmin ? '35%' : '40%' }}>NOMBRE DE EMPRESA</TableCell>
                            <TableCell sx={{ width: esAdmin ? '25%' : '30%' }}>SECTOR</TableCell>
                            {esAdmin && <TableCell align="center" sx={{ width: '20%' }}>ACCIONES</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {empresasAMostrar.length > 0 ? (
                            empresasAMostrar.map((emp) => (
                                <TableRow 
                                    key={emp.IdEmpresa} 
                                    hover
                                    onClick={() => onSelect(emp.IdEmpresa, emp.NombreEmpresa)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell sx={{ fontWeight: '800', color: 'primary.main' }}>{emp.Ticket}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{emp.NombreEmpresa}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={emp.NombreSector} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold', fontSize: '0.75rem', borderColor: 'transparent', bgcolor: 'action.hover' }} 
                                        />
                                    </TableCell>
                                    {esAdmin && (
                                        <TableCell align="center">
                                            <Tooltip title="Editar">
                                                <IconButton 
                                                    onClick={(e) => { e.stopPropagation(); onEdit(emp); }} 
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar">
                                                <IconButton 
                                                    onClick={(e) => { e.stopPropagation(); onDelete(emp.IdEmpresa); }} 
                                                    size="small"
                                                    color="error"
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
                                <TableCell colSpan={esAdmin ? 4 : 3} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                                    {busqueda 
                                        ? `No se encontraron resultados para "${busqueda}"` 
                                        : 'No hay empresas en la categoría seleccionada.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default memo(EmpresaTable);