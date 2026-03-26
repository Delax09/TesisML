// src/pages/Landing/Landing.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'context';

// 1. IMPORTAMOS LOS COMPONENTES DE MATERIAL-UI
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

// Importamos tus componentes internos
import { 
    AuthForm, 
    AdminPanel, 
    AnalisisIAButton, 
    PrecioChart, 
    ResultadoPanel, 
    EmpresaTable 
} from 'components'; 

export default function Landing() {
    const [mostrarLogin, setMostrarLogin] = useState(false);
    const { usuario } = useAuth();
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: '' });

    const manejarSeleccionEmpresa = (id, nombre) => {
        setEmpresaSeleccionada({ id, nombre });
    };

    if (usuario) {
        return <Navigate to={usuario.rol === 'admin' ? '/panel' : '/home'} replace />;
    }

    return (
        <Box sx={{ minHeight: '100vh', height: '100vh', overflowY: 'auto', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            
            {/* NUEVA BARRA DE NAVEGACIÓN CON MUI */}
            <AppBar position="static" color="inherit" elevation={1} sx={{ px: '5%' }}>
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                        TesisML
                    </Typography>
                    
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        size="large"
                        onClick={() => setMostrarLogin(true)}
                        sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                        Iniciar Sesión
                    </Button>
                </Toolbar>
            </AppBar>

            {/* CONTENIDO PRINCIPAL */}
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 2, md: 4 }, gap: 4 }}>
                
                {/* HERO SECTION CON MUI */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', flexWrap: 'wrap', gap: 4, mb: 4, mt: 4 }}>
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
                            onClick={() => setMostrarLogin(true)}
                            sx={{ py: 1.5, px: 4, fontSize: '1.1rem', fontWeight: 'bold', borderRadius: 2, boxShadow: 3 }}
                        >
                            Comenzar ahora
                        </Button>
                    </Box>
                    
                    <Box sx={{ width: '400px', height: '300px', backgroundColor: 'grey.200', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '2px dashed', borderColor: 'grey.400' }}>
                        <Typography variant="h6" fontWeight="bold">Poner alguna imagen en el futuro</Typography>
                    </Box>
                </Box>

                {/* RESTO DE LOS COMPONENTES (Aún con los estilos antiguos temporales) */}
                <div style={estilos.contenedorSeccion}>
                    <h3 style={estilos.subtitulo}>Gestión de Datos</h3>
                    <AdminPanel /> 
                </div>

                <div style={{...estilos.contenedorSeccion, backgroundColor: '#f8f9ff', border: '1px solid #e0e7ff'}}>
                    <h3 style={{...estilos.subtitulo, color: '#4f46e5'}}>Inteligencia Artificial</h3>
                    <p style={estilos.descripcion}>
                        Calcula predicciones, RSI y Scores para todas las empresas activas en la base de datos.
                    </p>
                    <AnalisisIAButton onComplete={() => console.log("IA Masiva iniciada")} />
                </div>

                {empresaSeleccionada.id && (
                    <div style={estilos.barraInfo}>
                        <span>Visualizando datos de: <strong>{empresaSeleccionada.nombre}</strong></span>
                    </div>
                )}

                <div style={estilos.seccionAnalisis}>
                    <div style={{ flex: 3, minWidth: '300px' }}>
                        <PrecioChart empresaId={empresaSeleccionada.id} nombreEmpresa={empresaSeleccionada.nombre} />
                    </div>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <ResultadoPanel empresaId={empresaSeleccionada.id} />
                    </div>
                </div>

                <div style={estilos.seccionDatos}>
                    <EmpresaTable onSelect={manejarSeleccionEmpresa} />
                </div>

            </Box>

            {/* NUEVO MODAL FLOTANTE CON MUI (Dialog) */}
            <Dialog 
                open={mostrarLogin} 
                onClose={() => setMostrarLogin(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
            >
                <DialogContent sx={{ position: 'relative' }}>
                    {/* Botón de cerrar (X) en la esquina superior derecha */}
                    <IconButton 
                        onClick={() => setMostrarLogin(false)}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </IconButton>
                    
                    <AuthForm />
                </DialogContent>
            </Dialog>

        </Box>
    );
}

// Estilos temporales para los componentes que aún no migramos
const estilos = {
    contenedorSeccion: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', maxWidth: '1200px' },
    subtitulo: { fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' },
    descripcion: { fontSize: '1.1rem', color: '#475569', lineHeight: '1.6', marginBottom: '2rem' },
    barraInfo: { backgroundColor: '#e0e7ff', color: '#4338ca', padding: '10px 20px', borderRadius: '8px', width: '100%', maxWidth: '1200px', textAlign: 'center' },
    seccionAnalisis: { display: 'flex', gap: '20px', width: '100%', maxWidth: '1200px', flexWrap: 'wrap' },
    seccionDatos: { width: '100%', maxWidth: '1200px' }
};