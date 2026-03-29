// src/features/admin/hooks/useMantenimiento.js
import { useState } from 'react';
import toast from 'react-hot-toast';

export const useMantenimiento = () => {
    const [cargando, setCargando] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, tarea: '', funcion: null });

    const abrirConfirmacion = (tarea, funcion) => setConfirmDialog({ open: true, tarea, funcion });
    const cerrarConfirmacion = () => setConfirmDialog({ open: false, tarea: '', funcion: null });

    const ejecutarTarea = async () => {
        const { tarea, funcion } = confirmDialog;
        cerrarConfirmacion();
        setCargando(true);
        const idNoti = toast.loading(`Ejecutando: ${tarea}...`);
        
        try {
            const response = await funcion();
            toast.success(response.message || "Tarea completada", { id: idNoti });
        } catch (e) {
            toast.error(`Error en: ${tarea}`, { id: idNoti });
        } finally {
            setCargando(false);
        }
    };

    return { cargando, confirmDialog, abrirConfirmacion, cerrarConfirmacion, ejecutarTarea };
};