// src/features/ia_analisis/hooks/useResultadoIA.js
import { useQuery } from '@tanstack/react-query';
import { resultadoService } from '../../../services';

export const useResultadoIA = (empresaId) => {
    const { data, isLoading } = useQuery({
        queryKey: ['resultadoIA', empresaId], // La caché es única por empresa
        queryFn: () => resultadoService.obtenerPorEmpresa(empresaId),
        enabled: !!empresaId, // ¡No se ejecuta si empresaId es null!
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    // Lógica visual abstraída (se calcula sola cuando llegan los datos)
    const resultado = data && data.length > 0 ? data[data.length - 1] : null;
    const recomendacionTexto = resultado?.Recomendacion || "Sin datos";
    const esCompra = recomendacionTexto.toLowerCase().includes('alcista') || 
                     recomendacionTexto.toLowerCase().includes('compra');

    return { resultado, cargando: isLoading, recomendacionTexto, esCompra };
};