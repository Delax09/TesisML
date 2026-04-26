import { useQuery } from '@tanstack/react-query';
import { sectorService } from '../../../services';

export const useSectoresList = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['sectores_lista'],
        queryFn: () => sectorService.getAll(),
        staleTime: 1000 * 60 * 60, // Caché dura 1 hora
    });

    return { 
        sectores: data || [], 
        cargando: isLoading, 
        error: error ? "No se pudo conectar con el servidor" : null 
    };
};