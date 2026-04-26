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
    },
    
    getUsuarios: async () => {
        try {
        const response = await api.get('/usuarios');
        return response.data;
        } catch (error) {
        console.error('Error al obtener usuarios:', error);
        throw error;
        }
    },

    getModelosPorUsuario: async (idUsuario) => {
        try {
        // CORRECCIÓN: La ruta es /modelos-ia/usuario/...
        const response = await api.get(`/modelos-ia/usuario/${idUsuario}`);
        return response.data;
        } catch (error) {
        console.error('Error al obtener modelos del usuario:', error);
        throw error;
        }
    },

    getTodosModelos: async () => {
        try {
        // CORRECCIÓN: La ruta es /modelos-ia
        const response = await api.get('/modelos-ia'); 
        return response.data;
        } catch (error) {
        console.error('Error al obtener todos los modelos:', error);
        throw error;
        }
    },

    toggleModeloUsuario: async (idUsuario, idModelo) => {
        try {
        const response = await api.put(`/admin/usuarios/${idUsuario}/modelos/${idModelo}/toggle`);
        return response.data;
        } catch (error) {
        console.error('Error al alternar modelo del usuario:', error);
        throw error;
        }
    }

};

export default adminService;