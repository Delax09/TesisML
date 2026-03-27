// src/components/RutaProtegida.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from 'context';

const RutaProtegida = ({ rolPermitido, children }) => {
  const { usuario } = useAuth();
  
  if (!usuario) {
    return <Navigate to="/" replace />; 
  }
  
  if (rolPermitido && usuario.rol !== rolPermitido) {
    return <Navigate to={usuario.rol === 'admin' ? '/panel' : '/home'} replace />;
  }

  return children ? children : <Outlet />; 
};

export default RutaProtegida;