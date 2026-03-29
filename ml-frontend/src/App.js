// src/App.js
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { UserLayout, AdminLayout } from 'layouts'; 
import { AuthProvider } from 'context';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';

// 1. IMPORTACIÓN ACTUALIZADA DE RUTA PROTEGIDA (Ajusta según dónde la hayas movido)
import RutaProtegida from './features/auth/components/RutaProtegida';

// IMPORTACIONES PEREZOSAS
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Panel = lazy(() => import('pages/Admin/Panel/Panel'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));

// 2. FUNCIÓN AYUDANTE PARA UX FLUIDO
// Esto permite que el Layout NO desaparezca mientras el componente interno se descarga.
const conSuspense = (Componente) => (
  <Suspense fallback={
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  }>
    <Componente />
  </Suspense>
);

// CONFIGURACIÓN DE RUTAS
const router = createBrowserRouter([
  {
    path: "/",
    element: conSuspense(Landing), // Aplicamos el suspense individualmente
  },
  {
    element: (
      <RutaProtegida rolPermitido="usuario">
        <UserLayout />
      </RutaProtegida>
    ),
    children: [
      { path: "home", element: conSuspense(Home) },
      { path: "portafolio", element: conSuspense(Portafolio) },
      { path: "mercado", element: conSuspense(Mercado) },
    ],
  },
  {
    element: (
      <RutaProtegida rolPermitido="admin">
        <AdminLayout />
      </RutaProtegida>
    ),
    children: [
      { path: "panel", element: conSuspense(Panel) },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);

// COMPONENTE RAÍZ
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> 
      <AuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
        {/* RouterProvider ya no está envuelto en Suspense, los menús de Layout nunca parpadearán */}
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;