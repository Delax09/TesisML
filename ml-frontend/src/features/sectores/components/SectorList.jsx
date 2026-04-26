// src/features/sectores/components/SectorList.js
import React from 'react';
import { useSectoresList } from '../hooks/useSectores';
import { 
    Box, Paper, Typography, CircularProgress, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip 
} from '@mui/material';

function SectorList() {
    const { sectores, cargando, error } = useSectoresList();

    if (cargando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
    }

    return (
        <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
                Sectores Disponibles
            </Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>Nombre del Sector</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Estado</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sectores.map((sector) => (
                            <TableRow key={sector.IdSector} hover>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                    #{sector.IdSector}
                                </TableCell>
                                <TableCell>{sector.NombreSector}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={sector.Activo ? 'Activo' : 'Inactivo'} 
                                        size="small"
                                        color={sector.Activo ? 'success' : 'error'}
                                        variant={sector.Activo ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default SectorList;