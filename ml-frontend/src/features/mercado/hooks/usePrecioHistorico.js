// src/features/mercado/hooks/usePrecioHistorico.js
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { precioService } from '../../../services';

export const usePrecioHistorico = (empresaId) => {
    // Por defecto iniciamos la vista en 6M
    const [rango, setRango] = useState('6M');

    const { data: datosOriginales, isLoading: cargando } = useQuery({
        queryKey: ['precios_historicos', empresaId],
        queryFn: () => precioService.obtener_precio_historico_por_empresa(empresaId),
        enabled: !!empresaId, 
        staleTime: 1000 * 60 * 10, 
    });

    const handleCambioRango = (event, nuevoRango) => {
        if (nuevoRango !== null) {
            setRango(nuevoRango);
        }
    };

    const datosFiltrados = useMemo(() => {
        if (!datosOriginales || !datosOriginales.length) return [];

        // 1. LIMPIEZA Y PARSEO ESTRÍCTO (Sin alterar esta lógica que tienes bien)
        let datosLimpios = datosOriginales.map(item => {
            let fechaBase = item.FechaRegistro ? item.FechaRegistro : item.Fecha;        
            let fechaStr = typeof fechaBase === 'string' ? fechaBase : String(fechaBase);
            fechaStr = fechaStr.replace(' ', 'T').split('.')[0]; 
            const fechaObj = new Date(fechaStr);
            const precio = parseFloat(item.PrecioCierre);

            return {
                ...item,
                tiempoMs: isNaN(fechaObj.getTime()) ? 0 : fechaObj.getTime(),
                fechaReal: fechaObj,
                PrecioCierre: isNaN(precio) ? null : precio
            };
        }).filter(d => d.tiempoMs > 0 && d.PrecioCierre !== null);

        // 2. ORDENAR CRONOLÓGICAMENTE
        datosLimpios.sort((a, b) => a.tiempoMs - b.tiempoMs);
        
        // 3. DEVOLVER EL 100% DE LOS DATOS.
        // YA NO recortamos con slice() o filter() aquí, 
        // TradingView lo manejará como un acercamiento de cámara (zoom)
        return datosLimpios;

    }, [datosOriginales]); // Ya no depende de `rango`, siempre devuelve todo.

    return { datosFiltrados, rango, cargando, handleCambioRango };
};