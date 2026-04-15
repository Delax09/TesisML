import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, CircularProgress, Typography, Box, Chip
} from '@mui/material';

const MetricasTable = ({ metricas, loading }) => {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!metricas || metricas.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">No se encontraron métricas con los filtros actuales.</Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
                <TableHead>
                    <TableRow 
                        sx={{ 
                            backgroundColor: 'background.default', // Color sutil adaptable (oscuro/claro)
                            '& th': { 
                                fontWeight: 'bold', 
                                color: 'text.secondary', // Texto grisáceo sutil para cabeceras
                                borderBottom: '2px solid', 
                                borderColor: 'divider',
                                py: 2 // Un poco más de padding vertical
                            } 
                        }}
                    >
                        <TableCell>Fecha Entrenamiento</TableCell>
                        <TableCell>Modelo</TableCell>
                        <TableCell align="center">Días Futuro</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                        <TableCell align="right">F1 Score</TableCell>
                        <TableCell align="right">Loss / Val Loss</TableCell>
                        <TableCell align="center">Matriz (TP|TN|FP|FN)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {metricas.map((metrica) => (
                        <TableRow 
                            key={metrica.IdMetrica} 
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }} // Quita el último borde para diseño limpio
                        >
                            <TableCell sx={{ color: 'text.primary' }}>
                                {new Date(metrica.FechaEntrenamiento).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={metrica.NombreModelo || `Mod-${metrica.IdModelo}`} 
                                    color="primary" 
                                    // Usamos variant 'soft' o una opacidad si está disponible en tu tema, 
                                    // de lo contrario outlined con fondo transparente se ve mucho menos saturado.
                                    variant="outlined" 
                                    size="small"
                                    sx={{ fontWeight: 'bold', borderWidth: '1.5px' }}
                                />
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body2" fontWeight="500">
                                    {metrica.DiasFuturo}
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ 
                                color: metrica.Accuracy > 0.52 ? 'success.main' : 'text.primary', 
                                fontWeight: metrica.Accuracy > 0.52 ? 'bold' : 'normal' 
                            }}>
                                {Number(metrica.Accuracy).toFixed(4)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.primary' }}>
                                {Number(metrica.F1_Score).toFixed(4)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>
                                <span>{Number(metrica.Loss).toFixed(4)}</span>
                                <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
                                <span>{Number(metrica.ValLoss).toFixed(4)}</span>
                            </TableCell>
                            <TableCell align="center">
                                {/* Diseño más limpio para la Matriz de Confusión */}
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }} title="Verdaderos Positivos">
                                        {metrica.TP}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'divider' }}>|</Typography>
                                    <Typography variant="body2" sx={{ color: 'success.main', opacity: 0.7 }} title="Verdaderos Negativos">
                                        {metrica.TN}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'divider' }}>|</Typography>
                                    <Typography variant="body2" sx={{ color: 'error.main', opacity: 0.7 }} title="Falsos Positivos">
                                        {metrica.FP}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'divider' }}>|</Typography>
                                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }} title="Falsos Negativos">
                                        {metrica.FN}
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetricasTable;