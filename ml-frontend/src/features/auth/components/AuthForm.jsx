import React, { useState, useEffect } from 'react';
import { useAuth } from 'context'; // Asegúrate de que esta ruta sea la correcta en tu proyecto
import toast from 'react-hot-toast';
import { 
    Box, 
    TextField, 
    Button, 
    Typography, 
    CircularProgress,
    InputAdornment,
    Link 
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { Link as RouterLink } from 'react-router-dom';

// AÑADIDO: Recibimos la prop 'isOpen'
function AuthForm({ modoInicialRegistro = false, isOpen = true }) {
    const { login, registro } = useAuth(); 
    
    const [esRegistro, setEsRegistro] = useState(modoInicialRegistro);
    
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

    // AÑADIDO: Ahora reacciona también a 'isOpen'
    useEffect(() => {
        // Solo limpiamos y reseteamos el modo si el modal se está abriendo
        if (isOpen) {
            setEsRegistro(modoInicialRegistro);
            limpiarFormulario();
        }
    }, [modoInicialRegistro, isOpen]);

    const alternarModo = () => {
        setEsRegistro(!esRegistro);
        limpiarFormulario();
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        setCargando(true);
        
        let result;
        if (esRegistro) {
            result = await registro(nombre, apellido, email, password);
        } else {
            result = await login(email, password);
        }
        
        if (!result.success) {
            toast.error(result.message, {
                duration: 4000,
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
            });
            setCargando(false);
        } else {
            toast.success(esRegistro ? '¡Registro exitoso!' : '¡Bienvenido!');
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
                        InputProps={{ startAdornment: (<InputAdornment position="start"><PersonIcon color="action" fontSize="small" /></InputAdornment>) }}
                    />
                    <TextField 
                        label="Apellido" required 
                        value={apellido} onChange={(e) => setApellido(e.target.value)}
                    />
                </Box>
            )}

            <TextField 
                label="Correo Electrónico" type="email" required 
                value={email} onChange={(e) => setEmail(e.target.value)} 
                InputProps={{ startAdornment: (<InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>) }}
            />
            
            <TextField 
                label="Contraseña" type="password" required 
                value={password} onChange={(e) => setPassword(e.target.value)} 
                InputProps={{ startAdornment: (<InputAdornment position="start"><LockIcon color="action" /></InputAdornment>) }}
            />

            <Button 
                type="submit" 
                variant="contained" color="primary" size="large" fullWidth disabled={cargando}
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

            {!esRegistro && (
                <Typography variant="body2" align="center" sx={{ mt: 0.5 }}>
                    <Link 
                        component={RouterLink} 
                        to="/olvide-password" 
                        variant="body2" 
                        underline="hover"
                        fontWeight="500"
                        color="primary"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </Typography>
            )}
        </Box>
    );
}

export default AuthForm;