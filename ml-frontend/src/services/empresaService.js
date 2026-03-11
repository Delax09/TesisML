// src/services/empresaService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/empresas';

export const empresaService = {
    // Obtener todas las empresas
    getAll: async () => {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error("Error al obtener empresas:", error);
            throw error;
        }
    },

    // Obtener solo las empresas activas
    getActivas: async () => {
        try {
            const response = await axios.get(`${API_URL}/activas`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener empresas activas:", error);
            throw error;
        }
    }
};

export default empresaService;