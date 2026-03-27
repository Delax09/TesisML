import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserLayout, AdminLayout } from 'layouts'; 
import { AuthProvider} from 'context';
import { Toaster } from 'react-hot-toast';
import { RutaProtegida } from 'components';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

//IMPORTACIONES PEREZOSAS --- IMPORTANTE PARA MEJORAR EL RENDIMIENTO
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Panel = lazy(() => import('pages/Admin/Panel/Panel'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));

function AppRoutes() {
  return (
    <AuthProvider>

      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Cargando sección...
        </div>
      }></Suspense>
      
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