// src/services/sectorService.js
import api from './api';

const API_URL = '/sectores';

export const sectorService = {
    // Obtener todos los sectores (GET /api/v1/sectores)
    getAll: async () => {
        try {
            const response = await api.get(API_URL);
            return response.data;
        } catch (error) {
            console.error("Error al obtener sectores:", error);
            throw error;
        }
    },

    // Obtener solo los activos (GET /api/v1/sectores/activos)
    getActivos: async () => {
        try {
            const response = await api.get(`${API_URL}/activos`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener sectores activos:", error);
            throw error;
        }
    }
};

export default sectorService;