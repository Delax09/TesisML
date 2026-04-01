// src/features/admin/components/AdminPanelTareas.js
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress, Divider } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UpdateIcon from '@mui/icons-material/Update';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { adminService, iaService } from '../../../services';
import { useMantenimiento } from '../hooks/useMantenimiento';

export default function AdminPanelTareas() {
    const { cargando, confirmDialog, abrirConfirmacion, cerrarConfirmacion, ejecutarTarea } = useMantenimiento();

    return (
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
                Mantenimiento del Sistema
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button 
                        fullWidth variant="contained" color="inherit" 
                        startIcon={<CloudUploadIcon />} 
                        onClick={() => abrirConfirmacion("importar tickers", adminService.importarTickers)} 
                        disabled={cargando}
                    >
                        Cargar Tickers
                    </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button 
                        fullWidth variant="contained" color="primary" // Usamos el verde esmeralda
                        startIcon={<UpdateIcon />} 
                        onClick={() => abrirConfirmacion("actualizar precios", adminService.actualizarPrecios)} 
                        disabled={cargando}
                    >
                        Actualizar Precios
                    </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button 
                        fullWidth variant="contained" color="secondary" // Usamos el índigo
                        startIcon={<PsychologyIcon />} 
                        onClick={() => abrirConfirmacion("ENTRENAR la IA", iaService.entrenarLSTM)} 
                        disabled={cargando}
                    >
                        Entrenar IA Masiva
                    </Button>
                </Grid>
            </Grid>

            {cargando && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, color: 'warning.main' }}>
                    <CircularProgress size={20} color="inherit" />
                    <Typography variant="body2" fontWeight="bold">Procesando... no cierres la ventana.</Typography>
                </Box>
            )}

            <Dialog open={confirmDialog.open} onClose={cerrarConfirmacion}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Tarea</DialogTitle>
                <DialogContent>
                    <DialogContentText>¿Seguro que deseas <strong>{confirmDialog.tarea}</strong>?</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={cerrarConfirmacion} color="inherit">Cancelar</Button>
                    <Button onClick={ejecutarTarea} variant="contained" color="primary">Confirmar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}