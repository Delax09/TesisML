// src/features/dashboard/components/KpiPanel.js
import React from 'react';
import { Grid, Card, CardContent, Avatar, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PieChartIcon from '@mui/icons-material/PieChart';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

export default function KpiPanel({ estadisticas }) {
    const theme = useTheme();

    const obtenerColorSentimiento = (sentimiento) => {
        if (sentimiento?.includes('Alcista')) return { color: theme.palette.market.positive.icon, bg: theme.palette.market.positive.bg }; 
        if (sentimiento?.includes('Bajista')) return { color: theme.palette.market.negative.icon, bg: theme.palette.market.negative.bg }; 
        return { color: theme.palette.warning.main, bg: '#fef3c7' }; 
    };

    const sentimientoColor = obtenerColorSentimiento(estadisticas.sentimientoGeneral);

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                        <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                            <BusinessCenterIcon fontSize="medium" />
                        </Avatar>
                        <Box>
                            <Typography color="text.secondary" variant="body2" fontWeight="bold">EMPRESAS SEGUIDAS</Typography>
                            <Typography variant="h4" fontWeight="900" color="text.primary">{estadisticas.totalEmpresas}</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                        <Avatar sx={{ bgcolor: 'secondary.light', width: 56, height: 56 }}>
                            <PieChartIcon fontSize="medium" />
                        </Avatar>
                        <Box>
                            <Typography color="text.secondary" variant="body2" fontWeight="bold">SECTORES ABARCADOS</Typography>
                            <Typography variant="h4" fontWeight="900" color="text.primary">{estadisticas.totalSectores}</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                <Card sx={{ height: '100%', bgcolor: sentimientoColor.bg, border: `1px solid ${sentimientoColor.color}40` }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                        <Avatar sx={{ bgcolor: sentimientoColor.color, color: 'white', width: 56, height: 56 }}>
                            <AutoGraphIcon fontSize="medium" />
                        </Avatar>
                        <Box>
                            <Typography sx={{ color: sentimientoColor.color, opacity: 0.8 }} variant="body2" fontWeight="bold">SENTIMIENTO IA</Typography>
                            <Typography variant="h5" fontWeight="900" sx={{ color: sentimientoColor.color }}>
                                {estadisticas.sentimientoGeneral}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}