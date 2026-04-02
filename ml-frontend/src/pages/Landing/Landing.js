// src/pages/Landing/Landing.js
import React, { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useThemeContext } from '../../context'; 

import { Box, Dialog, DialogContent, IconButton, Grid, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Importación de imágenes
import fondoClaro from '../../assets/modo-claro.jpg';
import fondoOscuro from '../../assets/modo-oscuro.avif'; // Asegúrate de usar la extensión correcta

import AuthForm from '../../features/auth/components/AuthForm';
import EmpresaTable from '../../features/empresas/components/EmpresaTable';
import { useEmpresas } from '../../features/empresas/hooks/useEmpresas';

import LandingNavbar from '../../features/landing/components/LandingNavbar'; 
import HeroSection from '../../features/landing/components/HeroSection';
import MisionVisionSection from '../../features/landing/components/MisionVisionSection';
import FaqSection from '../../features/landing/components/FaqSection';
import ContactoSection from '../../features/landing/components/ContactoSection';

export default function Landing() {
    const [modalAuth, setModalAuth] = useState({ open: false, esRegistro: false });
    const [activeTab, setActiveTab] = useState(0); 
    
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
        <Box sx={{ 
            minHeight: '100vh', 
            height: '100vh', 
            overflowY: 'auto', 
            backgroundColor: 'background.default', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative', // Necesario para el posicionamiento del fondo
        }}>
            
            {/* CAPA DE FONDO CON OPACIDAD */}
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Por detrás de todo
                backgroundImage: `url(${mode === 'dark' ? fondoOscuro : fondoClaro})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: mode === 'dark' ? 0.15 : 0.25, // Opacidad ajustable
                transition: 'background-image 0.5s ease-in-out, opacity 0.5s ease-in-out',
                pointerEvents: 'none', // Para que no interfiera con los clics
            }} />

            <LandingNavbar 
                mode={mode} 
                toggleTheme={toggleTheme} 
                abrirModalAuth={abrirModalAuth} 
                activeTab={activeTab}         
                setActiveTab={setActiveTab}   
            />

            {/* Contenedor principal con zIndex para estar sobre el fondo */}
            <Box component="main" sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                p: { xs: 2, md: 4 }, 
                pb: 8,
                position: 'relative',
                zIndex: 1 
            }}>
                
                {activeTab === 0 && (
                    <Grid 
                        container 
                        spacing={4} 
                        sx={{ 
                            width: '100%', 
                            maxWidth: '1400px', 
                            mx: 'auto', 
                            alignItems: 'center',
                            minHeight: { md: '80vh' }
                        }}
                    >
                        <Grid size={{ xs: 12, md: 5, lg: 5 }}>
                            <Box sx={{ pr: { md: 4 } }}>
                                <HeroSection abrirModalAuth={abrirModalAuth} />
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, md: 7, lg: 7 }}>
                            <Paper elevation={0} sx={{ 
                                p: { xs: 2, md: 4 }, 
                                borderRadius: 4, 
                                backgroundColor: 'background.paper', 
                                border: '1px solid', 
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                height: { xs: 'auto', md: '80vh' },
                                backdropFilter: 'blur(4px)', // Opcional: difumina un poco el fondo tras la tabla
                            }}>
                                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                                    <EmpresaTable 
                                        empresas={empresas}
                                        sectores={sectores}
                                        cargando={cargando}
                                        onSelect={manejarSeleccionEmpresa} 
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {/* Resto de pestañas... */}
                {activeTab === 1 && <Box sx={{ width: '100%', mt: { xs: 4, md: 8 }, display: 'flex', justifyContent: 'center' }}><MisionVisionSection /></Box>}
                {activeTab === 2 && <Box sx={{ width: '100%', mt: { xs: 4, md: 8 }, display: 'flex', justifyContent: 'center' }}><FaqSection /></Box>}
                {activeTab === 3 && <Box sx={{ width: '100%', mt: { xs: 4, md: 8 }, display: 'flex', justifyContent: 'center' }}><ContactoSection /></Box>}

            </Box>

            <Dialog open={modalAuth.open} onClose={cerrarModalAuth} maxWidth="xs" fullWidth disableRestoreFocus>
                <DialogContent sx={{ position: 'relative', p: 4 }}>
                    <IconButton onClick={cerrarModalAuth} sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}>
                        <CloseIcon />
                    </IconButton>
                    <AuthForm modoInicialRegistro={modalAuth.esRegistro} />
                </DialogContent>
            </Dialog>
        </Box>
    );
}