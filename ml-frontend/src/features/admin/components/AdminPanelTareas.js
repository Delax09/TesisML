// src/features/admin/components/AdminPanelTareas.js
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UpdateIcon from '@mui/icons-material/Update';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { adminService, iaService } from '../../../services';
import { useMantenimiento } from '../hooks/useMantenimiento';

export default function AdminPanelTareas() {
    const { cargando, confirmDialog, abrirConfirmacion, cerrarConfirmacion, ejecutarTarea } = useMantenimiento();

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="#1e293b">Mantenimiento del Sistema</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button fullWidth variant="contained" startIcon={<CloudUploadIcon />} onClick={() => abrirConfirmacion("importar tickers", adminService.importarTickers)} disabled={cargando} sx={{ bgcolor: '#34495e', py: 1.5 }}>
                        Cargar Tickers
                    </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button fullWidth variant="contained" startIcon={<UpdateIcon />} onClick={() => abrirConfirmacion("actualizar precios", adminService.actualizarPrecios)} disabled={cargando} sx={{ bgcolor: '#27ae60', py: 1.5 }}>
                        Actualizar Precios
                    </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Button fullWidth variant="contained" startIcon={<PsychologyIcon />} onClick={() => abrirConfirmacion("ENTRENAR la IA", iaService.entrenarLSTM)} disabled={cargando} sx={{ bgcolor: '#8e44ad', py: 1.5 }}>
                        Entrenar IA Masiva
                    </Button>
                </Grid>
            </Grid>

            {cargando && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, color: '#e67e22' }}>
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
                    <Button onClick={cerrarConfirmacion}>Cancelar</Button>
                    <Button onClick={ejecutarTarea} variant="contained" color="primary">Confirmar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}