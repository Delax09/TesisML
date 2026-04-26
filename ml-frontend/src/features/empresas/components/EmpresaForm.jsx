// src/features/empresas/components/EmpresaForm.js
import React from 'react';
import { Box, Paper, Typography, TextField, MenuItem, FormControlLabel, Checkbox, Button } from '@mui/material';
import { useEmpresaForm } from '../hooks/useEmpresaForm';

export default function EmpresaForm({ empresaInicial, onSave, onCancel }) {
  const { sectores, register, errors, onSubmit } = useEmpresaForm(empresaInicial, onSave);

  const manejarEnvio = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Ejecutamos la función de validación de react-hook-form
    onSubmit(); 
  };

  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.default', borderRadius: '12px' }}>
      {/* QUITAMOS component="form" y onSubmit de aquí */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          {empresaInicial ? 'Editar' : 'Nueva'} Empresa
        </Typography>
        
        <TextField 
          label="Ticker (ej: AAPL)" 
          size="small"
          {...register("Ticket", { required: "El Ticker es obligatorio" })}
          error={!!errors.Ticket}
          helperText={errors.Ticket?.message}
        />

        <TextField 
          label="Nombre de la Empresa" 
          size="small"
          {...register("NombreEmpresa", { required: "El nombre es obligatorio" })}
          error={!!errors.NombreEmpresa}
          helperText={errors.NombreEmpresa?.message}
        />

        <TextField
          select label="Seleccione Sector" 
          size="small" defaultValue={empresaInicial?.IdSector || ""}
          {...register("IdSector", { required: "Debes seleccionar un sector" })}
          error={!!errors.IdSector}
          helperText={errors.IdSector?.message}
        >
          {sectores.map(s => (
            <MenuItem key={s.IdSector} value={s.IdSector}>{s.NombreSector}</MenuItem>
          ))}
        </TextField>

        <FormControlLabel 
          control={<Checkbox defaultChecked={empresaInicial?.Activo ?? true} {...register("Activo")} color="primary" />} 
          label="¿Empresa Activa?" 
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
          <Button variant="contained" onClick={onCancel} disableElevation>
            Cancelar
          </Button>

          <Button 
            // ASIGNAMOS el evento onClick al botón de guardado
            onClick={manejarEnvio} 
            variant="contained" 
            color="primary"
            disableElevation 
          >
            Guardar Cambios
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}