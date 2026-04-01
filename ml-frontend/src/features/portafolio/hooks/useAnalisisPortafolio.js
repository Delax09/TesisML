import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export const useAnalisisPortafolio = () => {
    // 1. Cambiamos 'user' por 'usuario' para que coincida con tu AuthContext
    const { usuario } = useAuth();

    // 2. Extraemos el ID correctamente (probablemente venga como IdUsuario)
    const userId = usuario?.IdUsuario || usuario?.id;

    return useQuery({
        queryKey: ['analisisPortafolio', userId],
        queryFn: async () => {
            if (!userId) return null;
            // 3. Pasamos el userId correcto a la ruta
            const response = await api.get(`/portafolios/analisis/${userId}`);
            return response.data;
        },
        // 4. Solo se ejecuta si userId existe
        enabled: !!userId, 
    });
};