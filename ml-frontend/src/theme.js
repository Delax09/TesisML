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
    table: {
      headerBg: '#f8fafc',
      headerText: '#64748b',
      rowHover: '#f0fdf4', 
      cellTextPrimary: '#0f172a',
      cellTextSecondary: '#334155',
    },
    chip: {
      defaultBg: '#f8fafc',
      defaultText: '#475569',
      defaultBorder: '#e2e8f0',
      hoverBg: '#f1f5f9',
      sectorBg: '#d1fae5',    
      sectorText: '#047857',  
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    market: {
      // Estilos genéricos para tarjetas sin variaciones extremas
      cardDefault: {
        bg: '#ffffff',
        border: '#cbd5e1',
        text: '#1e293b',
      },
      // Estilos cuando no hay datos de la IA
      nullState: {
        bg: '#f8fafc', // background.default
        border: '#e2e8f0',
        text: '#0f172a', // text.primary
        icon: '#94a3b8',
        badgeBg: '#f1f5f9',
        badgeText: '#64748b',
      },
      // Variaciones de mercado (Alzas y Bajas)
      strongPositive: { bg: '#dcfce7', text: '#14532d', border: '#bbf7d0', icon: '#166534', badgeBg: '#bbf7d0', badgeText: '#166534' },
      positive:       { bg: '#f0fdf4', text: '#166534', border: '#dcfce7', icon: '#22c55e', badgeBg: '#bbf7d0', badgeText: '#166534' },
      neutral:        { bg: '#f8fafc', text: '#334155', border: '#e2e8f0', icon: '#64748b', badgeBg: '#e2e8f0', badgeText: '#475569' },
      negative:       { bg: '#fef2f2', text: '#991b1b', border: '#fee2e2', icon: '#ef4444', badgeBg: '#fecaca', badgeText: '#991b1b' },
      strongNegative: { bg: '#fee2e2', text: '#7f1d1d', border: '#fecaca', icon: '#b91c1c', badgeBg: '#fecaca', badgeText: '#991b1b' },
    },
  },
  typography: {
    fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
    // Puedes estandarizar tamaños de títulos aquí
    h3: {
      fontWeight: 900,
      lineHeight: 1.2,
    },
    h6: {
      lineHeight: 1.6,
    }
  },
  shape: {
    borderRadius: 8, // Este es el valor base (1 = 8px en cálculos de MUI)
  },
  
  // AQUI OCURRE LA MAGIA: Sobrescribimos los componentes globalmente
  components: {
    // 1. BOTONES
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Quita la sombra por defecto para un look más moderno
      },
      styleOverrides: {
        root: {
          fontWeight: 'bold',
          textTransform: 'none', // Evita que el texto se ponga todo en MAYÚSCULAS
          borderRadius: '12px', // Bordes más redondeados por defecto
        },
        sizeLarge: {
          padding: '12px 32px', // Botones grandes más espaciosos
          fontSize: '1.1rem',
        },
      },
    },

    // 2. MODALES (Dialogs)
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '24px', // Modales con bordes bien redondeados (equivale a tu sx={{ borderRadius: 4 }})
          padding: '8px',
        },
      },
    },

    // 3. BARRA DE NAVEGACIÓN (AppBar)
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0, // <-- REVIERTE EL REDONDEO
          boxShadow: 'none',
        },
      },
    },

    // 3.2 LA BARRA SUPERIOR (Vuelve a ser recta)
    MuiAppBar: {
      defaultProps: {
        color: 'inherit',
        elevation: 0,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 0,
          // Usamos el color de fondo del tema en lugar de #ffffff
          backgroundColor: theme.palette.background.paper, 
          // Usamos el separador nativo de MUI en lugar de #e2e8f0
          borderBottom: `1px solid ${theme.palette.divider}`, 
          boxShadow: 'none', 
          backgroundImage: 'none', // Necesario para que no haga cosas raras en modo oscuro
        }),
      },
    },

    // 4. CAMPOS DE TEXTO (Inputs del Formulario)
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // Inputs consistentes con los botones
        },
      },
    },

    // 5. TABLAS (Utilizando tus colores personalizados)
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f8fafc', // Usando tu palette.table.headerBg
          color: '#64748b',           // Usando tu palette.table.headerText
          fontWeight: 'bold',
        },
        body: {
          color: '#0f172a',           // Usando tu palette.table.cellTextPrimary
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f0fdf4 !important', // Usando tu palette.table.rowHover
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
          },
          '&.Mui-selected': {
            backgroundColor: '#34495e', // Tu layout.sidebarActive
            '&:hover': {
              backgroundColor: '#34495e',
            },
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0, // Un diseño moderno suele ser más plano, pero si prefieres la sombra pon 2
      },
      styleOverrides: {
        root: {
          borderRadius: '24px', // Equivale a tu borderRadius: 3
          // Opcional: una sombra más suave y moderna
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', 
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: '24px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    

  },
});

export default theme;