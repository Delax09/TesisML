// src/pages/Admin/Modelos/AdminModelos.js
import React, { useState, useEffect } from 'react';
import { Box, Paper, Switch, Table, TableBody, TableCell, TableHead, TableRow, Chip } from '@mui/material';
import api from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import SmartToyIcon from '@mui/icons-material/SmartToy';

export default function AdminModelos() {
    const [modelos, setModelos] = useState([]);

    useEffect(() => {
        cargarModelos();
    }, []);

    const cargarModelos = async () => {
        try {
            // ✅ CORRECTO: sin /api/v1
            const res = await api.get('/modelos-ia');
            setModelos(res.data);
        } catch (error) {
            console.error("Error al cargar modelos", error);
        }
    };

    const toggleActivo = async (idModelo, estadoActual) => {
        try {
            // ✅ CORRECTO: sin /api/v1
            await api.patch(`/modelos-ia/${idModelo}`, { Activo: !estadoActual });
            cargarModelos(); 
        } catch (error) {
            console.error("Error al cambiar estado", error);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 4 }, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                titulo="Gestión de Modelos IA"
                subtitulo="Administra los modelos de predicción visibles para los usuarios finales en sus paneles."
                icono={SmartToyIcon} 
            />
            
            <Paper sx={{ mt: { xs: 2, sm: 4 }, p: { xs: 2, sm: 3 }, py: { xs: 2, sm: 4 }, width: '100%', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                
                <Table >
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Versión</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado (Visible)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {modelos.map((modelo) => (
                            <TableRow key={modelo.IdModelo} hover>
                                <TableCell>{modelo.IdModelo}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{modelo.Nombre}</TableCell>
                                <TableCell><Chip label={modelo.Version} size="small" variant="outlined" /></TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                    {modelo.Descripcion || 'Sin descripción'}
                                </TableCell>
                                <TableCell align="center">
                                    <Switch 
                                        checked={modelo.Activo} 
                                        onChange={() => toggleActivo(modelo.IdModelo, modelo.Activo)} 
                                        color="success"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}