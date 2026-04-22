import { useQuery } from '@tanstack/react-query';
import { iaService } from 'services'; // Asegúrate de que iaService esté en tu barril de services

export const useModelosActivos = (usuarioId) => {
  const { data: modelosActivos = [], isLoading: cargandoModelos } = useQuery({
    queryKey: ['modelosActivos', usuarioId],
    queryFn: () => iaService.obtenerModelosPorUsuario(usuarioId),
    enabled: !!usuarioId, // Solo se ejecuta si hay un ID válido
  });

  return { modelosActivos, cargandoModelos };
};