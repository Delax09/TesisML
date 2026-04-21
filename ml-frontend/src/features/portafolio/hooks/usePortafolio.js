// src/features/portafolio/hooks/usePortafolio.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { empresaService, portafolioService } from '../../../services';

export const usePortafolio = (usuarioId) => {
  const queryClient = useQueryClient();

  // 1. Obtención de datos declarativa y en caché con React Query
  const { data, isLoading: cargando } = useQuery({
    queryKey: ['portafolioDatos', usuarioId],
    queryFn: async () => {
      // Cargamos ambos servicios en paralelo para mayor velocidad
      const [dataEmpresas, todosLosPortafolios] = await Promise.all([
        empresaService.obtenerEmpresasConSectores(),
        portafolioService.obtenerTodos()
      ]);
      return { dataEmpresas, todosLosPortafolios };
    },
    enabled: !!usuarioId, // Solo se ejecuta si hay un usuarioId válido
  });

  // 2. Derivación del estado basada en la caché (evita usar múltiples useState y efectos)
  let misEmpresas = [];
  let empresasDisponibles = [];
  let sectoresDisponibles = [];

  if (data) {
    const misConexiones = data.todosLosPortafolios.filter(p => p.IdUsuario === usuarioId && p.Activo !== false);
    const sectoresSet = new Set();

    data.dataEmpresas.empresas.forEach((empresa) => {
      const conexion = misConexiones.find((p) => p.IdEmpresa === empresa.IdEmpresa);
      if (conexion) {
        misEmpresas.push({ ...empresa, IdPortafolio: conexion.IdPortafolio });
      } else {
        empresasDisponibles.push(empresa);
        sectoresSet.add(empresa.NombreSector);
      }
    });

    sectoresDisponibles = Array.from(sectoresSet).sort();
  }

  // 3. Mutaciones para crear/eliminar, con invalidación automática
  const mutacionAgregarUna = useMutation({
    mutationFn: (idEmpresa) => portafolioService.crear(usuarioId, idEmpresa),
    onSuccess: () => {
      toast.success("Empresa agregada");
      // ESTA ES LA MAGIA: Le dice a React Query que los datos son viejos, obligando un re-fetch automático en segundo plano
      queryClient.invalidateQueries({ queryKey: ['portafolioDatos', usuarioId] });
    },
    onError: () => toast.error("Error al agregar")
  });

  const mutacionEliminarUna = useMutation({
    mutationFn: (idPortafolio) => portafolioService.eliminar(idPortafolio),
    onSuccess: () => {
      toast.success("Empresa removida");
      queryClient.invalidateQueries({ queryKey: ['portafolioDatos', usuarioId] });
    },
    onError: () => toast.error("Error al remover")
  });

  const mutacionAgregarMultiples = useMutation({
    mutationFn: async (idsAgregar) => {
      const idNoti = toast.loading(`Agregando ${idsAgregar.length} empresas...`);
      await Promise.all(idsAgregar.map(id => portafolioService.crear(usuarioId, id)));
      toast.success(`Agregadas correctamente`, { id: idNoti });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portafolioDatos', usuarioId] }),
    onError: (error, variables, context) => toast.error("Error al agregar masivamente")
  });

  const mutacionEliminarMultiples = useMutation({
    mutationFn: async (idsEliminar) => {
      const idNoti = toast.loading(`Removiendo ${idsEliminar.length} empresas...`);
      await Promise.all(idsEliminar.map(id => portafolioService.eliminar(id)));
      toast.success(`Removidas correctamente`, { id: idNoti });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portafolioDatos', usuarioId] }),
    onError: () => toast.error("Error al remover masivamente")
  });

  // El flag de proceso masivo lo calculamos si alguna de las mutaciones grupales está activa
  const procesandoMasivo = mutacionAgregarMultiples.isPending || mutacionEliminarMultiples.isPending;

  return {
    misEmpresas,
    empresasDisponibles,
    sectoresDisponibles,
    cargando,
    procesandoMasivo,
    // Exponemos las funciones trigger de las mutaciones
    agregarUna: mutacionAgregarUna.mutate,
    eliminarUna: mutacionEliminarUna.mutate,
    agregarMultiples: mutacionAgregarMultiples.mutate,
    eliminarMultiples: mutacionEliminarMultiples.mutate
  };
};