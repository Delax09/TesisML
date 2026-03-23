import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // null = nadie logueado
  const navigate = useNavigate();

  // Esta función simula la validación del backend
  const login = async (email, password) => {
    // A FUTURO AQUÍ IRÁ: const response = await api.post('/auth/login', { email, password })
    
    if (email === 'admin@tesis.cl' && password === 'admin') {
      setUsuario({ nombre: 'Admin Master', rol: 'admin' });
      navigate('/panel'); // Redirige al administrador
      return true;
    } 
    
    if (email === 'user@tesis.cl' && password === 'user') {
      setUsuario({ nombre: 'Juan Inversor', rol: 'usuario' });
      navigate('/home'); // Redirige al usuario normal
      return true;
    }

    return false; // Credenciales incorrectas
  };

  const logout = () => {
    setUsuario(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar este contexto en cualquier parte
export const useAuth = () => useContext(AuthContext);