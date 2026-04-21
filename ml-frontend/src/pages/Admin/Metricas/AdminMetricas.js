import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { PageHeader } from 'components';
import { useMetricas, MetricasFiltros, MetricasTable } from 'features';


import DataSaverOnIcon from '@mui/icons-material/DataSaverOn';

const AdminMetricas = () => {
    // 1. Extraemos lógica y datos desde el custom Hook
    const { metricas, loading, error } = useMetricas();

    // 2. Estados locales para los filtros
    const [filtroModelo, setFiltroModelo] = useState("");
    const [filtroDias, setFiltroDias] = useState("");

    // 3. Aplicar filtros sobre la data ya traída
    const metricasFiltradas = metricas.filter(metrica => {
        const matchModelo = filtroModelo === "" || metrica.IdModelo.toString() === filtroModelo;
        const matchDias = filtroDias === "" || metrica.DiasFuturo.toString() === filtroDias;
        return matchModelo && matchDias;
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 4 }, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                title="Métricas de Modelos IA" 
                subtitulo="Administra los modelos de predicción visibles para los usuarios finales en sus paneles."
                icono={DataSaverOnIcon} 
            />

            {/* Manejo de error si la API falla */}
            {error && (
                <Typography color="error.main" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {error}
                </Typography>
            )}
            
            <Paper sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>


                {/* Panel de Filtros */}
                <MetricasFiltros 
                    filtroModelo={filtroModelo} 
                    setFiltroModelo={setFiltroModelo}
                    filtroDias={filtroDias}
                    setFiltroDias={setFiltroDias}
                />

                {/* Tabla Principal */}
                <MetricasTable 
                    metricas={metricasFiltradas} 
                    loading={loading} 
                />

            </Paper>


        </Box>
    );
};

export default AdminMetricas;