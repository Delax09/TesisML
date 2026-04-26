// src/features/ia_analisis/hooks/useAnalisisMasivo.js
import { useState } from 'react';
import { iaService } from '../../../services';
import toast from 'react-hot-toast';

export const useAnalisisMasivo = (onComplete) => {
    const [ejecutando, setEjecutando] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);

    const manejarEjecucionMasiva = async () => {
        setOpenConfirm(false);
        setEjecutando(true);
        const idNoti = toast.loading("Iniciando análisis masivo de IA...");

        try {
            const response = await iaService.analizarTodo(); 
            toast.success(response.message || "¡Proceso masivo iniciado!", { id: idNoti });
            if (onComplete) onComplete(); 
        } catch (error) {
            toast.error("Error al iniciar el análisis masivo", { id: idNoti });
        } finally {
            setEjecutando(false);
        }
    };

    return { ejecutando, openConfirm, setOpenConfirm, manejarEjecucionMasiva };
};