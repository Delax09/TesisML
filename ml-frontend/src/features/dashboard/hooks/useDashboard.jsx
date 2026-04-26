// src/features/dashboard/hooks/useDashboard.js
import { useState, useEffect, useCallback } from 'react';
import { portafolioService, empresaService } from '../../../services';
import resultadoService from '../../../services/resultadoService';
import { notificar } from '../../../utils/notificaciones'; // Usamos tu abstracción

export const useDashboard = (usuario) => {
    const [cargando, setCargando] = useState(true);
    const [estadisticas, setEstadisticas] = useState({
        totalEmpresas: 0,
        totalSectores: 0,
        topPredicciones: [],
        sentimientoGeneral: 'Neutral',
        distribucionSectores: []
    });

    // Separamos en useCallback para permitir "Pull to Refresh"
    const cargarDashboard = useCallback(async () => {
        if (!usuario?.id) return;

        try {
            setCargando(true);
            
            // 🔥 MEJORA MÓVIL: Promise.all dispara las 3 peticiones al mismo tiempo
            // Esto reduce el tiempo de espera a lo que tarde la petición más lenta, no a la suma de las tres.
            const [dataEmpresas, todosLosPortafolios, resultadosIA] = await Promise.all([
                empresaService.obtenerEmpresasConSectores(),
                portafolioService.obtenerTodos(),
                resultadoService.obtenerUltimosResultados()
            ]);
            
            const misConexiones = todosLosPortafolios.filter(p => p.IdUsuario === usuario.id && p.Activo !== false);

            const misEmpresasCompletas = misConexiones.map(conexion => {
                return dataEmpresas.empresas.find(e => e.IdEmpresa === conexion.IdEmpresa);
            }).filter(e => e !== undefined);

            // 1. Distribución de Sectores
            const conteoSectores = {};
            misEmpresasCompletas.forEach(emp => {
                conteoSectores[emp.NombreSector] = (conteoSectores[emp.NombreSector] || 0) + 1;
            });
            
            const distribucion = Object.keys(conteoSectores).map(sector => ({
                nombre: sector,
                cantidad: conteoSectores[sector]
            })).sort((a, b) => b.cantidad - a.cantidad);

            // 2. OBTENER RESULTADOS REALES (Usando resultadosIA descargado en paralelo)
            const prediccionesReales = misEmpresasCompletas.map(emp => {
                const resultado = resultadosIA.find(r => r.IdEmpresa === emp.IdEmpresa);
                
                let score = 0, tendencia = 'Neutral', precioActual = 0, precioPredicho = 0, rsi = 0;

                if (resultado) {
                    score = parseFloat(resultado.Score) || 0;
                    precioActual = parseFloat(resultado.PrecioActual) || 0;
                    precioPredicho = parseFloat(resultado.PrediccionIA) || 0;
                    rsi = parseFloat(resultado.RSI) || 0;
                    
                    if (resultado.Recomendacion === 'ALCISTA') tendencia = 'Alcista';
                    else if (resultado.Recomendacion === 'BAJISTA') tendencia = 'Bajista';
                }

                return {
                    ...emp, score, tendencia, precioActual, precioPredicho, rsi,
                    analizado: !!resultado 
                };
            });

            const topIA = prediccionesReales
                .filter(emp => emp.analizado) 
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            // 3. Sentimiento General
            let sentimiento = 'Neutral';
            const analizadas = prediccionesReales.filter(emp => emp.analizado);
            
            if (analizadas.length > 0) {
                const promedioScore = analizadas.reduce((acc, curr) => acc + curr.score, 0) / analizadas.length;
                
                if (promedioScore >= 1.5) sentimiento = 'Fuerte Alcista';
                else if (promedioScore >= 0.5) sentimiento = 'Alcista';
                else if (promedioScore <= -0.5) sentimiento = 'Bajista';
            }

            setEstadisticas({
                totalEmpresas: misConexiones.length,
                totalSectores: Object.keys(conteoSectores).length,
                topPredicciones: topIA,
                sentimientoGeneral: sentimiento,
                distribucionSectores: distribucion
            });

        } catch (error) {
            console.error("Error cargando dashboard:", error);
            // 🔥 CAMBIO AQUÍ: Usamos la abstracción en lugar de toast directo
            notificar.error("Error de conexión. Verifica tu internet y reintenta."); 
        } finally {
            setCargando(false);
        }
    }, [usuario?.id]); // Solo se recrea si cambia el ID del usuario

    useEffect(() => {
        cargarDashboard();
    }, [cargarDashboard]);

    // Exportamos 'recargar' 
    return { cargando, estadisticas, recargar: cargarDashboard };
};