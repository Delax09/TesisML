// src/services/precioService.js
import api from './api';

const API_URL = '/precio_historico';

export const precioService = {
    // Obtener historial por ID de empresa
    getByEmpresa: async (empresaId) => {
        try {
            const response = await api.get(`${API_URL}/empresa/${empresaId}`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener precios históricos:", error);
            throw error;
        }
    }
};

export default precioService; 