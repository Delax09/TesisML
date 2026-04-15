import React from 'react';
import { Box, Grid } from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

// Hook
import { useAccesosIA } from '../../../features/admin/hooks/useAccesosIA';

// Componentes
import PageHeader from '../../../components/PageHeader';
import UsuarioList from '../../../features/admin/components/UsuarioList';
import ModelosPanel from '../../../features/admin/components/ModelosPanel';

const AccesosIA = () => {
  const {
    usuarios,
    modelosDisponibles,
    usuarioSeleccionado,
    setUsuarioSeleccionado,
    modelosUsuario,
    alternarAcceso,
    loading
  } = useAccesosIA();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 4 }, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      <PageHeader
        titulo="Gestión de Accesos IA"
        subtitulo="Habilita o deshabilita modelos de IA para los usuarios"
        icono={SettingsSuggestIcon}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <UsuarioList
            usuarios={usuarios}
            usuarioSeleccionado={usuarioSeleccionado}
            setUsuarioSeleccionado={setUsuarioSeleccionado}
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 8 }}>
          <ModelosPanel
            usuarioSeleccionado={usuarioSeleccionado}
            modelosDisponibles={modelosDisponibles}
            modelosUsuario={modelosUsuario}
            alternarAcceso={alternarAcceso}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccesosIA;