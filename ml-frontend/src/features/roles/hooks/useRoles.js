import { useQuery } from '@tanstack/react-query';
import { rolService } from '../../../services';

export const useRolesList = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['roles_lista'],
        queryFn: () => rolService.getAll(),
        staleTime: 1000 * 60 * 60, // Caché dura 1 hora
    });

    return { 
        roles: data || [], 
        cargando: isLoading 
    };
};