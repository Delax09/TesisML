// src/pages/Usuario/Portafolio/Portafolio.js
import React from 'react';
import { Box, Paper, Grid, CircularProgress } from '@mui/material';
import { useAuth } from 'context'; 
import { usePortafolio, ListaPortafolio } from 'features';
import { PageHeader } from 'components';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';


export default function Portafolio() {
  const { usuario } = useAuth();
  
  // Consumimos toda la lógica desde nuestro Custom Hook
  const {
    misEmpresas,
    empresasDisponibles,
    sectoresDisponibles,
    cargando,
    procesandoMasivo,
    agregarUna,
    eliminarUna,
    agregarMultiples,
    eliminarMultiples
  } = usePortafolio(usuario?.id);

  if (cargando) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>

      <PageHeader 
        titulo="Gestionar Mi Portafolio"
        icono={AccountBalanceWalletIcon} 
      />

      <Grid container spacing={{ xs: 2, md: 3, lg: 4 }} alignItems="stretch">
        
        {/* PANEL: MIS EMPRESAS */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
            <ListaPortafolio 
              titulo="Empresas en Seguimiento"
              empresas={misEmpresas}
              sectores={Array.from(new Set(misEmpresas.map(e => e.NombreSector))).sort()}
              procesando={procesandoMasivo}
              esRemover={true}
              idProp="IdPortafolio" 
              onAccionIndividual={eliminarUna} // Evento conectado al hook
              onAccionMultiple={eliminarMultiples} // Evento conectado al hook
              mensajeVacio="No tienes empresas en tu portafolio aún."
            />
          </Paper>
        </Grid>

        {/* PANEL: EMPRESAS DISPONIBLES */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
            <ListaPortafolio 
              titulo="Mercado Disponible"
              empresas={empresasDisponibles}
              sectores={sectoresDisponibles}
              procesando={procesandoMasivo}
              esRemover={false}
              idProp="IdEmpresa" 
              onAccionIndividual={agregarUna} // Evento conectado al hook
              onAccionMultiple={agregarMultiples} // Evento conectado al hook
              mensajeVacio="Ya sigues a todas las empresas disponibles."
            />
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}