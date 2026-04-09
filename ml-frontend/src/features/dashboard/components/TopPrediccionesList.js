// src/features/dashboard/components/TopPrediccionesList.js
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, List, ListItem, ListItemAvatar, Avatar, ListItemText, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

// AÑADIDO: Agregamos onSelectEmpresa como prop
export default function TopPrediccionesList({ predicciones, onSelectEmpresa }) {
    const theme = useTheme();

    const obtenerIconoTendencia = (tendencia) => {
        if (tendencia === 'Alcista') return <TrendingUpIcon color="success" />;
        if (tendencia === 'Bajista') return <TrendingDownIcon color="error" />;
        return <TrendingFlatIcon color="warning" />;
    };

    if (predicciones.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" mb={2}>Agrega empresas a tu portafolio y ejecuta el modelo IA para ver predicciones.</Typography>
                <Button component={RouterLink} to="/gestionar-portafolio" variant="outlined" size="small">
                    Agregar Empresas
                </Button>
            </Box>
        );
    }

    return (
        <List disablePadding>
            {predicciones.map((emp) => (
                <ListItem 
                    key={emp.IdEmpresa} 
                    // AÑADIDO: Evento onClick para abrir el modal
                    onClick={() => onSelectEmpresa && onSelectEmpresa(emp)}
                    sx={{ 
                        bgcolor: 'background.default', 
                        mb: 1.5, 
                        borderRadius: 2, 
                        p: 2, 
                        borderLeftWidth: 4,
                        borderLeftStyle: 'solid',
                        borderLeftColor: emp.tendencia === 'Alcista' ? theme.palette.market.positive.icon : emp.tendencia === 'Bajista' ? theme.palette.market.negative.icon : theme.palette.warning.main,
                        // AÑADIDO: Estilos de cursor y hover
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.shadows[3]
                        }
                    }}
                >
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.paper', color: 'text.primary', border: '1px solid #e0e0e0' }}>
                            {obtenerIconoTendencia(emp.tendencia)}
                        </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText 
                        disableTypography
                        primary={
                            <Typography component="div" fontWeight="bold" variant="subtitle1">
                                {emp.Ticket} - {emp.NombreEmpresa}
                            </Typography>
                        } 
                        secondary={
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip label={emp.NombreSector} size="small" sx={{ fontSize: '0.7rem' }} />
                                <Typography variant="caption" color="text.secondary">
                                    RSI: {emp.rsi.toFixed(2)}
                                </Typography>
                            </Box>
                        } 
                    />

                    <Box sx={{ textAlign: 'right', minWidth: '100px' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="medium">
                            Actual: ${emp.precioActual.toFixed(4)}
                        </Typography>
                        <Typography 
                            variant="subtitle2" 
                            fontWeight="900" 
                            color={emp.tendencia === 'Alcista' ? 'success.main' : emp.tendencia === 'Bajista' ? 'error.main' : 'warning.main'}
                        >
                            Obj: ${emp.precioPredicho.toFixed(4)}
                        </Typography>
                    </Box>
                </ListItem>
            ))}
        </List>
    );
}