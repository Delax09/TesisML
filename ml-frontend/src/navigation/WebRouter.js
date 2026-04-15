// src/navigation/WebRouter.js
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { UserLayout, AdminLayout } from 'layouts'; 
import { CircularProgress, Box } from '@mui/material';
import RutaProtegida from '../features/auth/components/RutaProtegida';

// IMPORTACIONES PEREZOSAS USUARIO
const Landing = lazy(() => import('pages/Landing/Landing'));
const Home = lazy(() => import('pages/Usuario/Home/Home'));
const Portafolio = lazy(() => import('pages/Usuario/Portafolio/Portafolio'));
const Mercado = lazy(() => import('pages/Usuario/Mercado/Mercado'));
const ProyeccionesIA = lazy(() => import('pages/Usuario/ProyeccionesIA/ProyeccionesIA'));
const AnalisisPortafolio = lazy(() => import('pages/Usuario/AnalisisPortafolio/AnalisisPortafolio'));
const Noticias = lazy(() => import('pages/Usuario/Noticias/Noticias'));
const OlvidePassword = lazy(() => import('../pages/Landing/OlvidePassword'));
const ResetPassword = lazy(() => import('../pages/Landing/ResetPassword'));

// IMPORTACIONES PEREZOSAS ADMIN (Aquí separamos en 3 vistas)
const AdminTareas = lazy(() => import('pages/Admin/Tareas/Tareas'));
const ComparadorIA = lazy(() => import('pages/Admin/ComparadorIA/ComparadorIA'));
const AdminEmpresas = lazy(() => import('pages/Admin/Empresas/Empresas'));
const AdminModelos = lazy(() => import('pages/Admin/Modelos/AdminModelos'));
const AdminMetricas = lazy(() => import('pages/Admin/Metricas/AdminMetricas'));
const AccesosIA = lazy(() => import('pages/Admin/AccesosIA/AccesosIA'));

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

  { path: "/olvide-password", element: conSuspense(OlvidePassword) },
  { path: "/reset-password", element: conSuspense(ResetPassword) },
  {
    element: <RutaProtegida rolPermitido="usuario"><UserLayout /></RutaProtegida>,
    children: [
      { path: "home", element: conSuspense(Home) },
      { path: "portafolio", element: conSuspense(Portafolio) },
      { path: "analisis-portafolio", element: conSuspense(AnalisisPortafolio) },
      { path: "noticias", element: conSuspense(Noticias) },
      { path: "mercado", element: conSuspense(Mercado) },
      { path: "proyecciones-ia", element: conSuspense(ProyeccionesIA) },
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
      { path: "admin/modelos-ia", element: conSuspense(AdminModelos) },
      { path: "admin/metricas", element: conSuspense(AdminMetricas) },
      { path: "admin/accesos", element: conSuspense(AccesosIA) }
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

export function WebRouter() {
  return <RouterProvider router={router} />;
}