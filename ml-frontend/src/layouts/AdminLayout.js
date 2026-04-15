// src/layouts/AdminLayout.js
import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth, useThemeContext } from 'context';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, AppBar, Toolbar, IconButton 
} from '@mui/material';

// IMPORTAMOS EL NOMBRE DE LA APP
import { APP_NAME } from '../config'; 

// Íconos
import BuildIcon from '@mui/icons-material/Build'; 
import AnalyticsIcon from '@mui/icons-material/Analytics'; 
import BusinessIcon from '@mui/icons-material/Business'; 
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DataSaverOnIcon from '@mui/icons-material/DataSaverOn';


const drawerWidth = 250;

export default function AdminLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography 
        variant="h6" 
        sx={{ 
          display: { xs: 'none', lg: 'block' },
          p: 2.5, 
          textAlign: 'center', 
          borderBottom: '1px solid',
          borderColor: 'layout.sidebarBorder', // <-- Simplificado con el tema
          fontWeight: 'bold' 
        }}
      >
        {/* USAMOS LA VARIABLE AQUÍ */}
        {APP_NAME}: Admin
      </Typography>
      
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
        {/* BOTONES LIMPIOS SIN EL SX GIGANTE */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/tareas" selected={isActivo('/admin/tareas')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><BuildIcon /></ListItemIcon>
            <ListItemText primary="Tareas ML" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>


        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/metricas" selected={isActivo('/admin/metricas')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><DataSaverOnIcon /></ListItemIcon>
            <ListItemText primary="Métricas de IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/comparador-ia" selected={isActivo('/admin/comparador-ia')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AnalyticsIcon /></ListItemIcon>
            <ListItemText primary="Comparador IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/empresas" selected={isActivo('/admin/empresas')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><BusinessIcon /></ListItemIcon>
            <ListItemText primary="Gestión Empresas" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/modelos-ia" selected={isActivo('/admin/modelos-ia')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><SmartToyIcon /></ListItemIcon>
            <ListItemText primary="Gestión Modelos IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton component={RouterLink} to="/admin/accesos" selected={isActivo('/admin/accesos')} onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><SmartToyIcon /></ListItemIcon>
            <ListItemText primary="Gestión Accesos" primaryTypographyProps={{ fontWeight: 500 }} />
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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* APPBAR SIMPLIFICADO */}
      <AppBar position="fixed" sx={{ display: { lg: 'none' }, bgcolor: 'layout.sidebar', color: 'layout.sidebarText', width: '100%' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          {/* USAMOS LA VARIABLE AQUÍ */}
          <Typography variant="h6" noWrap component="div" fontWeight="bold">{APP_NAME} Admin</Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { xs: 0, lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer 
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} 
          sx={{ 
            display: { xs: 'block', lg: 'none' }, 
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, bgcolor: 'layout.sidebar', color: 'layout.sidebarText' } 
          }}
        >
          {drawerContent}
        </Drawer>
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

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, lg: 4 }, width: { xs: '100%', lg: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'background.default', overflowY: 'auto' }}>
        <Toolbar sx={{ display: { lg: 'none' } }} />
        <Outlet />
      </Box>
    </Box>
  );
}