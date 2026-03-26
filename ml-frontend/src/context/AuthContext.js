// ml-frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, api } from 'services'; 

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // CAMBIO AQUÍ: Ya no buscamos el token, solo el perfil del usuario
    const userGuardado = localStorage.getItem('usuario');
    
    if (userGuardado) {
      setUsuario(JSON.parse(userGuardado));
    }
    setCargando(false);
  }, []);

  const actualizarDatos = (nuevosDatos) => {
    const usuarioActualizado = { ...usuario, ...nuevosDatos };
    setUsuario(usuarioActualizado);
    localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
  };

  const login = async (email, password) => {
    try {
      // 1. Llamamos a FastAPI. El servidor nos devolverá la cookie automáticamente.
      await authService.login(email, password);

      // ¡CAMBIO AQUÍ! Eliminamos: localStorage.setItem('token', data.access_token);

      // 3. Pedimos los datos. Axios enviará la cookie de forma invisible.
      const userResponse = await api.get(`/usuarios/email/${email}`);
      const datosUsuario = userResponse.data;

      const nombreRolDb = datosUsuario.rol?.NombreRol?.toLowerCase() || 'usuario';
      const rolEstandarizado = nombreRolDb.includes('admin') ? 'admin' : 'usuario';

      const userInfo = {
        id: datosUsuario.IdUsuario,
        nombre: `${datosUsuario.Nombre} ${datosUsuario.Apellido || ''}`.trim(),
        email: datosUsuario.Email,
        rol: rolEstandarizado
      };

      localStorage.setItem('usuario', JSON.stringify(userInfo));
      setUsuario(userInfo);

      if (userInfo.rol === 'admin') {
        navigate('/panel');
      } else {
        navigate('/home');
      }

      return { success: true };
      
    } catch (error) {
      console.error("Error de autenticación:", error);
      // Ya no tenemos que hacer removeItem('token') porque ya no existe ahí
      return { 
        success: false, 
        message: error.response?.data?.detail || "Error al verificar las credenciales" 
      };
    }
  };

  // NUEVA FUNCIÓN: REGISTRO
  const registro = async (nombre, apellido, email, password) => {
    try {
      // Por defecto, asignamos IdRol: 2 (que según tu base de datos es Usuario Normal)
      const nuevoUsuario = {
        Nombre: nombre,
        Apellido: apellido,
        Email: email,
        PasswordU: password,
        IdRol: 1 
      };

      // 1. Llamamos a la API para crear el usuario
      await api.post('/usuarios', nuevoUsuario);

      // 2. Si se crea con éxito, iniciamos sesión automáticamente
      return await login(email, password);
      
    } catch (error) {
      console.error("Error al registrar:", error);
      // FastAPI manda los errores de validación en format detail[0].msg o detail (string)
      const mensajeError = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || "Error al crear la cuenta. Verifica los datos.";
      return { success: false, message: mensajeError };
    }
  };

  const logout = () => {
    // CAMBIO AQUÍ: Quitamos removeItem('token')
    localStorage.removeItem('usuario');
    setUsuario(null);
    navigate('/login');
    // NOTA: Para hacer un logout perfecto, luego crearemos un endpoint en FastAPI
    // que borre la cookie, pero por ahora esto limpia la sesión del frontend.
  };

  if (cargando) return <div style={{display: 'flex', justifyContent:'center', marginTop:'20vh'}}>Cargando sesión...</div>;

  return (
    <AuthContext.Provider value={{ usuario, login, logout, registro, actualizarDatos}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);