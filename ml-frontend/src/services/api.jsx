// ml-frontend/src/services/api.js
import axios from 'axios';
// Importamos nuestra nueva utilidad de storage
import { storage } from '../utils/storage'; 

// 1. NUEVO: Función auxiliar para leer la cookie CSRF
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null; // Retorna null si no la encuentra
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, 
    withCredentials: true // Perfecto, esto ya lo tenías y es obligatorio para las cookies
});

// 2. NUEVO: Interceptor de Peticiones (Request) para inyectar el Token Anti-CSRF
api.interceptors.request.use(config => {
    // Solo agregamos el token a métodos que modifican datos
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
        // Leemos la cookie que nos envió FastAPI en el login
        const csrfToken = getCookie('csrf_token');
        if (csrfToken) {
            // Inyectamos el header para que el backend lo valide
            config.headers['X-CSRF-Token'] = csrfToken;
        }
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 3. INTOCABLE: Tu interceptor de respuestas original
api.interceptors.response.use(
  (response) => response,
  async (error) => { 
    if (error.response && error.response.status === 401) {
      await storage.eliminarItem('usuario'); 
      window.dispatchEvent(new CustomEvent('sesion-expirada'));
    }
    return Promise.reject(error);
  }
);

export default api;