// src/features/landing/components/LandingNavbar.js
import React, { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, 
    Button, IconButton, Tooltip, Container,
    Menu, MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu'; // Importamos el icono de menú
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { APP_NAME } from 'config';

const LandingNavbar = ({ mode, toggleTheme, abrirModalAuth, activeTab, setActiveTab }) => {
    // Estado para el menú móvil
    const [anchorElNav, setAnchorElNav] = useState(null);

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = (index) => {
        setAnchorElNav(null);
        if (typeof index === 'number') {
            setActiveTab(index);
        }
    };
    
    const navTabs = [
        { title: 'Inicio', index: 0 },
        { title: 'Nosotros', index: 1 },
        { title: 'FAQ', index: 2 },
        { title: 'Contacto', index: 3 }
    ];

    return (
        <AppBar 
            position="sticky" 
            color="inherit" 
            elevation={1} 
            sx={{ top: 0, zIndex: 1100, opacity: 0.98 }} // Opacidad para un efecto de transparencia
        >
            <Container maxWidth="lg"> 
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    
                    {/* LOGO Y MENÚ MÓVIL (IZQUIERDA) */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }} >
                        <IconButton
                            size="large"
                            aria-label="menu de navegacion"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleOpenNavMenu}
                            color="inherit"
                            sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography 
                            variant="h5" 
                            component="div" 
                            onClick={() => setActiveTab(0)}
                            sx={{ 
                                fontWeight: 'bold', 
                                color: 'text.primary',
                                cursor: 'pointer',
                                fontSize: { xs: '1.2rem', sm: '1.5rem' }
                            }}
                        >
                            {APP_NAME || 'TesisML'}
                        </Typography>
                    </Box>

                    {/* MENÚ DESPLEGABLE (MÓVIL) */}
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorElNav}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        keepMounted
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        open={Boolean(anchorElNav)}
                        onClose={() => handleCloseNavMenu()}
                        sx={{ display: { xs: 'block', md: 'none' } }}
                    >
                        {navTabs.map((tab) => (
                            <MenuItem key={tab.title} onClick={() => handleCloseNavMenu(tab.index)}>
                                <Typography textAlign="center" sx={{ fontWeight: activeTab === tab.index ? 700 : 400 }}>
                                    {tab.title}
                                </Typography>
                            </MenuItem>
                        ))}
                    </Menu>
                    
                    {/* ENLACES CENTRALES (ESCRITORIO) */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}> 
                        {navTabs.map((tab) => (
                            <Button 
                                key={tab.title}
                                onClick={() => setActiveTab(tab.index)}
                                sx={{ 
                                    color: activeTab === tab.index ? 'primary.main' : 'text.secondary', 
                                    fontWeight: activeTab === tab.index ? 700 : 500,
                                    textTransform: 'none', 
                                    fontSize: '1rem',
                                    borderBottom: activeTab === tab.index ? '2px solid' : '2px solid transparent',
                                    borderColor: activeTab === tab.index ? 'primary.main' : 'transparent',
                                    borderRadius: 0,
                                    pb: 0.5,
                                    px: 1.5,
                                    '&:hover': { backgroundColor: 'transparent', color: 'primary.main' } 
                                }}
                            >
                                {tab.title}
                            </Button>
                        ))}
                    </Box>

                    {/* ACCIONES DERECHA */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
                        <Tooltip title={mode === 'dark' ? "Modo Claro" : "Modo Oscuro"}>
                            <IconButton onClick={toggleTheme} color="inherit">
                                {mode === 'dark' ? <LightModeIcon sx={{ color: '#fbbf24' }} /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>

                        <Button 
                            variant="outlined" 
                            color="primary"
                            onClick={() => abrirModalAuth(false)} 
                            sx={{ fontWeight: 'bold', minWidth: { xs: '80px', sm: '110px' }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                            Ingresar
                        </Button>

                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => abrirModalAuth(true)} 
                            sx={{ 
                                fontWeight: 'bold', 
                                display: { xs: 'none', sm: 'flex' }, 
                                minWidth: '110px' 
                            }}
                        >
                            Registrarse
                        </Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default LandingNavbar;