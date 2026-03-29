// src/features/ia_analisis/hooks/useEntrenamientoIA.js
import { useState, useEffect } from 'react';
import { iaService } from '../../../services';
import toast from 'react-hot-toast';

export const useEntrenamientoIA = () => {
    const [modelos, setModelos] = useState([]);
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [entrenando, setEntrenando] = useState(false);

    useEffect(() => {
        const fetchModelos = async () => {
            try {
                const data = await iaService.obtenerModelosActivos();
                setModelos(data);
                if (data.length > 0) setModeloSeleccionado(data[0].IdModelo);
            } catch (error) {
                console.error("Error al cargar modelos", error);
            }
        };
        fetchModelos();
    }, []);

    const manejarEntrenamiento = async () => {
        if (!modeloSeleccionado) return;
        
        const modeloInfo = modelos.find(m => m.IdModelo === parseInt(modeloSeleccionado));
        if (!window.confirm(`¿Iniciar entrenamiento solo para: ${modeloInfo.Nombre}?`)) return;

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

    return { modelos, modeloSeleccionado, setModeloSeleccionado, entrenando, manejarEntrenamiento };
};