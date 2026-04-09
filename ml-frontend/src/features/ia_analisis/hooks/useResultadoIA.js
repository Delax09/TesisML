// src/features/ia_analisis/hooks/useResultadoIA.js
import { useState, useEffect } from 'react';
import resultadoService from '../../../services/resultadoService';

export const useResultadoIA = (empresaId, modeloId = null) => {
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let montado = true;

        const cargarResultado = async () => {
            if (!empresaId) return;
            
            setCargando(true);
            try {
                // Pasamos el modeloId al servicio
                const data = await resultadoService.obtenerResultadoPorEmpresa(empresaId, modeloId);
                if (montado) {
                    // Tomamos el primer resultado (el más reciente de ese modelo)
                    setResultado(data && data.length > 0 ? data[0] : null);
                }
            } catch (err) {
                if (montado) {
                    console.error("Error obteniendo resultados:", err);
                    setError(err.message);
                    setResultado(null); // Limpiamos si hay error (ej. 404 no encontrado)
                }
            } finally {
                if (montado) setCargando(false);
            }
        };

        cargarResultado();

        return () => { montado = false; };
    }, [empresaId, modeloId]); // <-- Dependencias clave

    const recomendacionTexto = resultado?.Recomendacion || 'MANTENER';
    const esCompra = recomendacionTexto.toUpperCase() === 'ALCISTA';

    return { resultado, cargando, error, recomendacionTexto, esCompra };
};