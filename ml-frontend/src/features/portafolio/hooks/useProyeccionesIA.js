// src/features/portafolio/hooks/useProyeccionesIA.js
import { useState, useEffect, useCallback } from 'react';
import iaService from '../../../services/iaService';
import portafolioService from '../../../services/portafolioService';
import empresaService from '../../../services/empresaService';

export const useProyeccionesIA = (usuarioId) => {
    const [proyecciones, setProyecciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const cargarDatos = useCallback(async () => {
        // Si no hay usuarioId todavía, no hacemos la petición
        if (!usuarioId) {
            setCargando(false);
            return;
        }

        try {
            setCargando(true);
            
            // 1. Descargar portafolios y empresas con sectores (igual que en usePortafolio)
            const [todosLosPortafolios, dataEmpresas] = await Promise.all([
                portafolioService.obtenerTodos(),
                empresaService.obtenerEmpresasConSectores() 
            ]);
    
            // 2. EL FILTRO: Nos quedamos solo con los activos Y que sean del usuario actual
            const misConexiones = todosLosPortafolios.filter(
                p => p.IdUsuario === usuarioId && p.Activo !== false
            );
            
            // 3. Mapear los datos combinados solo de las conexiones válidas
            const datosCompletos = await Promise.all(
                misConexiones.map(async (item) => {
                    // Importante: dataEmpresas tiene la propiedad .empresas por cómo lo armaste en empresaService
                    const infoEmpresa = dataEmpresas.empresas.find(e => e.IdEmpresa === item.IdEmpresa);
                    
                    const analisis = await iaService.obtenerPrediccionEmpresa(item.IdEmpresa);
                            
                    return {
                        empresa: infoEmpresa ? infoEmpresa.NombreEmpresa : `Empresa #${item.IdEmpresa}`,
                        simbolo: infoEmpresa ? infoEmpresa.Ticket : 'N/A',
                        historial: analisis.historial,
                        prediccion: analisis.prediccion,
                        confianza: analisis.confianza || 0,
                        tendencia: analisis.tendencia
                    };
                })
            );

            setProyecciones(datosCompletos);
        } catch (err) {
            setError('Hubo un problema al cargar las proyecciones.');
            console.error(err);
        } finally {
            setCargando(false);
        }
    }, [usuarioId]); // Dependencia del useCallback

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    return { proyecciones, cargando, error };
};