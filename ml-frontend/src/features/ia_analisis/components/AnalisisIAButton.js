// src/features/ia_analisis/components/AnalisisIAButton.js
import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, CircularProgress } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useAnalisisMasivo } from '../hooks/useAnalisisMasivo';

export default function AnalisisIAButton({ onComplete }) {
    const { ejecutando, openConfirm, setOpenConfirm, manejarEjecucionMasiva } = useAnalisisMasivo(onComplete);

    return (
        <Box>
            <Button
                variant="contained" 
                color="secondary" // Cambiado: Usamos el nombre del tema
                onClick={() => setOpenConfirm(true)} 
                disabled={ejecutando}
                startIcon={ejecutando ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
                size="large" // Usamos los tamaños predefinidos
            >
                {ejecutando ? 'Analizando Mercado...' : 'Ejecutar IA Masiva'}
            </Button>

            <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>¿Deseas ejecutar el análisis de IA para todas las empresas?</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setOpenConfirm(false)} color="inherit">Cancelar</Button>
                    <Button onClick={manejarEjecucionMasiva} variant="contained" color="secondary">Sí, ejecutar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}