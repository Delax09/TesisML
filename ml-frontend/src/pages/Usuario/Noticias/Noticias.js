import React, { useState } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardMedia, 
  CardContent, CardActions, Button, Chip, CircularProgress, 
  Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { useNoticias } from '../../../features/noticias/hooks/useNoticias';
// 1. IMPORTAMOS TUS HOOKS PARA OBTENER LAS EMPRESAS DEL PORTAFOLIO
import { usePortafolio } from '../../../features/portafolio/hooks/usePortafolio';
import { useAuth } from '../../../context/AuthContext';
import PageHeader from '../../../components/PageHeader';

const Noticias = () => {
  const { usuario } = useAuth();
  const userId = usuario?.IdUsuario || usuario?.id;

  const { data: noticias, isLoading, error } = useNoticias();
  // 2. OBTENEMOS LAS EMPRESAS REALES DEL USUARIO PARA EL MENÚ
  const { misEmpresas } = usePortafolio(userId);
  
  // 3. ESTADO PARA EL SELECT (Guardará el Ticket, ej: 'AAPL')
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

  // 4. LÓGICA DE FILTRADO EXACTO
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
                <Card 
                    sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                    }}
                >
                    <CardMedia
                    component="img"
                    height="160"
                    image={noticia.url_imagen || 'https://placehold.co/400x200/png?text=Sin+Imagen'}
                    alt={noticia.titular}
                    sx={{ objectFit: 'cover' }}
                    />
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip 
                        label={noticia.ticker_relacionado} 
                        color="primary" 
                        size="small" 
                        sx={{ fontWeight: 'bold' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                        {new Date(noticia.fecha_publicacion).toLocaleDateString()}
                        </Typography>
                    </Box>

                    <Typography gutterBottom variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                        {noticia.titular}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                    }}>
                        {noticia.resumen || "Haz clic en 'Leer completa' para ver los detalles del artículo."}
                    </Typography>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.disabled">
                        Fuente: {noticia.fuente}
                    </Typography>
                    <Button 
                        size="small" 
                        endIcon={<OpenInNewIcon />} 
                        href={noticia.url_noticia} 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        Leer
                    </Button>
                    </CardActions>
                </Card>
                </Grid>
            ))}
            </Grid>
        )}
    </Box>
  );
};

export default Noticias;