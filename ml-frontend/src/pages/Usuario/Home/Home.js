// src/pages/Usuario/Home/Home.js
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider } from '@mui/material';

// Context & Hooks
import { useAuth } from '../../../context';
import { useDashboard } from '../../../features/dashboard/hooks/useDashboard';

// Iconos
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

export default function Home() {
  const { usuario } = useAuth();
  
  // 1. Consumimos el hook súper limpio
  const { cargando, estadisticas } = useDashboard(usuario);

  if (cargando) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

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

      {/* SECCIÓN 1: KPIs */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}><BusinessCenterIcon fontSize="medium" /></Avatar>
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
                    <Avatar sx={{ bgcolor: 'secondary.light', width: 56, height: 56 }}><PieChartIcon fontSize="medium" /></Avatar>
                    <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="bold">SECTORES ABARCADOS</Typography>
                        <Typography variant="h4" fontWeight="900" color="text.primary">{estadisticas.totalSectores}</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56 }}><AutoGraphIcon fontSize="medium" /></Avatar>
                    <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="bold">SENTIMIENTO IA</Typography>
                        <Typography variant="h5" fontWeight="900" color="#10b981">Alcista</Typography>
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
                    <TrendingUpIcon color="success" /> Top Oportunidades en tu Portafolio
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {estadisticas.topPredicciones.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary" mb={2}>No tienes suficientes empresas para generar predicciones.</Typography>
                        <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" size="small">
                            Agregar Empresas
                        </Button>
                    </Box>
                ) : (
                    <List disablePadding>
                        {estadisticas.topPredicciones.map((emp, index) => (
                            <ListItem key={emp.IdEmpresa} sx={{ bgcolor: 'background.default', mb: 1.5, borderRadius: 2, p: 2 }}>
                                <ListItemAvatar><Avatar sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>{index + 1}</Avatar></ListItemAvatar>
                                <ListItemText primary={<Typography fontWeight="bold">{emp.Ticket} - {emp.NombreEmpresa}</Typography>} secondary={emp.NombreSector} />
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="h6" fontWeight="bold" color="success.main">{emp.score}%</Typography>
                                    <Typography variant="caption" color="text.secondary">Confianza IA</Typography>
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
                        Explora gráficos, consulta precios históricos y evalúa nuevas empresas.
                    </Typography>
                    <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" color="primary" size="large" startIcon={<AccountBalanceWalletIcon />} sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}>
                        Configurar mi Portafolio
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1, pl: 1 }}>
                        Agrega o elimina empresas de tu lista de seguimiento personal.
                    </Typography>
                </Box>
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}