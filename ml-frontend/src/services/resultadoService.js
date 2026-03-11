// src/services/resultadoService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/resultados';

export const resultadoService = {
    // Obtener los resultados de una empresa (usamos la última predicción de la lista)
    getByEmpresa: async (empresaId) => {
        try {
            const response = await axios.get(`${API_URL}/empresa/${empresaId}`);
            return response.data;
        } catch (error) {
            console.error("Error al obtener resultados de ML:", error);
            throw error;
        }
    }
};

export default resultadoService;