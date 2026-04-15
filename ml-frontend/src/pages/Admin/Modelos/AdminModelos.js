// src/pages/Admin/Modelos/AdminModelos.js
import React, { useState, useEffect } from 'react';
import { Box, Paper, Switch, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import api from '../../../services/api';
import iaService from '../../../services/iaService'; // Importamos el servicio actualizado
import PageHeader from '../../../components/PageHeader';
import SmartToyIcon from '@mui/icons-material/SmartToy';

export default function AdminModelos() {
    const [modelos, setModelos] = useState([]);
    const [ejecutando, setEjecutando] = useState(null); // Estado para controlar el loading del botón

    useEffect(() => {
        cargarModelos();
    }, []);

    const cargarModelos = async () => {
        try {
            const res = await api.get('/modelos-ia');
            setModelos(res.data);
        } catch (error) {
            console.error("Error al cargar modelos", error);
        }
    };

    const toggleActivo = async (idModelo, estadoActual) => {
        try {
            await api.patch(`/modelos-ia/${idModelo}`, { Activo: !estadoActual });
            cargarModelos(); 
        } catch (error) {
            console.error("Error al cambiar estado", error);
        }
    };

    // Nueva función para ejecutar el modelo
    const handleEjecutarModelo = async (idModelo) => {
        try {
            setEjecutando(idModelo);
            const res = await iaService.analizarPorModelo(idModelo);
            alert(res.mensaje || `Análisis iniciado para el modelo ${idModelo}`); 
            // Nota: Puedes cambiar este alert() por tu sistema de notificaciones (ej. react-toastify o Snackbar)
        } catch (error) {
            console.error("Error al ejecutar modelo", error);
            alert("Error al iniciar el análisis");
        } finally {
            setEjecutando(null);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 4 }, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                titulo="Gestión de Modelos IA"
                subtitulo="Administra los modelos de predicción visibles para los usuarios finales en sus paneles."
                icono={SmartToyIcon} 
            />
            
            <Paper sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
                
                <Table >
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Versión</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado (Visible)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
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
                                <TableCell align="center">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        startIcon={ejecutando === modelo.IdModelo ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                                        onClick={() => handleEjecutarModelo(modelo.IdModelo)}
                                        disabled={ejecutando === modelo.IdModelo}
                                    >
                                        Ejecutar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}