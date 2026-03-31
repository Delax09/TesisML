// src/features/portafolio/components/ListaPortafolio.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, IconButton, 
  Chip, Divider, Checkbox, Button, FormControl, InputLabel, 
  Select, MenuItem, Pagination, TextField, InputAdornment, CircularProgress 
} from '@mui/material';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'; 
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

import { usePrediccionesIA } from '../hooks/usePrediccionesIA';

export default function ListaPortafolio({
  titulo, empresas, sectores, procesando,
  esRemover = false, idProp,
  onAccionIndividual, onAccionMultiple, mensajeVacio
}) {
  const [sectorFiltro, setSectorFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const ITEMS_POR_PAGINA = 6;

  const { predicciones, cargandoIA } = usePrediccionesIA();

  useEffect(() => { setPagina(1); }, [sectorFiltro, busqueda]);
  useEffect(() => { setSeleccionadas([]); }, [empresas]);

  const empresasFiltradas = empresas.filter(emp => {
    const coincideSector = sectorFiltro === 'todos' || emp.NombreSector === sectorFiltro;
    const texto = busqueda.toLowerCase();
    const coincideBusqueda = emp.NombreEmpresa.toLowerCase().includes(texto) || emp.Ticket.toLowerCase().includes(texto);
    return coincideSector && coincideBusqueda;
  });

  const alternarSeleccion = (id) => setSeleccionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const alternarTodas = () => {
    const idsVisibles = empresasFiltradas.map(emp => emp[idProp]);
    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every(id => seleccionadas.includes(id));
    if (todasSeleccionadas) setSeleccionadas(prev => prev.filter(id => !idsVisibles.includes(id)));
    else setSeleccionadas(prev => [...prev, ...idsVisibles.filter(id => !prev.includes(id))]);
  };

  const manejarAccionMultiple = async () => {
    await onAccionMultiple(seleccionadas);
    setSeleccionadas([]);
  };

  const todasSeleccionadas = empresasFiltradas.length > 0 && empresasFiltradas.every(emp => seleccionadas.includes(emp[idProp]));
  const algunasSeleccionadas = empresasFiltradas.some(emp => seleccionadas.includes(emp[idProp])) && !todasSeleccionadas;
  const paginadas = empresasFiltradas.slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA);
  const totalPaginas = Math.ceil(empresasFiltradas.length / ITEMS_POR_PAGINA);

  const colorTema = esRemover ? 'error' : 'primary';
  const IconoIndividual = esRemover ? DeleteOutlineIcon : AddCircleOutlineIcon;
  const IconoMultiple = esRemover ? PlaylistRemoveIcon : PlaylistAddIcon;
  const textoBoton = esRemover ? 'Remover' : 'Agregar';

  // ¡MAGIA PURA! Ahora esta función solo devuelve RUTAS DE TU THEME.JS
  const getEstilosTarjeta = (variacion) => {
    if (variacion === null || variacion === undefined) {
        return { 
            bg: 'market.nullState.bg', text: 'market.nullState.text', border: 'market.nullState.border', 
            iconColor: 'market.nullState.icon', badgeBg: 'market.nullState.badgeBg', badgeText: 'market.nullState.badgeText' 
        };
    }
    
    const val = Number(variacion);
    let estado = 'neutral';
    
    if (val >= 1.5) estado = 'strongPositive';
    else if (val > 0) estado = 'positive';
    else if (val < 0 && val > -1.5) estado = 'negative';
    else if (val <= -1.5) estado = 'strongNegative';

    // Si estamos en la vista de remover, pintamos todo el fondo
    if (esRemover) {
        return { 
            bg: `market.${estado}.bg`, text: `market.${estado}.text`, border: `market.${estado}.border`, 
            iconColor: `market.${estado}.icon`, badgeBg: `market.${estado}.badgeBg`, badgeText: `market.${estado}.badgeText` 
        };
    }
    
    // Si estamos en la vista de agregar, fondo blanco pero íconos de color
    return { 
        bg: 'market.cardDefault.bg', text: 'market.cardDefault.text', border: 'market.cardDefault.border', 
        iconColor: val > 0 ? 'market.positive.icon' : val < 0 ? 'market.negative.icon' : 'market.neutral.icon',
        badgeBg: 'market.nullState.badgeBg', badgeText: 'market.nullState.badgeText' 
    };
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ color: esRemover ? 'primary.main' : 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
          {titulo} ({empresasFiltradas.length})
          {cargandoIA && <CircularProgress size={16} />}
        </Typography>
        
        {(empresas.length > 0 || busqueda !== '') && (
          <>
            <FormControl size="small" fullWidth>
                <InputLabel>Filtrar por Sector</InputLabel>
                <Select value={sectorFiltro} label="Filtrar por Sector" onChange={(e) => setSectorFiltro(e.target.value)}>
                    <MenuItem value="todos">Todos los sectores</MenuItem>
                    {sectores.map(sector => (<MenuItem key={sector} value={sector}>{sector}</MenuItem>))}
                </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField size="small" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 140px' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                <Button variant={esRemover ? "outlined" : "contained"} color={colorTema} startIcon={<IconoMultiple fontSize="small" />} disabled={seleccionadas.length === 0 || procesando} onClick={manejarAccionMultiple} size="small" sx={{ flex: '0 0 auto' }}>
                    {textoBoton} ({seleccionadas.length})
                </Button>
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          {empresasFiltradas.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, mb: 2 }}>
                  <Checkbox size="small" color={colorTema} checked={todasSeleccionadas} indeterminate={algunasSeleccionadas} onChange={alternarTodas}/>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">Seleccionar visibles ({empresasFiltradas.length})</Typography>
              </Box>
          )}

          {empresas.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>{mensajeVacio}</Typography>
          ) : empresasFiltradas.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>No se encontraron empresas con esa búsqueda.</Typography>
          ) : (
          
          <Grid container spacing={2}>
              {paginadas.map((emp) => {
                const idActual = emp[idProp]; 
                const estaSeleccionada = seleccionadas.includes(idActual);
                
                const resultadoIA = predicciones[emp.IdEmpresa];
                const variacionPct = resultadoIA ? parseFloat(resultadoIA.VariacionPCT) : null;
                const recomendacion = resultadoIA ? resultadoIA.Recomendacion : 'SIN IA';
                
                const estilos = getEstilosTarjeta(variacionPct);

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 12, lg: 6 }} key={idActual}>
                      <Paper 
                          elevation={estaSeleccionada ? 4 : 0}
                          onClick={() => alternarSeleccion(idActual)} 
                          sx={{ 
                              p: { xs: 1.5, sm: 2 }, 
                              borderRadius: '12px', 
                              bgcolor: estilos.bg, 
                              color: estilos.text,
                              borderStyle: 'solid',
                              borderWidth: estaSeleccionada ? 2 : 1,
                              borderColor: estaSeleccionada ? 'secondary.main' : estilos.border,
                              display: 'flex', flexDirection: 'column', height: '100%',
                              transition: 'transform 0.2s, box-shadow 0.2s', overflow: 'hidden',
                              cursor: 'pointer',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                          }}
                      >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Checkbox
                                  checked={estaSeleccionada} color="primary"
                                  onChange={() => alternarSeleccion(idActual)} size="small"
                                  onClick={(e) => e.stopPropagation()} 
                                  sx={{ p: 0, color: 'text.secondary' }}
                              />
                              <IconButton 
                                  edge="end" size="small" 
                                  onClick={(e) => {
                                      e.stopPropagation(); 
                                      onAccionIndividual(idActual);
                                  }} 
                                  sx={{ color: 'text.secondary', zIndex: 2 }} 
                              >
                                  <IconoIndividual fontSize="small" />
                              </IconButton>
                          </Box>

                          <Box sx={{ flexGrow: 1, mb: 1, minWidth: 0 }}>
                              <Typography variant="h6" fontWeight="900" noWrap sx={{ lineHeight: 1.2, fontSize: { xs: '1.1rem', sm: '1rem', md: '1.15rem' } }}>
                                  {emp.Ticket}
                              </Typography>
                              <Typography variant="caption" noWrap sx={{ opacity: 0.8, display: 'block' }}>
                                  {emp.NombreEmpresa}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                  <Chip label={emp.NombreSector} size="small" sx={{ fontSize: '0.65rem', height: '22px', maxWidth: '100%', bgcolor: 'rgba(0,0,0,0.05)', color: estilos.text, fontWeight: '600' }} />
                              </Box>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 'auto', gap: 1 }}>
                              <Box sx={{ minWidth: 0 }}>
                                  {variacionPct !== null ? (
                                      <Typography variant="subtitle1" fontWeight="800" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: estilos.text }}>
                                          {variacionPct > 0 ? <TrendingUpIcon fontSize="small" sx={{ color: estilos.iconColor }}/> : variacionPct < 0 ? <TrendingDownIcon fontSize="small" sx={{ color: estilos.iconColor }}/> : <RemoveIcon fontSize="small" sx={{ color: estilos.iconColor }}/>}
                                          {variacionPct.toFixed(2)}%
                                      </Typography>
                                  ) : (
                                      <Typography variant="caption" noWrap sx={{ fontStyle: 'italic', opacity: 0.6 }}>Sin datos</Typography>
                                  )}
                              </Box>
                              
                              {resultadoIA && (
                                  <Chip 
                                      label={recomendacion} size="small"
                                      sx={{ 
                                          fontWeight: '800', fontSize: '0.65rem', height: '22px', maxWidth: '60%',
                                          bgcolor: estilos.badgeBg,
                                          color: estilos.badgeText,
                                          border: 1,
                                          borderColor: estilos.border
                                      }} 
                                  />
                              )}
                          </Box>
                      </Paper>
                  </Grid>
                );
              })}
          </Grid>
          )}
      </Box>

      {totalPaginas > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={totalPaginas} page={pagina} onChange={(e, value) => setPagina(value)} color="primary" />
          </Box>
      )}
    </Box>
  );
}