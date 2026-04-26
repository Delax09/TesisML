import React, { createContext, useState, useMemo, useEffect, useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import getTheme from '../theme';
import { storage } from '../utils/storage'; 

// Creamos el contexto
const ThemeContext = createContext();

// Hook personalizado para usar el contexto fácilmente
export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
    // Inicializamos el estado con una función lógica
    const [mode, setMode] = useState(() => {
        // 1. Verificamos si ya existe una preferencia guardada manualmente
        const savedTheme = localStorage.getItem('appTheme');
        if (savedTheme) return savedTheme;

        // 2. Si no hay nada guardado, detectamos la preferencia del sistema/navegador
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        return prefersDarkMode ? 'dark' : 'light';
    });

    // Cada vez que el modo cambie, lo guardamos en localStorage
    useEffect(() => {
        const cargarTema = async () => {
            const savedMode = await storage.obtenerItem('themeMode'); // Agregar await
            if (savedMode) setMode(savedMode);
        };
        cargarTema();
    }, []);

    // Función para alternar entre claro y oscuro
    const toggleTheme = async () => { // Hacer la función async
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        await storage.guardarItem('themeMode', newMode); // Agregar await
    };

    // Generamos el tema de Material UI usando la función de tu theme.js
    const theme = useMemo(() => getTheme(mode), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline /> 
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};