// src/features/ia_analisis/hooks/useEntrenamientoIA.js
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { iaService } from '../../../services';
import toast from 'react-hot-toast';

export const useEntrenamientoIA = () => {
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [entrenando, setEntrenando] = useState(false);

    const { data: modelos = [] } = useQuery({
        queryKey: ['modelos_activos'],
        queryFn: async () => {
            return await iaService.obtenerModelosActivos();
        },
        staleTime: 1000 * 60 * 60,
    });

    // Sincronizamos el estado inicial para evitar el error de "undefined"
    useEffect(() => {
        if (modelos.length > 0 && !modeloSeleccionado) {
            setModeloSeleccionado(modelos[0].IdModelo);
        }
    }, [modelos, modeloSeleccionado]);

    const ejecutarEntrenamiento = async () => {
        if (!modeloSeleccionado) return;
        setEntrenando(true);
        const idNoti = toast.loading("Entrenando modelo en segundo plano...");
        
        try {
            const response = await iaService.entrenarModelo(modeloSeleccionado);
            toast.success(response.message || "Entrenamiento iniciado", { id: idNoti });
        } catch (error) {
            toast.error("Error al intentar entrenar el modelo.", { id: idNoti });
        } finally {
            setEntrenando(false);
        }
    };

    return { modelos, modeloSeleccionado, setModeloSeleccionado, entrenando, ejecutarEntrenamiento };
};