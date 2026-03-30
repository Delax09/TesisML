// src/layouts/UserLayout.js
import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from 'context';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, AppBar, Toolbar, IconButton 
} from '@mui/material';

import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AreaChartIcon from '@mui/icons-material/AreaChart';

const drawerWidth = 250;

export default function UserLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ p: 2.5, textAlign: 'center', borderBottom: '1px solid #34495e', fontWeight: 'bold' }}>
        TesisML - Usuario
      </Typography>
      
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
      
        {/* 1. DASHBOARD PRINCIPAL */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/home"
            selected={isActivo('/home')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2,
              '&.Mui-selected': { backgroundColor: '#34495e' },
              '&.Mui-selected:hover': { backgroundColor: '#34495e' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><HomeIcon /></ListItemIcon>
            <ListItemText primary="Mi Resumen" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>



        {/* 2. GESTIONAR PORTAFOLIO */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/portafolio"
            selected={isActivo('/portafolio')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2,
              '&.Mui-selected': { backgroundColor: '#34495e' },
              '&.Mui-selected:hover': { backgroundColor: '#34495e' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AccountBalanceWalletIcon /></ListItemIcon>
            <ListItemText primary="Gestionar Portafolio" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>


        {/* Proyecciones IA */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/proyecciones-ia"
            selected={isActivo('/proyecciones-ia')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2,
              '&.Mui-selected': { backgroundColor: '#34495e' },
              '&.Mui-selected:hover': { backgroundColor: '#34495e' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AreaChartIcon /></ListItemIcon>
            <ListItemText primary="Proyecciones IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem> 



        {/* ANÁLISIS DE MERCADO */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/mercado"
            selected={isActivo('/mercado')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2,
              '&.Mui-selected': { backgroundColor: '#34495e' },
              '&.Mui-selected:hover': { backgroundColor: '#34495e' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AnalyticsIcon /></ListItemIcon>
            <ListItemText primary="Análisis de Mercado" primaryTypographyProps={{ fontWeight: 500 }} />
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
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      <AppBar
        position="fixed"
        sx={{
          display: { lg: 'none' },
          backgroundColor: '#2c3e50',
          width: '100%' // Aseguramos que no se desborde
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight="bold">
            TesisML
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Forzamos que el contenedor lateral tome 0px en tablets/móviles */}
      <Box component="nav" sx={{ width: { xs: 0, lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#2c3e50', color: '#ecf0f1' },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#2c3e50', color: '#ecf0f1', borderRight: 'none' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Forzamos el ancho exacto del contenido */}
      {/* CONTENIDO PRINCIPAL */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          // p: Padding. Reducido en móvil, amplio en PC.
          p: { xs: 2, sm: 3, lg: 4 }, 
          // Ancho: Ocupa todo el espacio sobrante que le deja el menú flexGrow
          width: '100%', 
          // Altura: Ocupa toda la pantalla
          height: '100vh',
          backgroundColor: 'background.default', 
          overflowY: 'auto',
          overflowX: 'hidden' // <-- ESTO EVITA QUE SE DESBORDE HACIA LA DERECHA
        }}
      >
        {/* Este Toolbar fantasma empuja tu contenido exactamente por debajo de la barra superior en móviles */}
        <Toolbar sx={{ display: { lg: 'none' } }} />
        
        <Outlet />
      </Box>
    </Box>
  );
}