// ml-frontend/src/services/iaService.js
import api from './api';

const API_URL = '/ia';
const MODELOS_URL = '/modelos-ia';

const iaService = {
    analizarTodo: async () => {
        const response = await api.post(`${API_URL}/analizar-todo`);
        return response.data;
    },
    analizarPorModelo: async (modeloId) => {
        const response = await api.post(`${API_URL}/analizar-por-modelo/${modeloId}`);
        return response.data;
    },
    entrenarModelo: async (modeloId) => {
        const response = await api.post(`${API_URL}/entrenar-modelo/${modeloId}`);
        return response.data;
    },
    obtenerModelosActivos: async () => {
        const response = await api.get(`${MODELOS_URL}/activos`);
        return response.data;
    },
    obtenerPrediccionEmpresa: async (empresaId, modeloId = null) => {
        const params = modeloId ? { modelo_id: modeloId } : {};
        const response = await api.get(`${API_URL}/prediccion/${empresaId}`, { params });
        return response.data; 
    },
    obtenerPrediccionesMasivas: async (empresasIds, modeloId = null) => {
        const body = {
            empresas_ids: empresasIds,
            modelo_id: modeloId ? Number(modeloId) : null
        };
        const response = await api.post(`${API_URL}/predicciones-masivas`, body);
        return response.data;
    }
};

export default iaService;