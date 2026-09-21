// src/features/empresas/components/EmpresaTable.jsx
import React, { useState, useRef, useMemo, memo } from 'react';
import { 
    Box, Typography, CircularProgress, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, InputAdornment, Button, TablePagination 
} from '@mui/material';
import { ChevronLeft, ChevronRight, Edit, Delete, Search, FilterAltOff } from '@mui/icons-material';

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
    
    // Caso de Uso N°48: Estado para la paginación
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    
    const scrollRef = useRef(null);

    // Caso de Uso N°14: Función centralizada para limpiar todos los filtros
    const reiniciarFiltros = () => {
        setBusqueda('');
        setSectorSeleccionado('todos');
        setPage(0); // Reiniciar a la primera página
    };

    const handleBusquedaChange = (e) => {
        setBusqueda(e.target.value);
        setPage(0); // Reiniciar a la primera página al buscar
    };

    const handleSectorChange = (sectorId) => {
        setSectorSeleccionado(sectorId);
        setPage(0); // Reiniciar a la primera página al filtrar por sector
    };

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

    // Caso de Uso N°48: Calcular las empresas específicas de la página actual
    const empresasPaginadas = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return empresasAMostrar.slice(startIndex, startIndex + rowsPerPage);
    }, [empresasAMostrar, page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

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

    // Lógica UX: El botón de limpiar se deshabilita si no hay filtros aplicados
    const hayFiltrosAplicados = busqueda !== '' || sectorSeleccionado !== 'todos';

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                        Detalle de empresas analizadas
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField 
                        size="small"
                        variant="outlined"
                        placeholder="Buscar por nombre o ticker..."
                        value={busqueda}
                        onChange={handleBusquedaChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: { xs: '100%', sm: '250px' } }}
                    />
                    
                    {/* Botón Caso de Uso N°14 */}
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={reiniciarFiltros}
                        startIcon={<FilterAltOff />}
                        disabled={!hayFiltrosAplicados}
                        size="small"
                        sx={{ height: '40px' }}
                    >
                        Limpiar
                    </Button>
                </Box>
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
                        onClick={() => handleSectorChange('todos')}
                        color={sectorSeleccionado === 'todos' ? "primary" : "default"}
                        variant={sectorSeleccionado === 'todos' ? "filled" : "outlined"}
                        sx={{ fontWeight: 'bold' }}
                    />
                    {sectores.map((sector) => (
                        <Chip
                            key={sector.IdSector}
                            label={sector.NombreSector}
                            onClick={() => handleSectorChange(sector.IdSector)}
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
                        {empresasPaginadas.length > 0 ? (
                            empresasPaginadas.map((emp) => (
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
                                    {busqueda || sectorSeleccionado !== 'todos'
                                        ? `No se encontraron resultados para los filtros aplicados.` 
                                        : 'No hay empresas en la categoría seleccionada.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Caso de Uso N°48: Controles de paginación */}
            {empresasAMostrar.length > 0 && (
                <TablePagination
                    rowsPerPageOptions={[5, 10, 15, 25, 50]}
                    component="div"
                    count={empresasAMostrar.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Empresas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    sx={{
                        borderTop: '1px solid',
                        borderColor: 'divider'
                    }}
                />
            )}
        </Box>
    );
}

export default memo(EmpresaTable);