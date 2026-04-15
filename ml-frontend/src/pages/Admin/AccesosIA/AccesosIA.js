// ml-frontend/src/pages/Admin/AccesosIA/AccesosIA.js
import React from 'react';
import { useThemeContext } from '../../../context/ThemeContext';
import { useAccesosIA } from '../../../features/admin/hooks/useAccesosIA';
import PageHeader from '../../../components/PageHeader';

// --- NUEVAS IMPORTACIONES DE ÍCONOS DE MUI ---
import SecurityIcon from '@mui/icons-material/Security';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import {
  Box,
  Grid,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';

const AccesosIA = () => {
  const { darkMode } = useThemeContext();
  const {
    usuarios,
    modelosDisponibles,
    usuarioSeleccionado,
    setUsuarioSeleccionado,
    modelosUsuario,
    alternarAcceso,
    loading
  } = useAccesosIA();

  // Función auxiliar para saber si un usuario tiene un modelo específico
  const tieneModelo = (idModelo) => {
    return modelosUsuario.some((modelo) => modelo.IdModelo === idModelo);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, color: darkMode ? 'grey.100' : 'text.primary' }}>
      <PageHeader
        title="Gestión de Accesos IA"
        subtitle="Habilita o deshabilita modelos de IA para los usuarios"
        icon={SecurityIcon} // Pasamos el ícono de MUI
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        
        {/* Panel Izquierdo: Lista de Usuarios */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={darkMode ? 1 : 3}
            sx={{
              height: '100%',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: darkMode ? '#1e293b' : 'background.paper',
              color: darkMode ? 'common.white' : 'text.primary',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
              Usuarios
            </Typography>
            <Divider sx={{ bgcolor: darkMode ? 'grey.700' : 'grey.200' }} />
            
            <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
              {usuarios.map((usuario) => (
                <ListItemButton
                  key={usuario.IdUsuario}
                  selected={usuarioSeleccionado?.IdUsuario === usuario.IdUsuario}
                  onClick={() => setUsuarioSeleccionado(usuario)}
                  sx={{
                    borderBottom: 1,
                    borderColor: darkMode ? 'grey.800' : 'grey.100',
                    '&.Mui-selected': {
                      bgcolor: darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                      borderLeft: '4px solid #6366f1',
                      '&:hover': {
                        bgcolor: darkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                      }
                    },
                    '&:hover': {
                      bgcolor: darkMode ? 'grey.800' : 'grey.50',
                    }
                  }}
                >
                  <ListItemText
                    primary={`${usuario.Nombre} ${usuario.Apellido}`}
                    secondary={usuario.Email}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                    secondaryTypographyProps={{
                      color: darkMode ? 'grey.400' : 'text.secondary'
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Panel Derecho: Modelos del Usuario Seleccionado */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={darkMode ? 1 : 3}
            sx={{
              p: 3,
              minHeight: '400px',
              height: '100%',
              bgcolor: darkMode ? '#1e293b' : 'background.paper',
              color: darkMode ? 'common.white' : 'text.primary',
              borderRadius: 2
            }}
          >
            {!usuarioSeleccionado ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                minHeight="300px"
                opacity={0.6}
              >
                {/* Ícono grande central adaptado a MUI */}
                <SecurityIcon sx={{ fontSize: 64, mb: 2, color: '#6366f1' }} />
                <Typography variant="h6" align="center" color={darkMode ? 'grey.300' : 'text.secondary'}>
                  Selecciona un usuario para gestionar sus accesos a los modelos de IA.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 3, borderBottom: 1, borderColor: darkMode ? 'grey.700' : 'grey.200', pb: 2 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Accesos de: <Box component="span" sx={{ color: '#6366f1' }}>{usuarioSeleccionado.Nombre} {usuarioSeleccionado.Apellido}</Box>
                  </Typography>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" py={10}>
                    <CircularProgress sx={{ color: '#6366f1' }} />
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {modelosDisponibles.map((modelo) => {
                      const activo = tieneModelo(modelo.IdModelo);
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={modelo.IdModelo}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              bgcolor: activo
                                ? (darkMode ? 'rgba(76, 175, 80, 0.05)' : 'rgba(76, 175, 80, 0.02)') 
                                : (darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc'), 
                              borderColor: activo ? 'success.main' : (darkMode ? 'grey.700' : 'grey.300'),
                              transition: 'all 0.2s',
                              opacity: activo ? 1 : 0.8
                            }}
                          >
                            <CardContent sx={{ flexGrow: 1 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Typography variant="h6" fontWeight="bold">
                                  {modelo.Nombre}
                                </Typography>
                                {/* Íconos pequeños dentro del Chip adaptados a MUI */}
                                <Chip
                                  icon={activo ? <CheckIcon sx={{ fontSize: 16 }} /> : <CloseIcon sx={{ fontSize: 16 }} />}
                                  label={activo ? "Habilitado" : "Bloqueado"}
                                  color={activo ? "success" : "error"}
                                  size="small"
                                  variant={darkMode ? "outlined" : "filled"}
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Box>
                              <Typography variant="body2" color={darkMode ? 'grey.400' : 'text.secondary'}>
                                {modelo.Descripcion || 'Este modelo no cuenta con una descripción detallada en este momento.'}
                              </Typography>
                            </CardContent>
                            
                            <CardActions sx={{ p: 2, pt: 0 }}>
                              <Button
                                fullWidth
                                disableElevation
                                variant={activo ? "outlined" : "contained"}
                                color={activo ? "error" : "primary"}
                                onClick={() => alternarAcceso(modelo.IdModelo)}
                                disabled={loading}
                                sx={{ 
                                  fontWeight: 'bold',
                                  textTransform: 'none',
                                  ...( !activo && { bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } } )
                                }}
                              >
                                {activo ? 'Revocar Acceso' : 'Conceder Acceso'}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccesosIA;