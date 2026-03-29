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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// IMPORTACIONES PEREZOSAS USUARIO
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));

// IMPORTACIONES PEREZOSAS ADMIN (Aquí separamos en 3 vistas)
const AdminTareas = lazy(() => import('pages/Admin/Tareas/Tareas'));
const ComparadorIA = lazy(() => import('pages/Admin/ComparadorIA/ComparadorIA'));
const AdminEmpresas = lazy(() => import('pages/Admin/Empresas/Empresas'));

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
      // Redirigir la raíz del admin a tareas por defecto
      { path: "panel", element: <Navigate to="/admin/tareas" replace /> }, 
      { path: "admin/tareas", element: conSuspense(AdminTareas) },
      { path: "admin/comparador-ia", element: conSuspense(ComparadorIA) },
      { path: "admin/empresas", element: conSuspense(AdminEmpresas) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function App() {
  return (
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