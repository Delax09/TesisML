// ml-frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    withCredentials: true // <-- CAMBIO VITAL: Permite enviar y recibir cookies
});

// ¡Eliminamos el interceptor de request que ponía el Authorization!
// Las cookies viajan solas, no necesitamos inyectar nada.

export default api;