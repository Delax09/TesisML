import axios from 'axios';

// Cambia el puerto si tu backend usa el 5000 o el 8000
const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000', 
});

export default API;