// ml-frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
// 1. ELIMINAMOS useNavigate
import { authService, api } from 'services'; 

const AuthContext = createContext();

// NUEVO: Evitar Magic Numbers
const ROLES = {
  USUARIO_NORMAL: 1, // Ajusta este número según el ID de tu base de datos
  ADMIN: 2
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const inicializarSesion = async () => {
      // 1. Buscamos si hay un "usuario" guardado en localStorage (nuestra pista)
      const sessionHint = localStorage.getItem('usuario');
      
      // 2. Si no hay pista, asumimos que no hay sesión y ni siquiera llamamos al backend
      // Esto evita el error 401 en el Landing para usuarios nuevos.
      if (!sessionHint) {
        setCargando(false);
        return;
      }

      try {
        // 3. Si hay una pista, verificamos si la cookie sigue siendo válida
        const userData = await authService.verificarSesion();
        setUsuario(userData);
      } catch (error) {
        // Si el backend responde 401 (token expirado), limpiamos la pista
        console.log("La sesión expiró.");
        localStorage.removeItem('usuario');
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };

    inicializarSesion();
  }, []);

  const actualizarDatos = (nuevosDatos) => {
    const usuarioActualizado = { ...usuario, ...nuevosDatos };
    setUsuario(usuarioActualizado);
    localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
  };

  const login = async (email, password) => {
    try {
      await authService.login(email, password);
      const userInfo = await authService.verificarSesion();

      localStorage.setItem('usuario', JSON.stringify(userInfo));
      setUsuario(userInfo);

      // 2. YA NO NAVEGAMOS AQUÍ. Devolvemos el usuario para que el componente decida.
      return { success: true, usuario: userInfo };
      
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Error de credenciales" 
      };
    }
  };

  const registro = async (nombre, apellido, email, password) => {
    try {
      const nuevoUsuario = {
        Nombre: nombre,
        Apellido: apellido,
        Email: email,
        PasswordU: password,
        // NUEVO: Uso de constantes en lugar de Magic Numbers
        IdRol: ROLES.USUARIO_NORMAL 
      };

      await api.post('/usuarios', nuevoUsuario);
      return await login(email, password);
      
    } catch (error) {
      const mensajeError = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || "Error al crear la cuenta. Verifica los datos.";
      return { success: false, message: mensajeError };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('usuario');
      setUsuario(null);
    }
  };

  if (cargando) return <div style={{display: 'flex', justifyContent:'center', marginTop:'20vh'}}>Cargando sesión...</div>;

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando, actualizarDatos, registro }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);