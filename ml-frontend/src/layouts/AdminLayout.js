// src/layouts/AdminLayout.js
import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from 'context';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, AppBar, Toolbar, IconButton 
} from '@mui/material';

// Íconos
import BuildIcon from '@mui/icons-material/Build'; // Para Tareas/Mantenimiento
import AnalyticsIcon from '@mui/icons-material/Analytics'; // Para la IA
import BusinessIcon from '@mui/icons-material/Business'; // Para Empresas
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';

const drawerWidth = 250;

export default function AdminLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography 
        variant="h6" 
        sx={{ 
          p: 2.5, 
          textAlign: 'center', 
          borderBottom: (theme) => `1px solid ${theme.palette.layout.sidebarBorder}`, 
          fontWeight: 'bold' 
        }}
      >
        TesisML - Admin
      </Typography>
      
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
        
        {/* SECCIÓN 1: TAREAS / MANTENIMIENTO */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/admin/tareas"
            selected={isActivo('/admin/tareas')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2, 
              '&.Mui-selected': { backgroundColor: (theme) => theme.palette.layout.sidebarActive }, 
              '&.Mui-selected:hover': { backgroundColor: (theme) => theme.palette.layout.sidebarActive },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } 
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><BuildIcon /></ListItemIcon>
            <ListItemText primary="Tareas ML" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        {/* SECCIÓN 2: COMPARADOR IA */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/admin/comparador-ia"
            selected={isActivo('/admin/comparador-ia')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2, 
              '&.Mui-selected': { backgroundColor: (theme) => theme.palette.layout.sidebarActive }, 
              '&.Mui-selected:hover': { backgroundColor: (theme) => theme.palette.layout.sidebarActive },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } 
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AnalyticsIcon /></ListItemIcon>
            <ListItemText primary="Comparador IA" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

        {/* SECCIÓN 3: GESTIÓN DE EMPRESAS */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={RouterLink} 
            to="/admin/empresas"
            selected={isActivo('/admin/empresas')}
            onClick={() => setMobileOpen(false)}
            sx={{ 
              borderRadius: 2, 
              '&.Mui-selected': { backgroundColor: (theme) => theme.palette.layout.sidebarActive }, 
              '&.Mui-selected:hover': { backgroundColor: (theme) => theme.palette.layout.sidebarActive },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } 
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><BusinessIcon /></ListItemIcon>
            <ListItemText primary="Gestión Empresas" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>

      </List>

      <List sx={{ px: 2, mb: 2 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={logout} sx={{ borderRadius: 2, color: '#e74c3c', '&:hover': { backgroundColor: 'rgba(231, 76, 60, 0.1)' } }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontWeight: 'bold' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="fixed" sx={{ display: { lg: 'none' }, backgroundColor: (theme) => theme.palette.layout.sidebar, width: '100%' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight="bold">TesisML Admin</Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { xs: 0, lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer 
          variant="temporary" 
          open={mobileOpen} 
          onClose={handleDrawerToggle} 
          ModalProps={{ keepMounted: true }} 
          sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: (theme) => theme.palette.layout.sidebar, color: (theme) => theme.palette.layout.sidebarText } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer 
          variant="permanent" 
          sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', backgroundColor: (theme) => theme.palette.layout.sidebar, color: (theme) => theme.palette.layout.sidebarText, borderRight: 'none' } }} 
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, lg: 4 }, width: { xs: '100%', lg: `calc(100% - ${drawerWidth}px)` }, backgroundColor: 'background.default', overflowY: 'auto' }}>
        <Toolbar sx={{ display: { lg: 'none' } }} />
        <Outlet />
      </Box>
    </Box>
  );
}