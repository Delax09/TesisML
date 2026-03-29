// src/features/empresas/hooks/useEmpresas.js
import { useQuery } from '@tanstack/react-query';
import { empresaService } from '../../../services';

export const useEmpresas = () => {
    
    // useQuery se encarga de los estados cargando, error y los datos automáticamente
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['empresas_maestro'], // El identificador único de esta caché
        queryFn: () => empresaService.obtenerEmpresasConSectores(),
        staleTime: 1000 * 60 * 5, // Mantiene los datos "frescos" en memoria por 5 minutos
    });

    return { 
        empresas: data?.empresas || [], 
        sectores: data?.sectores || [], 
        cargando: isLoading, 
        error, 
        cargarDatos: refetch // Exportamos refetch como "cargarDatos" para mantener compatibilidad con tu Panel
    };
};