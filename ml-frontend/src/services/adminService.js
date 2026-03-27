// src/services/adminService.js
import api from './api';

const API_URL = '/admin';

export const adminService = {
    importarTickers: async () => {
        const response = await api.post(`${API_URL}/importar-tickers`);
        return response.data;
    },
    actualizarPrecios: async () => {
        const response = await api.post(`${API_URL}/actualizar-precios`);
        return response.data;
    }
};

export default adminService;