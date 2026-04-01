// src/pages/Landing/Landing.js
import React, { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useThemeContext } from '../../context'; 

import {
    Button, Typography, Box, AppBar, Toolbar, Dialog, DialogContent, IconButton, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import landing1 from 'assets/landing1.png';

import { APP_NAME } from 'config';
import AuthForm from '../../features/auth/components/AuthForm';
import EmpresaTable from '../../features/empresas/components/EmpresaTable';
import { useEmpresas } from '../../features/empresas/hooks/useEmpresas';

export default function Landing() {
    const [modalAuth, setModalAuth] = useState({ open: false, esRegistro: false });
    const { usuario } = useAuth();
    const { mode, toggleTheme } = useThemeContext();

    const { empresas, sectores, cargando } = useEmpresas();

    const manejarSeleccionEmpresa = useCallback((id, nombre) => {
        abrirModalAuth(true); 
    }, []);

    const abrirModalAuth = (modoRegistro) => {
        setModalAuth({ open: true, esRegistro: modoRegistro });
    };

    const cerrarModalAuth = () => {
        setModalAuth((prev) => ({ ...prev, open: false }));
    };

    if (usuario) {
        return <Navigate to={usuario.rol === 'admin' ? '/panel' : '/home'} replace />;
    }

    return (
        <Box sx={{ minHeight: '100vh', height: '100vh', overflowY: 'auto', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            
            <AppBar position="static" color="inherit" elevation={1} sx={{ px: { xs: 2, md: '5%' } }}>
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    {/* LOGO / NOMBRE */}
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {APP_NAME}
                    </Typography>
                    
                    {/* ACCIONES DERECHA */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                        
                        {/* BOTÓN DE MODO CLARO/OSCURO (Limpio y alineado) */}
                        <Tooltip title={mode === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}>
                            <IconButton onClick={toggleTheme} color="inherit">
                                {mode === 'dark' ? <LightModeIcon sx={{ color: '#fbbf24' }} /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>

                        <Button 
                            variant="outlined" 
                            color="primary"
                            onClick={() => abrirModalAuth(false)} 
                            sx={{ fontWeight: 'bold' }}
                        >
                            Ingresar
                        </Button>

                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => abrirModalAuth(true)} 
                            sx={{ fontWeight: 'bold', display: { xs: 'none', sm: 'flex' } }}
                        >
                            Registrarse
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 2, md: 4 }, gap: 6 }}>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: '1200px', flexWrap: 'wrap', gap: 4, mt: 4 }}>
                    <Box sx={{ maxWidth: '500px' }}>
                        <Typography variant="h3" component="h1" sx={{ fontWeight: '900', color: 'text.primary', mb: 2, lineHeight: 1.2 }}>
                            Predicción Inteligente del Mercado
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
                            Plataforma avanzada de análisis financiero impulsada por Machine Learning. 
                            Visualiza tendencias y toma decisiones informadas con modelos predictivos de vanguardia.
                        </Typography>
                        <Button 
                            variant="contained" color="primary" size="large"
                            onClick={() => abrirModalAuth(true)} 
                            sx={{ boxShadow: 3 }}
                        >
                            Comenzar ahora
                        </Button>
                    </Box>
                    
                    <Box sx={{ width: '400px', height: '300px', borderRadius: 4, display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}>  
                        <img src={landing1} alt="Análisis financiero" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px' }} />            
                    </Box>
                </Box>
                
                <Box sx={{ width: '100%', maxWidth: '1200px', mb: 4 }}>
                    <EmpresaTable 
                        empresas={empresas}
                        sectores={sectores}
                        cargando={cargando}
                        onSelect={manejarSeleccionEmpresa} 
                    />
                </Box>
            </Box>

            <Dialog 
                open={modalAuth.open} 
                onClose={cerrarModalAuth} 
                maxWidth="xs" 
                fullWidth
                disableRestoreFocus
            >
                <DialogContent sx={{ position: 'relative' }}>
                    <IconButton onClick={cerrarModalAuth} sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}>
                        <CloseIcon />
                    </IconButton>
                    <AuthForm modoInicialRegistro={modalAuth.esRegistro} />
                </DialogContent>
            </Dialog>

        </Box>
    );
}