import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export const useNoticias = () => {
    const { usuario } = useAuth();
    const userId = usuario?.IdUsuario || usuario?.id;

    return useQuery({
        queryKey: ['noticiasPortafolio', userId],
        queryFn: async () => {
            if (!userId) return null;
            const response = await api.get(`/noticias/usuario/${userId}`);
            return response.data;
        },
        enabled: !!userId, 
        // Las noticias cambian rápido, así que le decimos que la info caduca a los 15 minutos (900000 ms)
        staleTime: 900000, 
    });
};