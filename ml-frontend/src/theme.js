// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // El índigo que ya usas
      light: '#818cf8',
      dark: '#3730a3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981', // Un verde esmeralda para acciones de éxito/dinero
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // El color de fondo claro de tu app
      paper: '#ffffff',   // El color de las tarjetas/paneles
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 8, // Bordes redondeados consistentes en toda la app
  },
});

export default theme;