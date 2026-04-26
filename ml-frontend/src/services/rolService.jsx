// src/services/rolService.js
import api from './api';

const API_URL = '/roles';

export const rolService = {
    // Obtener todos los roles
    getAll: async () => {
        try {
            const response = await api.get(API_URL);
            return response.data;
        } catch (error) {
            console.error("Error al obtener roles:", error);
            throw error;
        }
    },

    // Obtener un rol específico por ID (útil para el futuro)
    getById: async (id) => {
        try {
            const response = await api.get(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error al obtener el rol ${id}:`, error);
            throw error;
        }
    }
};

export default rolService;