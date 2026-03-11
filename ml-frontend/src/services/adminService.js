// src/services/adminService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/admin';

export const adminService = {
    importarTickers: async () => {
        const response = await axios.post(`${API_URL}/importar-tickers`);
        return response.data;
    },
    actualizarPrecios: async () => {
        const response = await axios.post(`${API_URL}/actualizar-precios`);
        return response.data;
    }
};

export default adminService;