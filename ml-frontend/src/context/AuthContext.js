// ml-frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react'; // <-- Importa useRef
import { authService, api } from 'services';
import { storage } from '../utils/storage'; 

const AuthContext = createContext();

const ROLES = { USUARIO_NORMAL: 1, ADMIN: 2 };

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Referencias para controlar la actividad sin causar re-renders innecesarios
  const actividadReciente = useRef(false);

  // 1. Efecto existente de inicialización (Mantenlo igual)
  useEffect(() => {
    const inicializarSesion = async () => {
      try {
        const sessionHint = await storage.obtenerItem('usuario');
        if (!sessionHint) {
          setCargando(false);
          return;
        }
        const userData = await authService.verificarSesion();
        setUsuario(userData);
      } catch (error) {
        console.log("La sesión expiró.");
        await storage.eliminarItem('usuario');
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };

    inicializarSesion();

    const handleSesionExpirada = async () => {
      setUsuario(null);
      await storage.eliminarItem('usuario');
    };

    window.addEventListener('sesion-expirada', handleSesionExpirada);
    return () => window.removeEventListener('sesion-expirada', handleSesionExpirada);
  }, []);

  // 2. NUEVO EFECTO: Detección de actividad y Keep-Alive
  useEffect(() => {
    // Solo activar si el usuario está logueado
    if (!usuario) return;

    // Función para registrar que el usuario hizo algo
    const registrarActividad = () => {
      actividadReciente.current = true;
    };

    // Escuchar eventos comunes de interacción
    window.addEventListener('mousemove', registrarActividad);
    window.addEventListener('keydown', registrarActividad);
    window.addEventListener('click', registrarActividad);
    window.addEventListener('scroll', registrarActividad);

    // Configurar un intervalo (Ej: cada 5 minutos) para hacer ping al servidor
    const TIEMPO_RENOVACION_MS = 5 * 60 * 1000; // 5 minutos
    
    const keepAliveInterval = setInterval(async () => {
      // Solo hacer la petición si el usuario realmente interactuó con la pantalla
      if (actividadReciente.current) {
        try {
          // Reutilizamos el endpoint existente que devuelve los datos del usuario.
          // Al hacer esta petición, el backend debería renovar la cookie/token.
          await authService.verificarSesion();
          
          // Reseteamos el estado de actividad para el siguiente ciclo
          actividadReciente.current = false; 
        } catch (error) {
          console.error("Fallo al renovar la sesión en segundo plano:", error);
        }
      }
    }, TIEMPO_RENOVACION_MS);

    // Limpieza al desmontar o cerrar sesión
    return () => {
      window.removeEventListener('mousemove', registrarActividad);
      window.removeEventListener('keydown', registrarActividad);
      window.removeEventListener('click', registrarActividad);
      window.removeEventListener('scroll', registrarActividad);
      clearInterval(keepAliveInterval);
    };
  }, [usuario]); // Se re-ejecuta si el estado de usuario cambia

  const actualizarDatos = async (nuevosDatos) => {
    const usuarioActualizado = { ...usuario, ...nuevosDatos };
    setUsuario(usuarioActualizado);
    await storage.guardarItem('usuario', usuarioActualizado);
  };

  const parseBackendError = (error) => {
        const detail = error.response?.data?.detail;
        if (!detail) return "Ocurrió un error de conexión al servidor";
        
        // Si el detalle es un texto normal (ej: "Credenciales inválidas")
        if (typeof detail === 'string') return detail;
        
        // Si el detalle es el array de validación de FastAPI (Error 422)
        if (Array.isArray(detail)) return "Verifica que todos los campos estén correctamente llenados.";

        return "Ocurrió un error inesperado";
    };

  const login = async (email, password) => {
    try {
      await authService.login(email, password);
      const userInfo = await authService.verificarSesion();

      await storage.guardarItem('usuario', userInfo);
      setUsuario(userInfo);

      return { success: true, usuario: userInfo };
    } catch (error) {
      return { success: false, message: parseBackendError(error.response?.data?.detail) || "Error de credenciales" };
    }
  };

  const registro = async (nombre, apellido, email, password) => {
    try {
      const nuevoUsuario = {
        Nombre: nombre,
        Apellido: apellido,
        Email: email,
        PasswordU: password,
        IdRol: ROLES.USUARIO_NORMAL 
      };

      await api.post('/usuarios', nuevoUsuario);
      return await login(email, password);
      
    } catch (error) {
      const mensajeError = parseBackendError(error.response?.data?.detail) || "Error al crear la cuenta. Verifica los datos.";
      return { success: false, message: mensajeError };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      await storage.eliminarItem('usuario');
      setUsuario(null);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando, actualizarDatos, registro }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);