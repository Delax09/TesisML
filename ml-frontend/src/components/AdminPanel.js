// src/components/AdminPanel.js
import React, { useState } from 'react';
import { 
    Box, Paper, Typography, Grid, Button, 
    Dialog, DialogActions, DialogContent, 
    DialogContentText, DialogTitle, CircularProgress 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UpdateIcon from '@mui/icons-material/Update';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { adminService, iaService } from 'services';
import toast from 'react-hot-toast';

function AdminPanel() {
    const [cargando, setCargando] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, tarea: '', funcion: null });

    const abrirConfirmacion = (nombreTarea, funcion) => {
        setConfirmDialog({ open: true, tarea: nombreTarea, funcion: funcion });
    };

    const cerrarConfirmacion = () => {
        setConfirmDialog({ open: false, tarea: '', funcion: null });
    };

    const ejecutarTarea = async () => {
        const { tarea, funcion } = confirmDialog;
        cerrarConfirmacion();
        
        setCargando(true);
        const idNoti = toast.loading(`Ejecutando: ${tarea}...`);
        
        try {
            const response = await funcion();
            toast.success(response.message || "Tarea completada con éxito", { id: idNoti });
        } catch (e) {
            toast.error(`Error al ejecutar la tarea: ${tarea}`, { id: idNoti });
        } finally {
            setCargando(false);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#1e293b' }}>
                Mantenimiento del Sistema
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => abrirConfirmacion("importar tickers", adminService.importarTickers)}
                        disabled={cargando}
                        sx={{ bgcolor: '#34495e', py: 1.5 }}
                    >
                        Cargar Tickers (CSV)
                    </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<UpdateIcon />}
                        onClick={() => abrirConfirmacion("actualizar precios", adminService.actualizarPrecios)}
                        disabled={cargando}
                        sx={{ bgcolor: '#27ae60', py: 1.5 }}
                    >
                        Actualizar Precios
                    </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PsychologyIcon />}
                        onClick={() => abrirConfirmacion("ENTRENAR la IA", iaService.entrenarLSTM)}
                        disabled={cargando}
                        sx={{ bgcolor: '#8e44ad', py: 1.5 }}
                    >
                        Entrenar Modelo IA
                    </Button>
                </Grid>
            </Grid>

            {cargando && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, color: '#e67e22' }}>
                    <CircularProgress size={20} color="inherit" />
                    <Typography variant="body2" fontWeight="bold">
                        Procesando... no cierres la ventana.
                    </Typography>
                </Box>
            )}

            {/* Diálogo de Confirmación Genérico */}
            <Dialog open={confirmDialog.open} onClose={cerrarConfirmacion}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Tarea</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Seguro que deseas <strong>{confirmDialog.tarea}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={cerrarConfirmacion}>Cancelar</Button>
                    <Button onClick={ejecutarTarea} variant="contained" color="primary">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

export default AdminPanel;