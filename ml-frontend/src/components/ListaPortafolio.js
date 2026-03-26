// src/components/ListaPortafolio.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText, IconButton, 
  Chip, Divider, Checkbox, Button, FormControl, InputLabel, 
  Select, MenuItem, Pagination, TextField, InputAdornment 
} from '@mui/material';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'; 
import SearchIcon from '@mui/icons-material/Search';

export default function ListaPortafolio({
  titulo,
  empresas,
  sectores,
  procesando,
  esRemover = false, // Determina si la lista es para ELIMINAR (Mis Empresas) o AGREGAR (Disponibles)
  idProp, // La propiedad que se usa como ID ('IdPortafolio' o 'IdEmpresa')
  onAccionIndividual,
  onAccionMultiple,
  mensajeVacio
}) {
  const [sectorFiltro, setSectorFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const ITEMS_POR_PAGINA = 5;

  // Resetear paginación si se busca o filtra
  useEffect(() => {
    setPagina(1);
  }, [sectorFiltro, busqueda]);

  // Limpiar selección cuando cambian las empresas (ej. después de borrar/agregar)
  useEffect(() => {
    setSeleccionadas([]);
  }, [empresas]);

  // --- Lógica de Filtrado ---
  const empresasFiltradas = empresas.filter(emp => {
    const coincideSector = sectorFiltro === 'todos' || emp.NombreSector === sectorFiltro;
    const texto = busqueda.toLowerCase();
    const coincideBusqueda = emp.NombreEmpresa.toLowerCase().includes(texto) || 
                             emp.Ticket.toLowerCase().includes(texto);
    return coincideSector && coincideBusqueda;
  });

  // --- Lógica de Selección ---
  const alternarSeleccion = (id) => {
    setSeleccionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const alternarTodas = () => {
    const idsVisibles = empresasFiltradas.map(emp => emp[idProp]);
    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every(id => seleccionadas.includes(id));
    
    if (todasSeleccionadas) {
        setSeleccionadas(prev => prev.filter(id => !idsVisibles.includes(id)));
    } else {
        setSeleccionadas(prev => {
            const nuevas = idsVisibles.filter(id => !prev.includes(id));
            return [...prev, ...nuevas];
        });
    }
  };

  const manejarAccionMultiple = async () => {
    await onAccionMultiple(seleccionadas);
    setSeleccionadas([]);
  };

  const todasSeleccionadas = empresasFiltradas.length > 0 && empresasFiltradas.every(emp => seleccionadas.includes(emp[idProp]));
  const algunasSeleccionadas = empresasFiltradas.some(emp => seleccionadas.includes(emp[idProp])) && !todasSeleccionadas;

  // --- Paginación ---
  const paginadas = empresasFiltradas.slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA);
  const totalPaginas = Math.ceil(empresasFiltradas.length / ITEMS_POR_PAGINA);

  // Configuraciones visuales dependientes del modo (Agregar o Remover)
  const colorTema = esRemover ? 'error' : 'primary';
  const colorFondoItem = esRemover ? 'rgba(239, 68, 68, 0.08)' : 'action.selected';
  const IconoIndividual = esRemover ? DeleteOutlineIcon : AddCircleOutlineIcon;
  const IconoMultiple = esRemover ? PlaylistRemoveIcon : PlaylistAddIcon;
  const textoBoton = esRemover ? 'Remover' : 'Agregar';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ color: esRemover ? 'primary.main' : 'text.secondary' }}>
          {titulo} ({empresasFiltradas.length})
        </Typography>
        
        {/* Solo mostramos controles si hay empresas (o si hay filtros activos) */}
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
                <TextField
                    size="small" placeholder="Buscar..." value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 140px' }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                <Button 
                    variant={esRemover ? "outlined" : "contained"} 
                    color={esRemover ? "error" : "secondary"} 
                    startIcon={<IconoMultiple fontSize="small" />}
                    disabled={seleccionadas.length === 0 || procesando}
                    onClick={manejarAccionMultiple} size="small"
                    sx={{ borderRadius: 2, fontWeight: 'bold', flex: '0 0 auto', whiteSpace: 'nowrap' }}
                >
                    {textoBoton} ({seleccionadas.length})
                </Button>
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ mb: 1 }} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          {empresasFiltradas.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, mb: 1 }}>
                  <Checkbox
                      size="small" color={colorTema}
                      checked={todasSeleccionadas} indeterminate={algunasSeleccionadas} onChange={alternarTodas}
                  />
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Seleccionar todas las visibles ({empresasFiltradas.length})
                  </Typography>
              </Box>
          )}

          {empresas.length === 0 ? (
              <Typography color="text.secondary">{mensajeVacio}</Typography>
          ) : empresasFiltradas.length === 0 ? (
              <Typography color="text.secondary">No se encontraron empresas con esa búsqueda o sector.</Typography>
          ) : (
          <List disablePadding sx={{ flexGrow: 1 }}>
              {paginadas.map((emp) => {
                const idActual = emp[idProp];
                const estaSeleccionada = seleccionadas.includes(idActual);
                return (
                  <ListItem 
                      key={idActual}
                      sx={{ 
                          bgcolor: estaSeleccionada ? colorFondoItem : 'background.default', 
                          mb: 1, borderRadius: 2, transition: 'background-color 0.2s', p: {xs: 1, md: 2} 
                      }}
                      secondaryAction={
                      <IconButton edge="end" color={colorTema} size="small" onClick={() => onAccionIndividual(idActual)}>
                          <IconoIndividual fontSize="small" />
                      </IconButton>
                      }
                  >
                      <Checkbox
                          edge="start" checked={estaSeleccionada} color={colorTema}
                          onChange={() => alternarSeleccion(idActual)} size="small" sx={{ p: {xs: 0.5, md: 1} }}
                      />
                        <ListItemText 
                        primary={`${emp.Ticket} - ${emp.NombreEmpresa}`} 
                        secondary={<Chip label={emp.NombreSector} size="small" sx={{ mt: 0.5 }} />}
                        primaryTypographyProps={{ variant: { xs: 'body2', md: 'body1' } }}
                        secondaryTypographyProps={{ component: 'div' }} 
                        />
                  </ListItem>
                );
              })}
          </List>
          )}
      </Box>

      {totalPaginas > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
              <Pagination count={totalPaginas} page={pagina} onChange={(e, value) => setPagina(value)} color="primary" size="small" />
          </Box>
      )}
    </Box>
  );
}