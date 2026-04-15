import React from 'react';
import { Paper, Typography, Divider, List, ListItemButton, ListItemText } from '@mui/material';
import { alpha } from '@mui/material/styles';

const UsuarioList = ({ usuarios, usuarioSeleccionado, setUsuarioSeleccionado }) => {
  return (
    <Paper
      sx={{
        height: '100%',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        Usuarios
      </Typography>
      
      <Divider />
      
      <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
        {usuarios.map((usuario) => (
          <ListItemButton
            key={usuario.IdUsuario}
            selected={usuarioSeleccionado?.IdUsuario === usuario.IdUsuario}
            onClick={() => setUsuarioSeleccionado(usuario)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              // Sobrescribimos el estilo global solo para esta lista
              '&.Mui-selected': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                borderLeft: '4px solid',
                borderLeftColor: 'primary.main',
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.15),
                }
              }
            }}
          >
            <ListItemText
              primary={`${usuario.Nombre} ${usuario.Apellido}`}
              secondary={usuario.Email}
              primaryTypographyProps={{ fontWeight: 'medium' }}
              secondaryTypographyProps={{ color: 'text.secondary' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};

export default UsuarioList;