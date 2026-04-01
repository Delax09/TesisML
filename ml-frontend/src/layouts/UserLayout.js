// src/layouts/UserLayout.js
import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth, useThemeContext } from 'context';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, AppBar, Toolbar, IconButton 
} from '@mui/material';

// IMPORTAMOS EL NOMBRE DE LA APP
import { APP_NAME } from '../config';

import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AreaChartIcon from '@mui/icons-material/AreaChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

const drawerWidth = 250; // ¡Necesitamos esto para saber el ancho del menú!

export default function UserLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    // ESTILO DE ESTRUCTURA: Ocupar todo el alto y empujar los elementos
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography 
        variant="h6" 
        sx={{ 
          p: 2.5, 
          textAlign: 'center', 
          borderBottom: '1px solid',
          borderColor: 'layout.sidebarBorder', 
          fontWeight: 'bold' 
        }}
      >
        {APP_NAME}: Usuario
      </Typography>
      
      {/* flexGrow: 1 empuja el botón de "Cerrar Sesión" hacia abajo */}
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
        
        {/* MIRA QUÉ LIMPIOS QUEDAN LOS BOTONES AHORA */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/home" selected={isActivo('/home')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><HomeIcon /></ListItemIcon>
            <ListItemText primary="Mi Resumen" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/portafolio" selected={isActivo('/portafolio')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AccountBalanceWalletIcon /></ListItemIcon>
            <ListItemText primary="Gestionar Portafolio" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/analisis-portafolio" selected={isActivo('/analisis-portafolio')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><PieChartIcon /></ListItemIcon>
            <ListItemText primary="Análisis de Portafolio" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/proyecciones-ia" selected={isActivo('/proyecciones-ia')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AreaChartIcon /></ListItemIcon>
            <ListItemText primary="Proyecciones IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem> 

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/noticias" selected={isActivo('/noticias')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><NewspaperIcon /></ListItemIcon>
            <ListItemText primary="Noticias Financieras" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/mercado" selected={isActivo('/mercado')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AnalyticsIcon /></ListItemIcon>
            <ListItemText primary="Análisis de Mercado" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem> 
      </List>

      {/* BOTONES INFERIORES */}
      <List sx={{ px: 2, mb: 2 }}>

        {/* 1. NUEVO BOTÓN DE TEMA */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton onClick={toggleTheme}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              {mode === 'dark' ? <LightModeIcon sx={{ color: '#fbbf24' }} /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText 
              primary={mode === 'dark' ? "Modo Claro" : "Modo Oscuro"} 
              primaryTypographyProps={{ fontWeight: 500 }} 
            />
          </ListItemButton>
        </ListItem>

        {/* 2. BOTÓN DE CERRAR SESIÓN (Ya lo tenías) */}
        <ListItem disablePadding>
          <ListItemButton onClick={logout} sx={{ color: '#e74c3c' }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontWeight: 'bold' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    // ESTRUCTURA PRINCIPAL: Flex para separar menú izquierdo de contenido derecho
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* BARRA SUPERIOR (Solo se ve en móviles) */}
      <AppBar position="fixed" sx={{ display: { lg: 'none' }, bgcolor: 'layout.sidebar', width: '100%' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight="bold">{APP_NAME}</Typography>
        </Toolbar>
      </AppBar>

      {/* CONTENEDOR DEL MENÚ LATERAL */}
      <Box component="nav" sx={{ width: { xs: 0, lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        {/* Menú para celulares (oculto por defecto) */}
        <Drawer 
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} 
          sx={{ 
            display: { xs: 'block', lg: 'none' }, 
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, bgcolor: 'layout.sidebar', color: 'layout.sidebarText' } 
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Menú para PC (fijo siempre visible) */}
        <Drawer 
          variant="permanent" open
          sx={{ 
            display: { xs: 'none', lg: 'block' }, 
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: 'layout.sidebar', color: 'layout.sidebarText', borderRight: 'none' } 
          }} 
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* CONTENIDO PRINCIPAL (Donde se renderizan las páginas) */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, lg: 4 }, width: '100%', height: '100vh', bgcolor: 'background.default', overflowY: 'auto', overflowX: 'hidden' }}>
        <Toolbar sx={{ display: { lg: 'none' } }} /> {/* Espaciador para la barra móvil */}
        <Outlet />
      </Box>
    </Box>
  );
}