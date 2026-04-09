// src/features/portafolio/hooks/useProyeccionesIA.js
import { useQuery } from '@tanstack/react-query';
import iaService from '../../../services/iaService';
import portafolioService from '../../../services/portafolioService';
import empresaService from '../../../services/empresaService';

export const useProyeccionesIA = (usuarioId, modeloId = null) => {
    
    const query = useQuery({
        // La caché depende del usuario y del modelo. Si cambia el modelo, refetch automático
        queryKey: ['proyecciones_ia', usuarioId, modeloId],
        queryFn: async () => {
            if (!usuarioId) return { proyecciones: [], sectores: [] };

            // 1. Obtener portafolios y empresas en paralelo
            const [todosLosPortafolios, dataEmpresas] = await Promise.all([
                portafolioService.obtenerTodos(),
                empresaService.obtenerEmpresasConSectores() 
            ]);
    
            const misConexiones = todosLosPortafolios.filter(
                p => p.IdUsuario === usuarioId && p.Activo !== false
            );
            
            if (misConexiones.length === 0) return { proyecciones: [], sectores: [] };

            // 2. Extraer solo los IDs y hacer UNA sola llamada a la IA
            const empresasIds = misConexiones.map(c => c.IdEmpresa);
            const prediccionesMasivas = await iaService.obtenerPrediccionesMasivas(empresasIds, modeloId);
            
            // 3. Armar el objeto final uniendo los datos
            const proyecciones = misConexiones.map((item) => {
                const infoEmpresa = dataEmpresas.empresas.find(e => e.IdEmpresa === item.IdEmpresa);
                
                // Extraemos el resultado usando el ID de la empresa como llave
                const analisis = prediccionesMasivas[item.IdEmpresa] || { 
                    historial: [], prediccion: [], tendencia: 'ESTABLE', confianza: 0 
                };
                        
                return {
                    idEmpresa: item.IdEmpresa,
                    empresa: infoEmpresa ? infoEmpresa.NombreEmpresa : `Empresa #${item.IdEmpresa}`,
                    simbolo: infoEmpresa ? infoEmpresa.Ticket : 'N/A',
                    sector: infoEmpresa ? infoEmpresa.NombreSector : 'Sin Sector',
                    ...analisis // Desestructura historial, prediccion, tendencia, confianza
                };
            });

            const sectores = [...new Set(proyecciones.map(d => d.sector))].filter(Boolean).sort();

            return { proyecciones, sectores };
        },
        enabled: !!usuarioId && modeloId !== '',
        staleTime: 1000 * 60 * 5, // Los datos se consideran "frescos" por 5 minutos (evita recargas innecesarias)
    });

    return { 
        proyecciones: query.data?.proyecciones || [], 
        sectores: query.data?.sectores || [], 
        cargando: query.isLoading, // Solo true la primera vez que carga
        error: query.error ? 'Hubo un problema al cargar las proyecciones.' : null 
    }; 
};