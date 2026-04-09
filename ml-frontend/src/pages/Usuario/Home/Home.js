// src/pages/Usuario/Home/Home.js
import React, { useState } from 'react'; // AÑADIDO: useState
import { Link as RouterLink } from 'react-router-dom';
import { 
    Box, Typography, Paper, Grid, Button, CircularProgress, Divider,
    Dialog, DialogTitle, DialogContent, IconButton // AÑADIDO: Componentes de Modal
} from '@mui/material';

// Context & Hooks
import { useAuth } from '../../../context';
import { useDashboard } from '../../../features/dashboard/hooks/useDashboard';
import PageHeader from '../../../components/PageHeader';

// Componentes extraídos
import KpiPanel from '../../../features/dashboard/components/KpiPanel';
import TopPrediccionesList from '../../../features/dashboard/components/TopPrediccionesList';
import GraficoSectores from '../../../features/dashboard/components/GraficoSectores';

// AÑADIDO: Componentes para el Modal
import PrecioChart from '../../../features/mercado/components/PrecioChart';
import ResultadoPanel from '../../../features/ia_analisis/components/ResultadoPanel';

// Iconos
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CloseIcon from '@mui/icons-material/Close'; // AÑADIDO: Ícono para cerrar modal

export default function Home() {
  const { usuario } = useAuth();
  const { cargando, estadisticas } = useDashboard(usuario);

  // AÑADIDO: Estado para el modal
  const [modalOpen, setModalOpen] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  // AÑADIDO: Funciones para manejar el modal
  const handleAbrirModal = (empresa) => {
      setEmpresaSeleccionada(empresa);
      setModalOpen(true);
  };

  const handleCerrarModal = () => {
      setModalOpen(false);
      // Opcional: esperar a que termine la animación de cierre para limpiar la empresa
      setTimeout(() => setEmpresaSeleccionada(null), 300);
  };

  if (cargando) {
      return (
        <Box sx={{ display: 'flex', flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
        </Box>
      );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
        {/* HEADER: Saludo */}
        <PageHeader 
            titulo={"¡Hola, " + (usuario?.nombre?.split(' ')[0] || 'Inversor') + "!"}
            subtitulo="Aquí tienes un resumen de tu portafolio y las últimas señales del mercado."
            icono={HomeIcon} 
        />

      {/* SECCIÓN 1: KPIs Principales */}
      <KpiPanel estadisticas={estadisticas} />

      {/* SECCIÓN 2: Panel IA y Accesos Rápidos */}
      <Grid container spacing={4}>
        
        {/* Columna Izquierda: Predicciones IA */}
        <Grid size={{ xs: 12, lg: 7 }}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoGraphIcon color="primary" /> Oportunidades IA en Portafolio
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* AÑADIDO: Pasamos la función handleAbrirModal */}
                <TopPrediccionesList 
                    predicciones={estadisticas.topPredicciones} 
                    onSelectEmpresa={handleAbrirModal} 
                />
            </Paper>
        </Grid>

        {/* Columna Derecha: Acciones y Gráfico */}
        <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary' }}>¿Qué deseas hacer hoy?</Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button component={RouterLink} to="/mercado" variant="contained" color="primary" size="large" startIcon={<AnalyticsIcon />} sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}>
                        Ir al Análisis de Mercado
                    </Button>

                    <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" color="primary" size="large" startIcon={<AccountBalanceWalletIcon />} sx={{ py: 2, justifyContent: 'flex-start', borderRadius: 2, fontWeight: 'bold' }}>
                        Configurar mi Portafolio
                    </Button>
                </Box>

                <GraficoSectores distribucion={estadisticas.distribucionSectores} />
            </Paper>
        </Grid>
      </Grid>

      {/* AÑADIDO: Modal Flotante */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCerrarModal} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, minHeight: '60vh' } }}
      >
        {empresaSeleccionada && (
            <>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div" fontWeight="bold">
                        Análisis Detallado: {empresaSeleccionada.NombreEmpresa} ({empresaSeleccionada.Ticket})
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleCerrarModal}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                
                <DialogContent dividers sx={{ p: 3, bgcolor: 'background.default' }}>
                    <Grid container spacing={3}>
                        {/* Gráfico a la izquierda */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Paper sx={{ p: 2, height: 450, display: 'flex', flexDirection: 'column' }}>
                                <PrecioChart 
                                    empresaId={empresaSeleccionada.IdEmpresa} 
                                    nombreEmpresa={empresaSeleccionada.NombreEmpresa} 
                                />
                            </Paper>
                        </Grid>
                        
                        {/* Panel de resultados a la derecha */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            {/* CORRECCIÓN: Le damos height 450 exactos para igualar al gráfico */}
                            <Box sx={{ height: 450 }}>
                                <ResultadoPanel empresaId={empresaSeleccionada.IdEmpresa} />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
            </>
        )}
      </Dialog>
    </Box>
  );
}