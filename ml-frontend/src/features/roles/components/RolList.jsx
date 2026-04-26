// src/features/roles/components/RolList.js
import React from 'react';
import { useRolesList } from '../hooks/useRoles';
import { Box, Paper, Typography, CircularProgress, Chip } from '@mui/material';

function RolList() {
    const { roles, cargando } = useRolesList();

    if (cargando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
                Roles del Sistema
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                {roles.map((rol) => (
                    <Chip 
                        key={rol.IdRol} 
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                    #{rol.IdRol}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                    {rol.NombreRol}
                                </Typography>
                            </Box>
                        }
                        sx={{ 
                            p: 1.5, 
                            height: 'auto', // Permite que el contenido dicte la altura
                            bgcolor: 'background.default', 
                            border: '1px solid', 
                            borderColor: 'divider',
                            borderRadius: '20px',
                            '& .MuiChip-label': { padding: 0 } // Limpiamos el padding interno extra del chip
                        }}
                    />
                ))}
            </Box>
        </Paper>
    );
}

export default RolList;