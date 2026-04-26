// src/features/ia_analisis/components/AnalisisPorModeloSelector.js
import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import api from '../../../services/api';
import iaService from '../../../services/iaService';

export default function AnalisisPorModeloSelector() {
    const [modelos, setModelos] = useState([]);
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [ejecutando, setEjecutando] = useState(false);

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

    const handleEjecutar = async () => {
        if (!modeloSeleccionado) return;
        try {
            setEjecutando(true);
            const res = await iaService.analizarPorModelo(modeloSeleccionado);
            alert(res.mensaje || `Análisis de predicciones iniciado para el modelo ID: ${modeloSeleccionado}`);
        } catch (error) {
            console.error("Error al ejecutar análisis por modelo", error);
            alert("Error al iniciar las predicciones");
        } finally {
            setEjecutando(false);
        }
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 2, 
            bgcolor: 'background.default', 
            p: 2, 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            width: '100%',
            maxWidth: '600px',
            mx: 'auto',
            mb: 2 // Margen inferior para separarlo del siguiente
        }}>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 'auto' }, flexGrow: 1 }}>
                <InputLabel id="select-modelo-ejecutar-label">Ejecutar Modelo Específico</InputLabel>
                <Select
                    labelId="select-modelo-ejecutar-label"
                    value={modeloSeleccionado}
                    label="Ejecutar Modelo Específico"
                    onChange={(e) => setModeloSeleccionado(e.target.value)}
                    disabled={ejecutando}
                >
                    {modelos.map((m) => (
                        <MenuItem key={m.IdModelo} value={m.IdModelo}>
                            {m.Nombre} (v{m.Version})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            
            <Button
                variant="contained"
                color="primary" // Usamos primary para mantener concordancia con la ejecución
                startIcon={ejecutando ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
                onClick={handleEjecutar}
                disabled={!modeloSeleccionado || ejecutando}
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }}
            >
                {ejecutando ? 'Ejecutando...' : 'Ejecutar Seleccionado'}
            </Button>
        </Box>
    );
}