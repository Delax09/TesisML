// src/App.js
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { UserLayout, AdminLayout } from 'layouts'; 
import { AuthProvider } from 'context';
import { Toaster } from 'react-hot-toast';
import { RutaProtegida } from 'components';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// IMPORTACIONES PEREZOSAS
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Panel = lazy(() => import('pages/Admin/Panel/Panel'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));

// CONFIGURACIÓN DE RUTAS (Data Router API)
const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    // Agrupamos las rutas protegidas para 'usuario'
    element: (
      <RutaProtegida rolPermitido="usuario">
        <UserLayout />
      </RutaProtegida>
    ),
    children: [
      { path: "home", element: <Home /> },
      { path: "portafolio", element: <Portafolio /> },
      { path: "mercado", element: <Mercado /> },
    ],
  },
  {
    // Agrupamos las rutas protegidas para 'admin'
    element: (
      <RutaProtegida rolPermitido="admin">
        <AdminLayout />
      </RutaProtegida>
    ),
    children: [
      { path: "panel", element: <Panel /> },
    ],
  },
  {
    // Catch-all (Cualquier ruta no definida redirige al inicio)
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);

// 2. COMPONENTE RAÍZ
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> 
      {/* AuthProvider debe envolver todo el Router para que el contexto esté disponible */}
      <AuthProvider>
        {/* Suspense ahora envuelve correctamente al RouterProvider */}
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            Cargando sección...
          </div>
        }>
          <Toaster position="top-center" reverseOrder={false} />
          {/* RouterProvider reemplaza a BrowserRouter y Routes */}
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;