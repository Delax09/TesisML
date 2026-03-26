// src/layouts/AdminLayout.js
import React from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from 'context';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography 
} from '@mui/material';

import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 250;

export default function AdminLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#2c3e50', 
            color: '#ecf0f1',
            borderRight: 'none'
          },
        }}
      >
        <Typography variant="h6" sx={{ p: 2.5, textAlign: 'center', borderBottom: '1px solid #34495e', fontWeight: 'bold' }}>
          TesisML - Admin
        </Typography>
        
        <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={RouterLink} 
              to="/panel"
              selected={isActivo('/panel')}
              sx={{ 
                borderRadius: 2,
                '&.Mui-selected': { backgroundColor: '#34495e' },
                '&.Mui-selected:hover': { backgroundColor: '#34495e' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Panel Principal" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        </List>

        <List sx={{ px: 2, mb: 2 }}>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={logout}
              sx={{ borderRadius: 2, color: '#e74c3c', '&:hover': { backgroundColor: 'rgba(231, 76, 60, 0.1)' } }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontWeight: 'bold' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, backgroundColor: 'background.default', overflowY: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  );
}