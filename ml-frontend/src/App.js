import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing, Home, Panel, Portafolio, Mercado} from 'pages'; 
import { UserLayout, AdminLayout } from 'layouts'; 
import { AuthProvider, useAuth } from 'context';
import { Toaster } from 'react-hot-toast';

// 1. IMPORTACIONES NUEVAS DE MUI
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; // Importamos el tema que acabas de crear

const RutaProtegida = ({ children, rolPermitido }) => {
  const { usuario } = useAuth();
  
  if (!usuario) {
    return <Navigate to="/" replace />; 
  }
  
  if (rolPermitido && usuario.rol !== rolPermitido) {
    return <Navigate to={usuario.rol === 'admin' ? '/panel' : '/home'} replace />;
  }

  return children; 
};

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        <Route element={<RutaProtegida rolPermitido="usuario"><UserLayout /></RutaProtegida>}>
          <Route path="/home" element={<Home />} />
          <Route path="/portafolio" element={<Portafolio />} />
          <Route path="/mercado" element={<Mercado />} />
        </Route>

        <Route element={<RutaProtegida rolPermitido="admin"><AdminLayout /></RutaProtegida>}>
          <Route path="/panel" element={<Panel />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function App() {
  return (
    // 2. ENVOLVEMOS LA APLICACIÓN CON EL THEMEPROVIDER
    <ThemeProvider theme={theme}>
      {/* CssBaseline normaliza los estilos del navegador */}
      <CssBaseline /> 
      <BrowserRouter>
        <Toaster position="top-right" reverseOrder={false} />
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;