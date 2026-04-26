// src/services/precioService.js
import api from './api';

const API_URL = '/precio_historico';

export const precioService = {
    // Obtener historial por ID de empresa
    obtener_precio_historico_por_empresa: async (empresaId) => {
        try {
            const response = await api.get(`${API_URL}/empresa/${empresaId}/grafico`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener precios históricos:", error);
            throw error;
        }
    }
};

export default precioService; 