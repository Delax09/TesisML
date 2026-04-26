// src/features/auth/components/OlvidePasswordForm.js
import React, { useState } from 'react';
import { Button, TextField, Typography, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // <-- Importamos para el botón de regreso
import authService from '../../../services/authService';
import toast from 'react-hot-toast';

const OlvidePasswordForm = () => {
    const [email, setEmail] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const res = await authService.solicitarRecuperacion(email);
            toast.success(res.message || "Correo enviado exitosamente");
            setEmail('');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al solicitar recuperación");
        } finally {
            setCargando(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
            <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
                Recuperar Contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" mb={3}>
                Ingresa tu correo registrado y te enviaremos un enlace para crear una nueva contraseña.
            </Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Correo Electrónico"
                    type="email"
                    variant="outlined"
                    margin="normal"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2, mb: 1 }}
                    disabled={cargando}
                >
                    {cargando ? 'Enviando...' : 'Enviar Enlace'}
                </Button>
                
                {/* --- BOTÓN PARA REGRESAR --- */}
                <Button
                    component={RouterLink}
                    to="/"
                    fullWidth
                    variant="text"
                    color="inherit"
                    sx={{ mt: 1, textTransform: 'none' }}
                >
                    Volver al inicio de sesión
                </Button>
            </form>
        </Paper>
    );
};

export default OlvidePasswordForm;