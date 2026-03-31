// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#10b981', // Verde esmeralda
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4f46e5', // Índigo
      contrastText: '#ffffff',
    },
    layout: {
      sidebar: '#2c3e50',       
      sidebarActive: '#34495e', 
      sidebarText: '#ecf0f1',   
      sidebarBorder: '#34495e', 
    },
    // NUEVA SECCIÓN: Colores para tablas
    table: {
      headerBg: '#f8fafc',
      headerText: '#64748b',
      rowHover: '#f0fdf4', // Un verde muy claro para resaltar la fila al pasar el mouse
      cellTextPrimary: '#0f172a',
      cellTextSecondary: '#334155',
    },
    // NUEVA SECCIÓN: Colores para Chips (Filtros y Sectores)
    chip: {
      defaultBg: '#f8fafc',
      defaultText: '#475569',
      defaultBorder: '#e2e8f0',
      hoverBg: '#f1f5f9',
      sectorBg: '#d1fae5',    // Fondo verde clarito para el sector en la tabla
      sectorText: '#047857',  // Texto verde oscuro
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;