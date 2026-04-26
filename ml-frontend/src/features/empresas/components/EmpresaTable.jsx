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
                        Detalle de empresas analizadas
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
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <IconButton 
                    onClick={() => desplazar('izq')} 
                    size="small" 
                    sx={{ 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        bgcolor: 'background.paper',
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

                <IconButton 
                    onClick={() => desplazar('der')} 
                    size="small" 
                    sx={{ 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    <ChevronRight fontSize="small" />
                </IconButton>
            </Box>

            <TableContainer sx={{ width: '100%', overflowX: 'hidden' }}>
                <Table size="medium" sx={{ width: '100%', tableLayout: 'fixed' }}> 
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: esAdmin ? '20%' : '25%', px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>TICKER</TableCell>
                            <TableCell sx={{ width: esAdmin ? '40%' : '45%', px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>NOMBRE</TableCell>
                            <TableCell sx={{ width: esAdmin ? '20%' : '30%', px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>SECTOR</TableCell>
                            {esAdmin && <TableCell align="center" sx={{ width: '20%', px: { xs: 0.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>ACCIONES</TableCell>}
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
                                    <TableCell sx={{ 
                                        fontWeight: '800', 
                                        color: 'primary.main', 
                                        px: { xs: 1, sm: 2 }, 
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                        wordBreak: 'break-all'
                                    }}>
                                        {emp.Ticket}
                                    </TableCell>
                                    
                                    <TableCell sx={{ 
                                        color: 'text.secondary', 
                                        px: { xs: 1, sm: 2 }, 
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                        wordBreak: 'break-word'
                                    }}>
                                        {emp.NombreEmpresa}
                                    </TableCell>

                                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                                        <Chip 
                                            label={emp.NombreSector} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ 
                                                fontWeight: 'bold', 
                                                fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                                                borderColor: 'transparent', 
                                                bgcolor: 'action.hover',
                                                height: 'auto', 
                                                py: 0.5,
                                                '& .MuiChip-label': {
                                                    whiteSpace: 'normal', 
                                                    display: 'block',
                                                    textAlign: 'center',
                                                    px: 1 
                                                }
                                            }} 
                                        />
                                    </TableCell>
                                    {esAdmin && (
                                        <TableCell align="center" sx={{ px: { xs: 0, sm: 2 } }}>
                                            <Tooltip title="Editar">
                                                <IconButton onClick={(e) => { e.stopPropagation(); onEdit(emp); }} size="small" color="primary">
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar">
                                                <IconButton onClick={(e) => { e.stopPropagation(); onDelete(emp.IdEmpresa); }} size="small" color="error">
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