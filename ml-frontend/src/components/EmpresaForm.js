// src/components/EmpresaForm.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  MenuItem, 
  FormControlLabel, 
  Checkbox, 
  Button 
} from '@mui/material';
import { sectorService } from 'services';

export default function EmpresaForm({ empresaInicial, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    Ticket: '',
    NombreEmpresa: '',
    IdSector: '',
    Activo: true
  });
  const [sectores, setSectores] = useState([]);

  useEffect(() => {
    // Cargar sectores para el dropdown
    const cargarSectores = async () => {
      try {
        const data = await sectorService.getAll();
        setSectores(data);
      } catch (error) {
        console.error("Error al cargar sectores", error);
      }
    };
    cargarSectores();

    // Si recibimos una empresa para editar, llenamos el form
    if (empresaInicial) setFormData(empresaInicial);
  }, [empresaInicial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Centralizamos el manejo de cambios para limpiar el JSX
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (name === 'Ticket' ? value.toUpperCase() : value)
    });
  };

  return (
    <Paper 
        elevation={0} 
        sx={{ 
            p: 3, 
            backgroundColor: '#f8fafc', 
            borderRadius: '12px' 
        }}
    >
      <Box 
        component="form" 
        onSubmit={handleSubmit} 
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          {empresaInicial ? 'Editar' : 'Nueva'} Empresa
        </Typography>
        
        <TextField 
          label="Ticker (ej: AAPL)" 
          name="Ticket"
          value={formData.Ticket} 
          onChange={handleChange}
          required
          fullWidth
          size="small"
        />

        <TextField 
          label="Nombre de la Empresa" 
          name="NombreEmpresa"
          value={formData.NombreEmpresa} 
          onChange={handleChange}
          required
          fullWidth
          size="small"
        />

        <TextField
          select
          label="Seleccione Sector"
          name="IdSector"
          value={formData.IdSector}
          onChange={handleChange}
          required
          fullWidth
          size="small"
        >
          {/* Opción por defecto deshabilitada para forzar la selección */}
          <MenuItem value="" disabled>
            <em>Seleccione Sector</em>
          </MenuItem>
          {sectores.map(s => (
            <MenuItem key={s.IdSector} value={s.IdSector}>
              {s.NombreSector}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel 
          control={
            <Checkbox 
              name="Activo"
              checked={formData.Activo} 
              onChange={handleChange}
              color="primary"
            />
          } 
          label="¿Empresa Activa?" 
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
          <Button 
            variant="contained" 
            onClick={onCancel} 
            disableElevation
            sx={{ 
                backgroundColor: '#94a3b8', 
                '&:hover': { backgroundColor: '#64748b' } 
            }}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disableElevation
            sx={{ 
                backgroundColor: '#4f46e5', 
                '&:hover': { backgroundColor: '#4338ca' } 
            }}
          >
            Guardar Cambios
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}