// src/App.js
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { UserLayout, AdminLayout } from 'layouts'; 
import { AuthProvider } from 'context';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import RutaProtegida from './features/auth/components/RutaProtegida';

// 1. IMPORTAR REACT QUERY
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// IMPORTACIONES PEREZOSAS
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Panel = lazy(() => import('pages/Admin/Panel/Panel'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));

const conSuspense = (Componente) => (
  <Suspense fallback={
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  }>
    <Componente />
  </Suspense>
);

const router = createBrowserRouter([
  { path: "/", element: conSuspense(Landing) },
  {
    element: <RutaProtegida rolPermitido="usuario"><UserLayout /></RutaProtegida>,
    children: [
      { path: "home", element: conSuspense(Home) },
      { path: "portafolio", element: conSuspense(Portafolio) },
      { path: "mercado", element: conSuspense(Mercado) },
    ],
  },
  {
    element: <RutaProtegida rolPermitido="admin"><AdminLayout /></RutaProtegida>,
    children: [
      { path: "panel", element: conSuspense(Panel) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

// 2. CREAR EL CLIENTE DE REACT QUERY (Configuración por defecto)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita que recargue datos solo por cambiar de pestaña en Chrome
      retry: 1, // Si falla la API, lo intenta 1 vez más automáticamente
    },
  },
});

function App() {
  return (
    // 3. ENVOLVER LA APLICACIÓN CON EL QUERYCLIENTPROVIDER
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> 
        <AuthProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;