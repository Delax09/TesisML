// src/pages/Usuario/ProyeccionesIA/ProyeccionesIA.js
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext'; 
import { useProyeccionesIA } from '../../../features/portafolio/hooks/useProyeccionesIA';
import TarjetaProyeccion from '../../../features/ia_analisis/components/TarjetaProyeccion';
import GraficoComparativo from '../../../features/ia_analisis/components/GraficoComparativo';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, CircularProgress} from '@mui/material'; 
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PageHeader from '../../../components/PageHeader';

const VistaProyecciones = () => {
  const { usuario } = useAuth(); 
  const idUsuarioFiltro = usuario?.id;

  // Extraemos la nueva propiedad 'sectores'
  const { proyecciones, sectores, cargando, error } = useProyeccionesIA(idUsuarioFiltro);
  
  // Estados para las nuevas funcionalidades
  const [sectorSeleccionado, setSectorSeleccionado] = useState('');
  const [empresasComparar, setEmpresasComparar] = useState([]);

    if (cargando) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" p={6} gap={2} sx={{ width: '100%' }}>
                <CircularProgress size={30} color="primary" />
            </Box>
        );
}  if (error) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>{error}</div>;

  // Filtrado de las proyecciones a mostrar
  const proyeccionesFiltradas = proyecciones.filter(p => 
    sectorSeleccionado === '' || p.sector === sectorSeleccionado
  );

  // Lógica para seleccionar/deseleccionar empresas
  const handleToggleComparar = (simbolo) => {
    setEmpresasComparar(prev => 
        prev.includes(simbolo) 
            ? prev.filter(s => s !== simbolo) 
            : [...prev, simbolo]
    );
  };

  const datosAComparar = proyecciones.filter(p => empresasComparar.includes(p.simbolo));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

        <PageHeader 
            titulo="Análisis Predictivo de tu Portafolio"
            subtitulo="Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial."
            icono={ShowChartIcon} 
        />

        {/* CONTROLES: Filtro por Sector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <FormControl sx={{ minWidth: 250 }} size="small">
                <InputLabel id="filtro-sector-label">Filtrar por Sector</InputLabel>
                <Select
                    labelId="filtro-sector-label"
                    value={sectorSeleccionado}
                    label="Filtrar por Sector"
                    onChange={(e) => setSectorSeleccionado(e.target.value)}
                >
                    <MenuItem value=""><em>Todos los sectores</em></MenuItem>
                    {sectores.map(sector => (
                        <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>

        {/* GRÁFICO COMPARATIVO: Se muestra solo si hay 2 o más empresas seleccionadas */}
        {empresasComparar.length >= 2 && (
            <Paper sx={{ p: 4, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                    Comparativa de Proyecciones ({empresasComparar.join(' vs ')})
                </Typography>
                <GraficoComparativo datos={datosAComparar} />
            </Paper>
        )}
      
        {proyecciones.length === 0 && !cargando && (
            <Box sx={{ textAlign: 'center', p: 5, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="h6" color="text.secondary">No se encontraron empresas activas en tu portafolio.</Typography>
            </Box>
        )}

        {/* LISTADO DE TARJETAS */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 3 }}>
            {proyeccionesFiltradas.map((empresaData, index) => (
                <TarjetaProyeccion 
                    key={index} 
                    datos={empresaData} 
                    // Nuevas propiedades:
                    seleccionado={empresasComparar.includes(empresaData.simbolo)}
                    onToggle={() => handleToggleComparar(empresaData.simbolo)}
                />
            ))}
        </Box>
    </Box>
  );
};

export default VistaProyecciones;