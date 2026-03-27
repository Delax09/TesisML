// ml-frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL, 
    withCredentials: true 
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('usuario');
      
      if (window.location.pathname !== '/' && !error.config.url.includes('/auth/login')) {
        window.location.href = '/?mensaje=sesion_expirada';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;