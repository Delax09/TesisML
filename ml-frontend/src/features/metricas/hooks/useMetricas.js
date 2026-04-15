import { useState, useEffect } from 'react';
import api from '../../../services/api';

export const useMetricas = () => {
    const [metricas, setMetricas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarMetricas = async () => {
        setLoading(true);
        try {
            const response = await api.get('/metricas');
            setMetricas(response.data);
            setError(null);
        } catch (err) {
            console.error("Error cargando métricas:", err);
            setError("Hubo un error al cargar las métricas desde el servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarMetricas();
    }, []);

    return { metricas, loading, error, recargarMetricas: cargarMetricas };
};