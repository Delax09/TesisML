// src/pages/Usuario/Home/Home.js
import React, { useState, useEffect } from 'react';
import { useAuth } from 'context';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// Iconos
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

import { portafolioService, empresaService } from 'services';
import toast from 'react-hot-toast';

export default function Home() {
  const { usuario } = useAuth();
  
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalEmpresas: 0,
    totalSectores: 0,
    topPredicciones: []
  });

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        setCargando(true);
        // Traemos todas las empresas para saber sus sectores
        const dataEmpresas = await empresaService.obtenerEmpresasConSectores();
        
        // Traemos el portafolio del usuario
        const todosLosPortafolios = await portafolioService.obtenerTodos();
        const misConexiones = todosLosPortafolios.filter(p => p.IdUsuario === usuario.id && p.Activo !== false);

        // Cruzamos datos
        const misEmpresasCompletas = misConexiones.map(conexion => {
            return dataEmpresas.empresas.find(e => e.IdEmpresa === conexion.IdEmpresa);
        }).filter(e => e !== undefined);

        const sectoresUnicos = new Set(misEmpresasCompletas.map(e => e.NombreSector));

        // Simulamos un "Top 3" de IA tomando las primeras empresas del portafolio del usuario
        // En el futuro, aquí puedes consultar a tu iaService para obtener los mejores scores reales
        const topIA = misEmpresasCompletas.slice(0, 3).map(e => ({
            ...e,
            score: (Math.random() * (95 - 70) + 70).toFixed(1), // Score simulado entre 70 y 95
            tendencia: 'Alcista'
        }));

        setEstadisticas({
            totalEmpresas: misConexiones.length,
            totalSectores: sectoresUnicos.size,
            topPredicciones: topIA
        });

      } catch (error) {
        console.error("Error cargando dashboard:", error);
        toast.error("No se pudieron cargar tus estadísticas");
      } finally {
        setCargando(false);
      }
    };

    if (usuario?.id) {
        cargarDashboard();
    }
  }, [usuario]);

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

      {/* SECCIÓN 1: KPIs (Tarjetas de Resumen) */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={12} md={4}>
            <Card elevation={2} sx={{ borderRadius: 3, height: '100%', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56 }}>
                        <AutoGraphIcon fontSize="medium" />
                    </Avatar>
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
        
        {/* TOP PREDICCIONES IA */}
        <Grid item xs={12} lg={7}>
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
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>{index + 1}</Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={<Typography fontWeight="bold">{emp.Ticket} - {emp.NombreEmpresa}</Typography>}
                                    secondary={emp.NombreSector}
                                />
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

        {/* ACCESOS RÁPIDOS */}
        <Grid item xs={12} lg={5}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary' }}>
                    ¿Qué deseas hacer hoy?
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                        component={RouterLink} 
                        to="/mercado"
                        variant="contained" 
                        color="primary" 
                        size="large"
                        startIcon={<AnalyticsIcon />}
                        sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}
                    >
                        Ir al Análisis de Mercado
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1, mb: 1, pl: 1 }}>
                        Explora gráficos, consulta precios históricos y evalúa nuevas empresas.
                    </Typography>

                    <Button 
                        component={RouterLink} 
                        to="/gestionar-portafolio"
                        variant="outlined" 
                        color="primary" 
                        size="large"
                        startIcon={<AccountBalanceWalletIcon />}
                        sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}
                    >
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