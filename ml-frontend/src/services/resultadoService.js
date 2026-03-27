// src/services/resultadoService.js
import api from './api';

const API_URL = '/resultados';

export const resultadoService = {
    // Obtener los resultados de una empresa (usamos la última predicción de la lista)
    getByEmpresa: async (empresaId) => {
        try {
            const response = await api.get(`${API_URL}/empresa/${empresaId}`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener resultados de ML:", error);
            throw error;
        }
    }
};

export default resultadoService;