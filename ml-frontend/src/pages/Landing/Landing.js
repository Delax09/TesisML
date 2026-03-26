// src/pages/Landing/Landing.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'context';

import { 
    Button, 
    Typography, 
    Box, 
    AppBar, 
    Toolbar, 
    Dialog, 
    DialogContent, 
    IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Solo importamos los componentes que realmente se usan en la Landing
import { 
    AuthForm, 
    EmpresaTable 
} from 'components'; 

export default function Landing() {
    // ESTADO: Maneja la visibilidad y el modo del modal
    const [modalAuth, setModalAuth] = useState({ open: false, esRegistro: false });
    
    const { usuario } = useAuth();
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: '' });

    const manejarSeleccionEmpresa = (id, nombre) => {
        setEmpresaSeleccionada({ id, nombre });
    };

    // Funciones para abrir y cerrar el modal dinámicamente
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
            
            {/* BARRA DE NAVEGACIÓN */}
            <AppBar position="static" color="inherit" elevation={1} sx={{ px: { xs: 2, md: '5%' } }}>
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                        TesisML
                    </Typography>
                    
                    {/* BOTONES DE LA BARRA SUPERIOR */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            size="large"
                            onClick={() => abrirModalAuth(false)} // Se abre en modo Login
                            sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        >
                            Iniciar Sesión
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            size="large"
                            onClick={() => abrirModalAuth(true)} // Se abre en modo Registro
                            sx={{ fontWeight: 'bold', borderRadius: 2, display: { xs: 'none', sm: 'flex' } }} // Se oculta en móviles muy pequeños
                        >
                            Registrarse
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 2, md: 4 }, gap: 6 }}>
                
                {/* SECCIÓN HERO (Banner Principal) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: '1200px', flexWrap: 'wrap', gap: 4, mt: 4 }}>
                    <Box sx={{ maxWidth: '500px' }}>
                        <Typography variant="h3" component="h1" sx={{ fontWeight: '900', color: 'text.primary', mb: 2, lineHeight: 1.2 }}>
                            Predicción Inteligente del Mercado
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6, fontWeight: 'normal' }}>
                            Plataforma avanzada de análisis financiero impulsada por Machine Learning. 
                            Gestiona tu portafolio, visualiza tendencias y toma decisiones informadas 
                            con nuestros modelos predictivos de vanguardia.
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            size="large"
                            onClick={() => abrirModalAuth(true)} // Ahora envía directo al modo Registro
                            sx={{ py: 1.5, px: 4, fontSize: '1.1rem', fontWeight: 'bold', borderRadius: 2, boxShadow: 3 }}
                        >
                            Comenzar ahora
                        </Button>
                    </Box>
                    
                    <Box sx={{ width: '400px', height: '300px', backgroundColor: 'grey.200', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '2px dashed', borderColor: 'grey.400' }}>
                        <Typography variant="h6" fontWeight="bold">Poner alguna imagen en el futuro</Typography>
                    </Box>
                </Box>

                {/* TABLA DE EMPRESAS (Reemplazo del div por Box con sx) */}
                <Box sx={{ width: '100%', maxWidth: '1200px', mb: 4 }}>
                    <EmpresaTable onSelect={manejarSeleccionEmpresa} />
                </Box>

            </Box>

            {/* MODAL DE AUTENTICACIÓN */}
            <Dialog 
                open={modalAuth.open} 
                onClose={cerrarModalAuth}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
            >
                <DialogContent sx={{ position: 'relative' }}>
                    <IconButton 
                        onClick={cerrarModalAuth}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </IconButton>
                    
                    {/* Le pasamos el modo actual al formulario */}
                    <AuthForm modoInicialRegistro={modalAuth.esRegistro} />
                </DialogContent>
            </Dialog>

        </Box>
    );
}