// src/services/sectorService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/sectores';

export const sectorService = {
    // Obtener todos los sectores (GET /api/v1/sectores)
    getAll: async () => {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error("Error al obtener sectores:", error);
            throw error;
        }
    },

    // Obtener solo los activos (GET /api/v1/sectores/activos)
    getActivos: async () => {
        try {
            const response = await axios.get(`${API_URL}/activos`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener sectores activos:", error);
            throw error;
        }
    }
};

export default sectorService;