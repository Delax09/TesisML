// src/utils/notificaciones.js
import toast from 'react-hot-toast';

export const notificar = {
    exito: (mensaje) => toast.success(mensaje),
    error: (mensaje) => toast.error(mensaje),
};