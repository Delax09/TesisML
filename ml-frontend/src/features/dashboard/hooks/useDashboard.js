// src/features/dashboard/hooks/useDashboard.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { portafolioService, empresaService } from '../../../services';

export const useDashboard = (usuario) => {
    const [cargando, setCargando] = useState(true);
    const [estadisticas, setEstadisticas] = useState({
        totalEmpresas: 0,
        totalSectores: 0,
        topPredicciones: []
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

                const sectoresUnicos = new Set(misEmpresasCompletas.map(e => e.NombreSector));

                const topIA = misEmpresasCompletas.slice(0, 3).map(e => ({
                    ...e,
                    score: (Math.random() * (95 - 70) + 70).toFixed(1), 
                    tendencia: 'Alcista'
                }));

                setEstadisticas({
                    totalEmpresas: misConexiones.length,
                    totalSectores: sectoresUnicos.size,
                    topPredicciones: topIA
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