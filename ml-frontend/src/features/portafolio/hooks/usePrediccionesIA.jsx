// src/features/portafolio/hooks/usePrediccionesIA.js
import { useState, useEffect, useCallback } from 'react';
import resultadoService from '../../../services/resultadoService';

export const usePrediccionesIA = () => {
    const [predicciones, setPredicciones] = useState({});
    const [cargandoIA, setCargandoIA] = useState(false);
    const [error, setError] = useState(null); // NUEVO: Manejo de red

    // NUEVO: Separamos la lógica en una función recargable
    const cargarIA = useCallback(async () => {
        try {
            setCargandoIA(true);
            setError(null);
            const data = await resultadoService.obtenerUltimosResultados();
            
            const diccionario = {};
            data.forEach(resultado => { 
                diccionario[resultado.IdEmpresa] = resultado; 
            });
            
            setPredicciones(diccionario);
        } catch (err) {
            console.error("Error al cargar predicciones de IA:", err);
            setError(err); // Guardamos el error por si la UI quiere mostrar un botón de "Reintentar"
        } finally {
            setCargandoIA(false);
        }
    }, []);

    useEffect(() => {
        cargarIA();
    }, [cargarIA]); 

    // NUEVO: Exportamos 'refetch' para poder recargar manualmente
    return { predicciones, cargandoIA, error, refetch: cargarIA };
};