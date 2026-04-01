// src/theme.js
import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode, // ¡Esto le dice a Material UI que estamos en modo claro u oscuro!
      primary: {
        main: '#10b981', // Verde esmeralda (se ve bien en ambos modos)
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#4f46e5', // Índigo
        contrastText: '#ffffff',
      },
      // Cambiamos los fondos generales dependiendo del modo
      background: {
        default: isLight ? '#f8fafc' : '#0b1121', // Fondo de la página
        paper: isLight ? '#ffffff' : '#111827',   // Fondo de las tarjetas
      },
      // Menú lateral adaptativo
      layout: {
        sidebar: isLight ? '#2c3e50' : '#111827',       
        sidebarActive: isLight ? '#34495e' : '#1f2937', 
        sidebarText: '#ecf0f1',   
        sidebarBorder: isLight ? '#34495e' : '#1f2937', 
      },
      chip: {
        defaultBg: isLight ? '#f8fafc' : '#1f2937',
        defaultText: isLight ? '#475569' : '#cbd5e1',
        defaultBorder: isLight ? '#e2e8f0' : '#374151',
        hoverBg: isLight ? '#f1f5f9' : '#374151',
        sectorBg: isLight ? '#d1fae5' : 'rgba(16, 185, 129, 0.1)',    
        sectorText: isLight ? '#047857' : '#34d399',  
      },
      market: {
        cardDefault: {
          bg: isLight ? '#ffffff' : '#111827',
          border: isLight ? '#cbd5e1' : '#374151',
          text: isLight ? '#1e293b' : '#f1f5f9',
        },
        nullState: {
          bg: isLight ? '#f8fafc' : '#0b1121',
          border: isLight ? '#e2e8f0' : '#1f2937',
          text: isLight ? '#0f172a' : '#cbd5e1',
          icon: isLight ? '#94a3b8' : '#475569',
          badgeBg: isLight ? '#f1f5f9' : '#1f2937',
          badgeText: isLight ? '#64748b' : '#94a3b8',
        },
        // En modo oscuro usamos fondos semi-transparentes (rgba) para que no brillen tanto
        strongPositive: { 
            bg: isLight ? '#dcfce7' : 'rgba(22, 163, 74, 0.1)', 
            text: isLight ? '#14532d' : '#4ade80', 
            border: isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.2)', 
            icon: isLight ? '#166534' : '#4ade80', 
            badgeBg: isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.2)', 
            badgeText: isLight ? '#166534' : '#4ade80' 
        },
        positive: { 
            bg: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.05)', 
            text: isLight ? '#166534' : '#4ade80', 
            border: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.1)', 
            icon: isLight ? '#22c55e' : '#4ade80', 
            badgeBg: isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.2)', 
            badgeText: isLight ? '#166534' : '#4ade80' 
        },
        neutral: { 
            bg: isLight ? '#f8fafc' : 'rgba(148, 163, 184, 0.05)', 
            text: isLight ? '#334155' : '#cbd5e1', 
            border: isLight ? '#e2e8f0' : 'rgba(148, 163, 184, 0.1)', 
            icon: isLight ? '#64748b' : '#94a3b8', 
            badgeBg: isLight ? '#e2e8f0' : 'rgba(148, 163, 184, 0.1)', 
            badgeText: isLight ? '#475569' : '#cbd5e1' 
        },
        negative: { 
            bg: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)', 
            text: isLight ? '#991b1b' : '#f87171', 
            border: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)', 
            icon: isLight ? '#ef4444' : '#f87171', 
            badgeBg: isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)', 
            badgeText: isLight ? '#991b1b' : '#f87171' 
        },
        strongNegative: { 
            bg: isLight ? '#fee2e2' : 'rgba(220, 38, 38, 0.1)', 
            text: isLight ? '#7f1d1d' : '#f87171', 
            border: isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)', 
            icon: isLight ? '#b91c1c' : '#f87171', 
            badgeBg: isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)', 
            badgeText: isLight ? '#991b1b' : '#f87171' 
        },
      },
    },
    typography: {
      fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
      h3: { fontWeight: 900, lineHeight: 1.2 },
      h6: { lineHeight: 1.6 }
    },
    shape: {
      borderRadius: 8, 
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { fontWeight: 'bold', textTransform: 'none', borderRadius: '12px' },
          sizeLarge: { padding: '12px 32px', fontSize: '1.1rem' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: '24px', padding: '8px' },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { borderRadius: 0, boxShadow: 'none' },
        },
      },
      MuiAppBar: {
        defaultProps: { color: 'inherit', elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 0,
            backgroundColor: theme.palette.background.paper, 
            borderBottom: `1px solid ${theme.palette.divider}`, 
            boxShadow: 'none', 
            backgroundImage: 'none',
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: '12px' } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: '8px',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
            '&.Mui-selected': {
              backgroundColor: theme.palette.layout.sidebarActive,
              '&:hover': { backgroundColor: theme.palette.layout.sidebarActive },
            },
          }),
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: '24px', 
            boxShadow: isLight ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : '0 4px 6px -1px rgb(0 0 0 / 0.5)', 
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: '24px',
            boxShadow: isLight ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : '0 4px 6px -1px rgb(0 0 0 / 0.5)',
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

export default getTheme;