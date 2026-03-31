// src/components/AuthForm.js
import React, { useState, useEffect } from 'react';
import { useAuth } from 'context';
import toast from 'react-hot-toast'; //
import { 
    Box, 
    TextField, 
    Button, 
    Typography, 
    CircularProgress,
    InputAdornment,
    Divider,
    Link
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';

function AuthForm({ modoInicialRegistro = false }) {
    const { login, registro } = useAuth(); 
    
    const [esRegistro, setEsRegistro] = useState(modoInicialRegistro);
    
    // Estados de los campos (se comparten entre login y registro)
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [cargando, setCargando] = useState(false);

    const limpiarFormulario = () => {
        setNombre('');
        setApellido('');
        setEmail('');
        setPassword('');
    };

    useEffect(() => {
        setEsRegistro(modoInicialRegistro);
        limpiarFormulario();
    }, [modoInicialRegistro]);

    const alternarModo = () => {
        setEsRegistro(!esRegistro);
        limpiarFormulario();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        
        let result;
        if (esRegistro) {
            result = await registro(nombre, apellido, email, password);
        } else {
            result = await login(email, password);
        }
        
        if (!result.success) {
            // USAMOS TOAST PARA EL ERROR
            toast.error(result.message, {
                duration: 4000,
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
            setCargando(false);
        } else {
            // MENSAJE DE ÉXITO
            toast.success(esRegistro ? '¡Registro exitoso!' : '¡Bienvenido!');
            // No quitamos el 'cargando' aquí porque el Landing.js redirigirá pronto
        }
    };

    return (
        <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', mt: 1 }}
        >
            <Typography variant="h5" align="center" fontWeight="900" color="text.primary">
                {esRegistro ? 'Crear una Cuenta' : '¡Hola de nuevo!'}
            </Typography>

            {esRegistro && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField 
                        label="Nombre" required 
                        value={nombre} onChange={(e) => setNombre(e.target.value)}
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><PersonIcon color="action" fontSize="small" /></InputAdornment>
                            ),
                        }}
                    />
                    <TextField 
                        label="Apellido" required 
                        value={apellido} onChange={(e) => setApellido(e.target.value)}
                        autoFocus
                    />
                </Box>
            )}

            <TextField 
                label="Correo Electrónico" type="email" required 
                value={email} onChange={(e) => setEmail(e.target.value)} 
                autoFocus
                InputProps={{
                    startAdornment: (<InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>),
                }}
            />
            
            <TextField 
                label="Contraseña" type="password" required 
                value={password} onChange={(e) => setPassword(e.target.value)} 
                autoFocus
                InputProps={{
                    startAdornment: (<InputAdornment position="start"><LockIcon color="action" /></InputAdornment>),
                }}
            />

            {/* HEMOS ELIMINADO EL TYPOGRAPHY DE ERROR YA QUE AHORA USAMOS TOASTS */}

            <Button 
                type="submit" variant="contained" color="primary" size="large" fullWidth disabled={cargando}
                sx={{ mt: 1, boxShadow: 3 }}
            >
                {cargando ? <CircularProgress size={24} color="inherit" /> : (esRegistro ? 'Registrarse' : 'Ingresar al sistema')}
            </Button>

            <Typography align="center" variant="body2" sx={{ mt: 1 }}>
                {esRegistro ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                <Link 
                    component="button" type="button" variant="body2" fontWeight="bold"
                    onClick={alternarModo}
                >
                    {esRegistro ? 'Inicia sesión aquí' : 'Regístrate aquí'}
                </Link>
            </Typography>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ backgroundColor: 'grey.100', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                    Usuarios de Prueba:
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Admin:</strong> admin@admin.cl | A12345dsa%d_!
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                    <strong>User:</strong> user@user.cl | A12345dsa%d_!
                </Typography>
            </Box>
        </Box>
    );
}

export default AuthForm;