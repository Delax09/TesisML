import React from 'react';
import { Card, CardContent, Box, Typography, Chip, CardActions, Button } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const ModeloCard = ({ modelo, activo, alternarAcceso, loading }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Usa transparencia basada en el tema para el fondo activo
        backgroundColor: (theme) => activo
          ? (theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)')
          : 'background.paper',
        borderColor: activo ? 'success.main' : 'divider',
        transition: 'all 0.2s',
        opacity: activo ? 1 : 0.8
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {modelo.Nombre}
          </Typography>
          <Chip
            icon={activo ? <CheckIcon sx={{ fontSize: 16 }} /> : <CloseIcon sx={{ fontSize: 16 }} />}
            label={activo ? "Habilitado" : "Bloqueado"}
            color={activo ? "success" : "error"}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {modelo.Descripcion || 'Este modelo no cuenta con una descripción detallada en este momento.'}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant={activo ? "outlined" : "contained"}
          color={activo ? "error" : "primary"}
          onClick={() => alternarAcceso(modelo.IdModelo)}
          disabled={loading}
        >
          {activo ? 'Revocar Acceso' : 'Conceder Acceso'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ModeloCard;