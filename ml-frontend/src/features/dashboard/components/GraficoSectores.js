// src/features/dashboard/components/GraficoSectores.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORES_SECTORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function GraficoSectores({ distribucion }) {
    const theme = useTheme();

    if (!distribucion || distribucion.length === 0) return null;

    return (
        <Box sx={{ mt: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" align="center" mb={1}>
                TU PORTAFOLIO POR SECTORES
            </Typography>
            
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={distribucion}
                        dataKey="cantidad"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        animationBegin={200}
                        animationDuration={800}
                        stroke={theme.palette.background.paper}
                        strokeWidth={2}
                    >
                        {distribucion.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORES_SECTORES[index % COLORES_SECTORES.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value) => [`${value} Empresas`, 'Cantidad']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}