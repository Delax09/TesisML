import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Grid, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import api from '../../../services/api'; 
import { notificar } from '../../../utils/notificaciones'; 

export default function ContactoSection() {
    const [formulario, setFormulario] = useState({
        nombre: '',
        email: '',
        asunto: '',
        mensaje: ''
    });
    const [enviando, setEnviando] = useState(false);

    const handleChange = (e) => {
        setFormulario({
            ...formulario,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setEnviando(true);

        try {
            await api.post('/contacto/enviar', formulario);
            notificar.exito('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.');
            setFormulario({ nombre: '', email: '', asunto: '', mensaje: '' });
        } catch (error) {
            console.error("Error al enviar el mensaje de contacto:", error);
            notificar.error('Hubo un problema al enviar el mensaje. Inténtalo más tarde.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Box component="section" id="contacto" sx={{ py: 8, width: '100%', maxWidth: '1200px', mx: 'auto' }}>
            <Typography variant="h3" component="h2" align="center" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
                Ponte en Contacto
            </Typography>
            <Typography variant="body1" align="center" sx={{ mb: 6, color: 'text.secondary' }}>
                ¿Tienes dudas o sugerencias? Escríbenos y te responderemos a la brevedad.
            </Typography>

            <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <Grid container spacing={6}>
                    {/* COLUMNA IZQUIERDA: INFORMACIÓN */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Información</Typography>
                        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                            <strong style={{ color: 'inherit' }}>Email:</strong> correo@consulta.com
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                            <strong style={{ color: 'inherit' }}>Ubicación:</strong> Santiago Metropolitan Region, Chile
                        </Typography>
                    </Grid>
                    
                    {/* COLUMNA DERECHA: FORMULARIO FUNCIONAL */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Box component="form" onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField 
                                        fullWidth 
                                        label="Nombre" 
                                        name="nombre"
                                        value={formulario.nombre}
                                        onChange={handleChange}
                                        variant="outlined" 
                                        required 
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField 
                                        fullWidth 
                                        label="Correo Electrónico" 
                                        name="email"
                                        type="email" 
                                        value={formulario.email}
                                        onChange={handleChange}
                                        variant="outlined" 
                                        required 
                                    />
                                </Grid>
                                {/* NUEVO CAMPO ASUNTO INTEGRADO AL DISEÑO */}
                                <Grid size={{ xs: 12 }}>
                                    <TextField 
                                        fullWidth 
                                        label="Asunto" 
                                        name="asunto"
                                        value={formulario.asunto}
                                        onChange={handleChange}
                                        variant="outlined" 
                                        required 
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField 
                                        fullWidth 
                                        label="Mensaje" 
                                        name="mensaje"
                                        value={formulario.mensaje}
                                        onChange={handleChange}
                                        multiline 
                                        rows={4} 
                                        variant="outlined" 
                                        required 
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Button 
                                        type="submit" 
                                        variant="contained" 
                                        color="primary" 
                                        size="large" 
                                        disabled={enviando}
                                        endIcon={enviando ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                        sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 2 }}
                                    >
                                        {enviando ? 'Enviando...' : 'Enviar Mensaje'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}