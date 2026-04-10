// src/features/ia_analisis/components/AnalisisIAButton.js
import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, Typography, CircularProgress } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useAnalisisMasivo } from '../hooks/useAnalisisMasivo';

export default function AnalisisIAButton({ onComplete }) {
    const { ejecutando, openConfirm, setOpenConfirm, manejarEjecucionMasiva } = useAnalisisMasivo(onComplete);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 2, 
            bgcolor: 'background.default', 
            p: 2, 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            width: '100%',
            maxWidth: '600px',
            mx: 'auto',
            mb: 2 // Margen inferior para separarlo del siguiente
        }}>
            <Typography variant="body1" fontWeight="medium" color="text.secondary" sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                Análisis Global (Todos los Modelos)
            </Typography>
            
            <Button
                variant="contained" 
                color="primary"
                onClick={() => setOpenConfirm(true)} 
                disabled={ejecutando}
                startIcon={ejecutando ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }}
            >
                {ejecutando ? 'Analizando Mercado...' : 'Ejecutar IA Masiva'}
            </Button>

            <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>¿Deseas ejecutar el análisis de IA para todas las empresas usando todos los modelos activos?</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setOpenConfirm(false)} color="inherit">Cancelar</Button>
                    <Button onClick={manejarEjecucionMasiva} variant="contained" color="primary">Sí, ejecutar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}