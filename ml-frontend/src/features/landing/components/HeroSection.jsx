// src/components/HeroSection.js
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const HeroSection = ({ abrirModalAuth }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: '1200px', flexWrap: 'wrap', gap: 4, mt: 4 }}>
            <Box sx={{ 
                maxWidth: '500px',
                textAlign: { xs: 'center', sm: 'left' }
            }}>
                <Typography 
                    variant="h3" 
                    component="h1" 
                    sx={{ 
                        fontWeight: '900', 
                        color: 'text.primary', 
                        mb: 3, 
                        lineHeight: 1.1,
                        fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' } // Letra un poco más grande
                    }}
                >
                    Predicción <br sx={{ display: { xs: 'none', sm: 'block' } }}/> 
                    <Box component="span" sx={{ color: 'primary.main' }}>
                        Inteligente
                    </Box> <br sx={{ display: { xs: 'none', sm: 'block' } }}/> 
                    del Mercado
                </Typography>
                <Typography 
                    variant="h6" 
                    sx={{ 
                        color: 'text.secondary', 
                        mb: { xs: 3, sm: 4 }, 
                        lineHeight: 1.6,
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                >
                    Plataforma avanzada de análisis financiero impulsada por Machine Learning. 
                    Visualiza tendencias y toma decisiones informadas con modelos predictivos de vanguardia.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        onClick={() => abrirModalAuth(true)} 
                        sx={{ 
                            boxShadow: 3,
                            width: { xs: '100%', sm: 'auto' }, 
                            py: { xs: 2, sm: 2.5 },          
                            px: { sm: 4 },                     
                            fontSize: { xs: '1.25rem', sm: '1.25rem' },
                            fontWeight: 'bold',
                            borderRadius: 2
                        }}
                    >
                        Comenzar ahora
                    </Button>
                </Box>
            </Box>
        
        </Box>
    );
};

export default HeroSection;