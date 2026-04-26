import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, CircularProgress } from '@mui/material';
import TarjetaProyeccion from './TarjetaProyeccion';
import GraficoComparativo from './GraficoComparativo';
import { useProyeccionesIA } from 'features/portafolio/hooks/useProyeccionesIA';

const ComparadorEmpresas = ({ modelosActivos, usuarioId }) => {
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [sectorSeleccionado, setSectorSeleccionado] = useState('');
    const [empresasComparar, setEmpresasComparar] = useState([]);

    // Autoseleccionar modelo por defecto
    useEffect(() => {
        if (!modeloSeleccionado && modelosActivos?.length > 0) {
            setModeloSeleccionado(modelosActivos[0].IdModelo);
        }
    }, [modelosActivos, modeloSeleccionado]);

    // Hook original extraído aquí adentro
    const { proyecciones, sectores, cargando: cargandoProyecciones, error } = useProyeccionesIA(usuarioId, modeloSeleccionado);

    if (cargandoProyecciones) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    }
    if (error) return <Typography color="error" textAlign="center">{error}</Typography>;

    const proyeccionesFiltradas = proyecciones.filter(p => 
        sectorSeleccionado === '' || p.sector === sectorSeleccionado
    );
    const datosAComparar = proyecciones.filter(p => empresasComparar.includes(p.simbolo));

    const handleToggleComparar = (simbolo) => {
        setEmpresasComparar(prev => 
            prev.includes(simbolo) ? prev.filter(s => s !== simbolo) : [...prev, simbolo]
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ width: { xs: '100%', sm: 250 } }} size="small">
                    <InputLabel>Modelo Predictivo</InputLabel>
                    <Select value={modeloSeleccionado} label="Modelo Predictivo" onChange={(e) => setModeloSeleccionado(e.target.value)}>
                        {modelosActivos.map(m => <MenuItem key={m.IdModelo} value={m.IdModelo}>{m.Nombre}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl sx={{ width: { xs: '100%', sm: 250 } }} size="small">
                    <InputLabel>Filtrar por Sector</InputLabel>
                    <Select value={sectorSeleccionado} label="Filtrar por Sector" onChange={(e) => setSectorSeleccionado(e.target.value)}>
                        <MenuItem value=""><em>Todos los sectores</em></MenuItem>
                        {sectores.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {empresasComparar.length >= 2 && (
                <Paper sx={{ p: { xs: 2, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                        Comparativa ({empresasComparar.join(' vs ')})
                    </Typography>
                    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                        <GraficoComparativo datos={datosAComparar} />
                    </Box>
                </Paper>
            )}

            {proyecciones.length === 0 && (
                <Typography textAlign="center" color="text.secondary">No se encontraron empresas activas.</Typography>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 3 }}>
                {proyeccionesFiltradas.map((empresaData, index) => (
                    <TarjetaProyeccion 
                        key={index} 
                        datos={empresaData} 
                        seleccionado={empresasComparar.includes(empresaData.simbolo)}
                        onToggle={() => handleToggleComparar(empresaData.simbolo)}
                    />
                ))}
            </Box>
        </Box>
    );
};

export default ComparadorEmpresas;