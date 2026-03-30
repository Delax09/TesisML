// src/pages/Usuario/ProyeccionesIA/ProyeccionesIA.js
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext'; 
import { useProyeccionesIA } from '../../../features/portafolio/hooks/useProyeccionesIA';
import TarjetaProyeccion from '../../../features/ia_analisis/components/TarjetaProyeccion';
import GraficoComparativo from '../../../features/ia_analisis/components/GraficoComparativo';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material'; 
import ShowChartIcon from '@mui/icons-material/ShowChart';

const VistaProyecciones = () => {
  const { usuario } = useAuth(); 
  const idUsuarioFiltro = usuario?.id;

  // Extraemos la nueva propiedad 'sectores'
  const { proyecciones, sectores, cargando, error } = useProyeccionesIA(idUsuarioFiltro);
  
  // Estados para las nuevas funcionalidades
  const [sectorSeleccionado, setSectorSeleccionado] = useState('');
  const [empresasComparar, setEmpresasComparar] = useState([]);

  if (cargando) return <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Generando proyecciones con IA...</div>;
  if (error) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>{error}</div>;

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

        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ backgroundColor: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
            <ShowChartIcon fontSize="large" />
            </Box>
            <Box>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                Análisis Predictivo de tu Portafolio
                </Typography>
                <Typography variant="body1" color="text.secondary">
                Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial.
                </Typography>
            </Box>
        </Paper>

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
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                    Comparativa de Proyecciones ({empresasComparar.join(' vs ')})
                </Typography>
                <GraficoComparativo datos={datosAComparar} />
            </Paper>
        )}
      
        {proyecciones.length === 0 && !cargando && (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No se encontraron empresas activas en tu portafolio.</p>
            </div>
        )}

        {/* LISTADO DE TARJETAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px' }}>
            {proyeccionesFiltradas.map((empresaData, index) => (
                <TarjetaProyeccion 
                    key={index} 
                    datos={empresaData} 
                    // Nuevas propiedades:
                    seleccionado={empresasComparar.includes(empresaData.simbolo)}
                    onToggle={() => handleToggleComparar(empresaData.simbolo)}
                />
            ))}
        </div>
    </Box>
  );
};

export default VistaProyecciones;