// src/features/dashboard/hooks/useDashboard.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { portafolioService, empresaService } from '../../../services';
import resultadoService from '../../../services/resultadoService';

export const useDashboard = (usuario) => {
    const [cargando, setCargando] = useState(true);
    const [estadisticas, setEstadisticas] = useState({
        totalEmpresas: 0,
        totalSectores: 0,
        topPredicciones: [],
        sentimientoGeneral: 'Neutral',
        distribucionSectores: []
    });

    useEffect(() => {
        const cargarDashboard = async () => {
            try {
                setCargando(true);
                
                const dataEmpresas = await empresaService.obtenerEmpresasConSectores();
                const todosLosPortafolios = await portafolioService.obtenerTodos();
                
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

                // 2. OBTENER RESULTADOS REALES
                const resultadosIA = await resultadoService.obtenerUltimosResultados();

                const prediccionesReales = misEmpresasCompletas.map(emp => {
                    const resultado = resultadosIA.find(r => r.IdEmpresa === emp.IdEmpresa);
                    
                    let score = 0;
                    let tendencia = 'Neutral';
                    let precioActual = 0;
                    let precioPredicho = 0;
                    let rsi = 0;

                    if (resultado) {
                        score = parseFloat(resultado.Score) || 0;
                        precioActual = parseFloat(resultado.PrecioActual) || 0;
                        precioPredicho = parseFloat(resultado.PrediccionIA) || 0;
                        rsi = parseFloat(resultado.RSI) || 0;
                        
                        // Mapear los estados de tu BD a la UI
                        if (resultado.Recomendacion === 'ALCISTA') tendencia = 'Alcista';
                        else if (resultado.Recomendacion === 'BAJISTA') tendencia = 'Bajista';
                        else tendencia = 'Neutral'; // Para "MANTENER" o nulos
                    }

                    return {
                        ...emp,
                        score,
                        tendencia,
                        precioActual,
                        precioPredicho,
                        rsi,
                        analizado: !!resultado // Bandera para saber si la IA ya la procesó
                    };
                });

                // Ordenamos por mejor score para mostrar el Top
                const topIA = prediccionesReales
                    .filter(emp => emp.analizado) // Solo mostramos las que tienen análisis
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                // 3. Sentimiento General (Basado en la escala de -1, 0, 1, 2)
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
                toast.error("No se pudieron cargar tus estadísticas");
            } finally {
                setCargando(false);
            }
        };

        if (usuario?.id) {
            cargarDashboard();
        }
    }, [usuario]);

    return { cargando, estadisticas };
};