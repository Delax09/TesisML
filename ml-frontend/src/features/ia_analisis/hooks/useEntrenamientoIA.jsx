// src/features/ia_analisis/hooks/useEntrenamientoIA.js
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { iaService } from '../../../services';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext'; // <-- IMPORTAMOS EL AUTH CONTEXT

export const useEntrenamientoIA = () => {
    const { usuario } = useAuth(); // <-- OBTENEMOS EL USUARIO
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [entrenando, setEntrenando] = useState(false);

    const { data: modelos = [] } = useQuery({
        // Cambiamos la key para que dependa del id del usuario
        queryKey: ['modelos_usuario', usuario?.id], 
        queryFn: async () => {
            if (!usuario?.id) return [];
            // Llamamos a la nueva función
            return await iaService.obtenerModelosPorUsuario(usuario.id);
        },
        enabled: !!usuario?.id, // Solo se ejecuta si hay un usuario logueado
        staleTime: 1000 * 60 * 60,
    });

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