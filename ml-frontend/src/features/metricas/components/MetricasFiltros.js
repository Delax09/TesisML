import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography } from '@mui/material';

const MetricasFiltros = ({ filtroModelo, setFiltroModelo, filtroDias, setFiltroDias }) => {
    return (
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Filtrar Historial
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                <FormControl sx={{ minWidth: 220 }} size="small">
                    <InputLabel id="filtro-modelo-label">Modelo IA</InputLabel>
                    <Select
                        labelId="filtro-modelo-label"
                        value={filtroModelo}
                        label="Modelo IA"
                        onChange={(e) => setFiltroModelo(e.target.value)}
                    >
                        <MenuItem value="">Todos los Modelos</MenuItem>
                        <MenuItem value="1">LSTM Clásico</MenuItem>
                        <MenuItem value="2">LSTM Bidireccional</MenuItem>
                        <MenuItem value="3">CNN</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 220 }} size="small">
                    <InputLabel id="filtro-dias-label">Horizonte (Días Futuro)</InputLabel>
                    <Select
                        labelId="filtro-dias-label"
                        value={filtroDias}
                        label="Horizonte (Días Futuro)"
                        onChange={(e) => setFiltroDias(e.target.value)}
                    >
                        <MenuItem value="">Todos los horizontes</MenuItem>
                        <MenuItem value="1">1 Día Futuro</MenuItem>
                        <MenuItem value="5">5 Días Futuro</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Paper>
    );
};

export default MetricasFiltros;