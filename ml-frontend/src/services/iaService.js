// ml-frontend/src/services/iaService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/ia';

const iaService = {

    // EL NUEVO para todas
    analizarTodo: async () => {
        const response = await axios.post(`${API_URL}/analizar-todo`);
        return response.data;
    },

    entrenarLSTM: async () => {
        const response = await axios.post(`${API_URL}/entrenar-modelo-lstm`);
        return response.data;
    }
};

export default iaService;