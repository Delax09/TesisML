// src/pages/Landing/Landing.js
import React, { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context'; // Ajustado dependiendo de tu baseUrl

import { 
    Button, Typography, Box, AppBar, Toolbar, Dialog, DialogContent, IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import landing1 from 'assets/landing1.png';

// IMPORTAMOS EL NOMBRE DE LA APP
import { APP_NAME } from 'config'; 

// 1. IMPORTAMOS LOS COMPONENTES DESDE SUS NUEVOS FEATURES
import AuthForm from '../../features/auth/components/AuthForm';
import EmpresaTable from '../../features/empresas/components/EmpresaTable';

// 2. IMPORTAMOS EL HOOK QUE TRAE LOS DATOS
import { useEmpresas } from '../../features/empresas/hooks/useEmpresas';

export default function Landing() {
    const [modalAuth, setModalAuth] = useState({ open: false, esRegistro: false });
    const { usuario } = useAuth();

    // 3. EJECUTAMOS EL HOOK PARA OBTENER LOS DATOS
    const { empresas, sectores, cargando } = useEmpresas();

    const manejarSeleccionEmpresa = useCallback((id, nombre) => {
        abrirModalAuth(true); // Abre el modal de registro automáticamente
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
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                        {APP_NAME}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="outlined" color="primary" size="large"
                            onClick={() => abrirModalAuth(false)} 
                            sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        >
                            Iniciar Sesión
                        </Button>
                        <Button 
                            variant="contained" color="primary" size="large"
                            onClick={() => abrirModalAuth(true)} 
                            sx={{ fontWeight: 'bold', borderRadius: 2, display: { xs: 'none', sm: 'flex' } }}
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
                        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6, fontWeight: 'normal' }}>
                            Plataforma avanzada de análisis financiero impulsada por Machine Learning. 
                            Gestiona tu portafolio, visualiza tendencias y toma decisiones informadas 
                            con nuestros modelos predictivos de vanguardia.
                        </Typography>
                        <Button 
                            variant="contained" color="primary" size="large"
                            onClick={() => abrirModalAuth(true)} 
                            sx={{ py: 1.5, px: 4, fontSize: '1.1rem', fontWeight: 'bold', borderRadius: 2, boxShadow: 3 }}
                        >
                            Comenzar ahora
                        </Button>
                    </Box>
                    
                    <Box sx={{ width: '400px', height: '300px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px' }}>  
                        <img src={landing1} alt="Ilustración de análisis financiero" style={{ maxWidth: '100%', maxHeight: '100%' }} />             
                    </Box>
                </Box>

                <Box sx={{ width: '100%', maxWidth: '1200px', mb: 4 }}>
                    {/* 4. PASAMOS LOS DATOS AL COMPONENTE VISUAL */}
                    <EmpresaTable 
                        empresas={empresas}
                        sectores={sectores}
                        cargando={cargando}
                        onSelect={manejarSeleccionEmpresa} 
                    />
                </Box>

            </Box>

            <Dialog 
                open={modalAuth.open} onClose={cerrarModalAuth} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
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