// ml-frontend/src/services/authService.js
import { api } from 'services';

const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email); 
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return response.data; 
};

// NUEVO: Validar sesión con el backend
const verificarSesion = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// NUEVO: Cerrar sesión en el backend
const logout = async () => {
    const response = await api.post('/auth/logout');
    return response.data;
};

const authService = {
  login,
  verificarSesion,
  logout
};

export default authService;