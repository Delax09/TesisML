// src/features/ia_analisis/components/EntrenamientoSelector.js
import React, { useState } from 'react';
import { useEntrenamientoIA } from '../hooks/useEntrenamientoIA';
import { 
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, 
    Button, Box, FormControl, Select, MenuItem, InputLabel, CircularProgress 
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';

export default function EntrenamientoSelector() {
    const { modelos, modeloSeleccionado, setModeloSeleccionado, entrenando, ejecutarEntrenamiento } = useEntrenamientoIA();
    const [modalAbierto, setModalAbierto] = useState(false);

    const modeloInfo = modelos.find(m => m.IdModelo === parseInt(modeloSeleccionado));

    const confirmarYEjecutar = () => {
        setModalAbierto(false);
        ejecutarEntrenamiento();
    };

    return (
        <>
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
                mx: 'auto'
            }}>
                <FormControl size="small" sx={{ width: { xs: '100%', sm: 'auto' }, flexGrow: 1 }}>
                    <InputLabel id="label-ia-entrenar-selector">Entrenar Modelo IA</InputLabel>
                    <Select
                        labelId="label-ia-entrenar-selector"
                        value={modeloSeleccionado}
                        label="Entrenar Modelo IA"
                        onChange={(e) => setModeloSeleccionado(e.target.value)}
                        disabled={entrenando}
                    >
                        {modelos.map((modelo) => (
                            <MenuItem key={modelo.IdModelo} value={modelo.IdModelo}>
                                {modelo.Nombre} (v{modelo.Version})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Button 
                    variant="contained" 
                    color="secondary" // Secundario para diferenciar que es una tarea de re-entrenamiento
                    startIcon={entrenando ? <CircularProgress size={20} color="inherit" /> : <PsychologyIcon />}
                    onClick={() => setModalAbierto(true)}
                    disabled={entrenando || !modeloSeleccionado || modelos.length === 0}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }} 
                >
                    {entrenando ? 'Entrenando...' : 'Entrenar Modelo'}
                </Button>
            </Box>

            <Dialog open={modalAbierto} onClose={() => setModalAbierto(false)}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirmar Entrenamiento</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas iniciar el entrenamiento para el modelo: <strong>{modeloInfo?.Nombre}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setModalAbierto(false)} color="inherit">Cancelar</Button>
                    <Button onClick={confirmarYEjecutar} variant="contained" color="secondary">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}