import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, CircularProgress, Typography, Box, Chip, Popover, Button, alpha, useTheme
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

// Subcomponente para el contenido del Popover (Matriz ampliada)
const PopoverConfusionMatrix = ({ tp, tn, fp, fn }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const getBgColor = (color) => alpha(theme.palette[color].main, isDark ? 0.2 : 0.1);
    const getTextColor = (color) => isDark ? theme.palette[color].light : theme.palette[color].dark;

    return (
        <Box sx={{ p: 2, minWidth: '280px' }}>
            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1.5, textAlign: 'center', color: 'text.secondary', textTransform: 'uppercase' }}>
                Detalle Matriz de Confusión
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '2px',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    bgcolor: 'divider'
                }}
            >
                <Box sx={{ bgcolor: getBgColor('success'), color: getTextColor('success'), p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="900">{tp}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>TP</Typography>
                </Box>
                <Box sx={{ bgcolor: getBgColor('error'), color: getTextColor('error'), p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="900">{fn}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>FN</Typography>
                </Box>
                <Box sx={{ bgcolor: getBgColor('error'), color: getTextColor('error'), p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="900">{fp}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>FP</Typography>
                </Box>
                <Box sx={{ bgcolor: getBgColor('success'), color: getTextColor('success'), p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="900">{tn}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>TN</Typography>
                </Box>
            </Box>
        </Box>
    );
};

const MetricasTable = ({ metricas, loading }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMetrica, setSelectedMetrica] = useState(null);

    const handlePopoverOpen = (event, metrica) => {
        setAnchorEl(event.currentTarget);
        setSelectedMetrica(metrica);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
        setSelectedMetrica(null);
    };

    const open = Boolean(anchorEl);

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
                <Typography color="text.secondary">No se encontraron métricas.</Typography>
            </Paper>
        );
    }

    return (
        <>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow 
                            sx={{ 
                                backgroundColor: 'background.default',
                                '& th': { 
                                    fontWeight: 'bold', 
                                    color: 'text.secondary',
                                    borderBottom: '2px solid', 
                                    borderColor: 'divider',
                                    py: 2 
                                } 
                            }}
                        >
                            {/* Todas las columnas con align="center" */}
                            <TableCell align="center">Fecha Entrenamiento</TableCell>
                            <TableCell align="center">Modelo</TableCell>
                            <TableCell align="center">Días Futuro</TableCell>
                            <TableCell align="center">Accuracy</TableCell>
                            <TableCell align="center">F1 Score</TableCell>
                            <TableCell align="center">Loss / Val Loss</TableCell>
                            <TableCell align="center">Matriz (TP|TN|FP|FN)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {metricas.map((metrica) => (
                            <TableRow key={metrica.IdMetrica} hover>
                                <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                    {new Date(metrica.FechaEntrenamiento).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={metrica.NombreModelo || `Mod-${metrica.IdModelo}`} 
                                        color="primary" 
                                        variant="outlined" 
                                        size="small"
                                        sx={{ fontWeight: 'bold', borderWidth: '1.5px' }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="body2" fontWeight="600">
                                        {metrica.DiasFuturo}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center" sx={{ 
                                    color: metrica.Accuracy > 0.52 ? 'success.main' : 'text.primary', 
                                    fontWeight: metrica.Accuracy > 0.52 ? 'bold' : 'normal' 
                                }}>
                                    {Number(metrica.Accuracy).toFixed(4)}
                                </TableCell>
                                <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                    {Number(metrica.F1_Score).toFixed(4)}
                                </TableCell>
                                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    <span>{Number(metrica.Loss).toFixed(4)}</span>
                                    <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
                                    <span>{Number(metrica.ValLoss).toFixed(4)}</span>
                                </TableCell>
                                <TableCell align="center">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                        onClick={(e) => handlePopoverOpen(e, metrica)}
                                        endIcon={<VisibilityOutlinedIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            borderColor: 'divider',
                                            borderRadius: '8px',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                                color: 'primary.main'
                                            }
                                        }}
                                    >
                                        {metrica.TP} | {metrica.TN} | {metrica.FP} | {metrica.FN}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        mt: -1,
                        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider'
                    }
                }}
            >
                {selectedMetrica && (
                    <PopoverConfusionMatrix 
                        tp={selectedMetrica.TP} 
                        tn={selectedMetrica.TN} 
                        fp={selectedMetrica.FP} 
                        fn={selectedMetrica.FN} 
                    />
                )}
            </Popover>
        </>
    );
};

export default MetricasTable;