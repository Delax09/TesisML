// src/features/auth/components/ResetPasswordForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Paper } from '@mui/material';
import authService from '../../../services/authService';
import toast from 'react-hot-toast';

const ResetPasswordForm = ({ token }) => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!token) {
            return toast.error("Token de seguridad no encontrado. Vuelve a pedir el correo.");
        }
        if (password !== confirmPassword) {
            return toast.error("Las contraseñas no coinciden.");
        }

        setCargando(true);
        try {
            await authService.resetearPassword(token, password);
            toast.success("¡Contraseña actualizada! Ya puedes iniciar sesión.");
            navigate('/'); // Redirige al login
        } catch (error) {
            toast.error(error.response?.data?.detail || "El token es inválido o ha expirado.");
        } finally {
            setCargando(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
            <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
                Nueva Contraseña
            </Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Nueva Contraseña"
                    type="password"
                    margin="normal"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Confirmar Contraseña"
                    type="password"
                    margin="normal"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3 }}
                    disabled={cargando}
                >
                    {cargando ? 'Guardando...' : 'Guardar Contraseña'}
                </Button>
            </form>
        </Paper>
    );
};

export default ResetPasswordForm;