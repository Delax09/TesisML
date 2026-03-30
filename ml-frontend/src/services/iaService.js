// ml-frontend/src/services/iaService.js
import api from './api'; // <-- IMPORTANTE: Usar la instancia configurada en lugar de axios puro

// Si api.js ya tiene configurada la baseURL ('http://localhost:8000/api/v1'), puedes simplificar las rutas:
const API_URL = '/ia';
const MODELOS_URL = '/modelos-ia';

const iaService = {
    analizarTodo: async () => {
        const response = await api.post(`${API_URL}/analizar-todo`); // Cambiar axios por api
        return response.data;
    },
    entrenarModelo: async (modeloId) => {
        const response = await api.post(`${API_URL}/entrenar-modelo/${modeloId}`); // Cambiar axios por api
        return response.data;
    },
    obtenerModelosActivos: async () => {
        const response = await api.get(`${MODELOS_URL}/activos`); // Cambiar axios por api
        return response.data;
    },
    obtenerPrediccionEmpresa: async (empresaId) => {
        const response = await api.get(`${API_URL}/prediccion/${empresaId}`);
        return response.data; 
    }           
    
};

export default iaService;