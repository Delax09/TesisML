// ml-frontend/src/components/AnalisisIAButton.js
import React, { useState } from 'react';
import { 
    Button, 
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogContentText, 
    DialogTitle,
    Box,
    CircularProgress 
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { iaService } from 'services';
import toast from 'react-hot-toast';

function AnalisisIAButton({ onComplete }) {
    const [ejecutando, setEjecutando] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);

    const handleOpenConfirm = () => setOpenConfirm(true);
    const handleCloseConfirm = () => setOpenConfirm(false);

    const manejarEjecucionMasiva = async () => {
        handleCloseConfirm();
        setEjecutando(true);
        const idNotificacion = toast.loading("Iniciando análisis masivo de IA...");

        try {
            const response = await iaService.analizarTodo(); 
            toast.success(response.message || "¡Proceso masivo iniciado con éxito!", { id: idNotificacion });
            if (onComplete) onComplete(); 
        } catch (error) {
            console.error(error);
            toast.error("Error al iniciar el análisis masivo", { id: idNotificacion });
        } finally {
            setEjecutando(false);
        }
    };

    return (
        <Box>
            <Button
                variant="contained"
                onClick={handleOpenConfirm}
                disabled={ejecutando}
                startIcon={ejecutando ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
                sx={{
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    '&:hover': { backgroundColor: '#4338ca' }
                }}
            >
                {ejecutando ? 'Analizando Mercado...' : 'Ejecutar IA Masiva'}
            </Button>

            <Dialog open={openConfirm} onClose={handleCloseConfirm}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Deseas ejecutar el análisis de IA para todas las empresas?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={handleCloseConfirm}>Cancelar</Button>
                    <Button onClick={manejarEjecucionMasiva} variant="contained" sx={{ bgcolor: '#4f46e5' }}>
                        Sí, ejecutar ahora
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default AnalisisIAButton;