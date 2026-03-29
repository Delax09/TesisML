// src/pages/Usuario/Home/Home.js
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, Button, 
  CircularProgress, List, ListItem, ListItemAvatar, Avatar, 
  ListItemText, Divider, Chip 
} from '@mui/material';

// Context & Hooks
import { useAuth } from '../../../context';
import { useDashboard } from '../../../features/dashboard/hooks/useDashboard';

// Iconos
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

export default function Home() {
  const { usuario } = useAuth();
  const { cargando, estadisticas } = useDashboard(usuario);

  if (cargando) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
        </Box>
      );
  }

  const obtenerColorSentimiento = (sentimiento) => {
      if (sentimiento?.includes('Alcista')) return { color: '#10b981', bg: '#d1fae5' }; 
      if (sentimiento?.includes('Bajista')) return { color: '#ef4444', bg: '#fee2e2' }; 
      return { color: '#f59e0b', bg: '#fef3c7' }; 
  };

  const sentimientoColor = obtenerColorSentimiento(estadisticas.sentimientoGeneral);

  const obtenerIconoTendencia = (tendencia) => {
      if (tendencia === 'Alcista') return <TrendingUpIcon color="success" />;
      if (tendencia === 'Bajista') return <TrendingDownIcon color="error" />;
      return <TrendingFlatIcon color="warning" />;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
      {/* HEADER: Saludo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1 }}>
        <Box sx={{ backgroundColor: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
            <QueryStatsIcon fontSize="large" />
        </Box>
        <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              ¡Hola, {usuario?.nombre?.split(' ')[0] || 'Inversor'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Aquí tienes un resumen de tu portafolio y las últimas señales del mercado.
            </Typography>
        </Box>
      </Box>

      {/* SECCIÓN 1: KPIs Principales */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                        <BusinessCenterIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="bold">EMPRESAS SEGUIDAS</Typography>
                        <Typography variant="h4" fontWeight="900" color="text.primary">{estadisticas.totalEmpresas}</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: 'secondary.light', width: 56, height: 56 }}>
                        <PieChartIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="bold">SECTORES ABARCADOS</Typography>
                        <Typography variant="h4" fontWeight="900" color="text.primary">{estadisticas.totalSectores}</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%', bgcolor: sentimientoColor.bg, border: `1px solid ${sentimientoColor.color}40` }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: sentimientoColor.color, color: 'white', width: 56, height: 56 }}>
                        <AutoGraphIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                        <Typography sx={{ color: sentimientoColor.color, opacity: 0.8 }} variant="body2" fontWeight="bold">SENTIMIENTO IA</Typography>
                        <Typography variant="h5" fontWeight="900" sx={{ color: sentimientoColor.color }}>
                            {estadisticas.sentimientoGeneral}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
      </Grid>

      {/* SECCIÓN 2: Panel IA y Accesos Rápidos */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 7 }}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoGraphIcon color="primary" /> Oportunidades IA en Portafolio
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {estadisticas.topPredicciones.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary" mb={2}>Agrega empresas a tu portafolio y ejecuta el modelo IA para ver predicciones.</Typography>
                        <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" size="small">
                            Agregar Empresas
                        </Button>
                    </Box>
                ) : (
                    <List disablePadding>
                        {estadisticas.topPredicciones.map((emp) => (
                            <ListItem 
                                key={emp.IdEmpresa} 
                                sx={{ 
                                    bgcolor: 'background.default', 
                                    mb: 1.5, 
                                    borderRadius: 2, 
                                    p: 2, 
                                    borderLeft: `4px solid ${emp.tendencia === 'Alcista' ? '#10b981' : emp.tendencia === 'Bajista' ? '#ef4444' : '#f59e0b'}` 
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'background.paper', color: 'text.primary', border: '1px solid #e0e0e0' }}>
                                        {obtenerIconoTendencia(emp.tendencia)}
                                    </Avatar>
                                </ListItemAvatar>
                                
                                <ListItemText 
                                    disableTypography
                                    primary={
                                        <Typography component="div" fontWeight="bold" variant="subtitle1">
                                            {emp.Ticket} - {emp.NombreEmpresa}
                                        </Typography>
                                    } 
                                    secondary={
                                        <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip label={emp.NombreSector} size="small" sx={{ fontSize: '0.7rem' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                RSI: {emp.rsi.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    } 
                                />

                                {/* AQUI ESTA LA MAGIA VISUAL: Precios reales */}
                                <Box sx={{ textAlign: 'right', minWidth: '100px' }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        Actual: ${emp.precioActual.toFixed(4)}
                                    </Typography>
                                    <Typography 
                                        variant="subtitle2" 
                                        fontWeight="900" 
                                        color={emp.tendencia === 'Alcista' ? 'success.main' : emp.tendencia === 'Bajista' ? 'error.main' : 'warning.main'}
                                    >
                                        Obj: ${emp.precioPredicho.toFixed(4)}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary' }}>¿Qué deseas hacer hoy?</Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button component={RouterLink} to="/mercado" variant="contained" color="primary" size="large" startIcon={<AnalyticsIcon />} sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}>
                        Ir al Análisis de Mercado
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1, mb: 1, pl: 1 }}>
                        Explora gráficos de tus empresas y métricas técnicas como el RSI o MACD.
                    </Typography>

                    <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" color="primary" size="large" startIcon={<AccountBalanceWalletIcon />} sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}>
                        Configurar mi Portafolio
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1, pl: 1 }}>
                        Agrega o elimina empresas para que la IA comience a analizarlas.
                    </Typography>
                </Box>

                {estadisticas.distribucionSectores.length > 0 && (
                    <Box sx={{ mt: 'auto', pt: 4 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" mb={1.5}>
                            TU PORTAFOLIO POR SECTORES
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {estadisticas.distribucionSectores.map(sec => (
                                <Chip 
                                    key={sec.nombre} 
                                    label={`${sec.nombre} (${sec.cantidad})`} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ fontWeight: '500' }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}