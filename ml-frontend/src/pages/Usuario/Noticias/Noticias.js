// src/pages/Usuario/Noticias/Noticias.js
import React, { useState } from 'react';
import { 
  Container, Box, Grid, Alert, CircularProgress, 
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import NewspaperIcon from '@mui/icons-material/Newspaper';

import { useNoticias } from '../../../features/noticias/hooks/useNoticias';
import { usePortafolio } from '../../../features/portafolio/hooks/usePortafolio';
import { useAuth } from '../../../context/AuthContext';
import PageHeader from '../../../components/PageHeader';
import NoticiaCard from '../../../features/noticias/components/NoticiaCard'; // IMPORTAMOS LA TARJETA

const Noticias = () => {
  const { usuario } = useAuth();
  const userId = usuario?.IdUsuario || usuario?.id;

  const { data: noticias, isLoading, error } = useNoticias();
  const { misEmpresas } = usePortafolio(userId);
  
  const [empresaFiltro, setEmpresaFiltro] = useState('todas');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Hubo un problema al cargar las noticias. Intenta más tarde.</Alert>
      </Container>
    );
  }

  const noticiasFiltradas = noticias?.filter((noticia) => {
    if (empresaFiltro === 'todas') return true;
    return noticia.ticker_relacionado === empresaFiltro;
  }) || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

      <PageHeader 
        titulo="Noticias de tu Portafolio"
        subtitulo="Las últimas novedades de Wall Street sobre las empresas en las que inviertes"
        icono={NewspaperIcon} 
      />

      {/* FILTRO ABAJO */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl sx={{ width: { xs: '100%', md: '300px' } }}>
          <InputLabel id="filtro-empresa-label">Filtrar por Empresa</InputLabel>
          <Select
            labelId="filtro-empresa-label"
            value={empresaFiltro}
            label="Filtrar por Empresa"
            onChange={(e) => setEmpresaFiltro(e.target.value)}
          >
            <MenuItem value="todas">Todas las noticias</MenuItem>
            {misEmpresas.map(emp => (
              <MenuItem key={emp.IdEmpresa} value={emp.Ticket}>
                {emp.Ticket} - {emp.NombreEmpresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {noticias?.length === 0 ? (
        <Alert severity="info">
          No tienes empresas en tu portafolio o no hay noticias recientes para tus acciones.
        </Alert>
      ) : noticiasFiltradas.length === 0 ? (
        <Alert severity="warning">
          No hay noticias recientes para la empresa seleccionada.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {noticiasFiltradas.map((noticia, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${noticia.id}-${index}`}>
              {/* USAMOS EL NUEVO COMPONENTE AQUÍ */}
              <NoticiaCard noticia={noticia} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Noticias;