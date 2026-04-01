// src/context/ThemeContext.js
import React, { createContext, useState, useMemo, useEffect, useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import getTheme from '../theme';

// Creamos el contexto
const ThemeContext = createContext();

// Hook personalizado para usar el contexto fácilmente
export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
    // Inicializamos el estado leyendo el localStorage (por defecto 'light')
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('appTheme') || 'light';
    });

    // Cada vez que el modo cambie, lo guardamos en localStorage
    useEffect(() => {
        localStorage.setItem('appTheme', mode);
    }, [mode]);

    // Función para alternar entre claro y oscuro
    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    // Generamos el tema de Material UI usando la función de tu theme.js
    const theme = useMemo(() => getTheme(mode), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline /> {/* Mueve el CssBaseline aquí para estandarizar fondos globales */}
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};