// src/features/mercado/hooks/usePrecioHistorico.js
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { precioService } from '../../../services';

export const usePrecioHistorico = (empresaId) => {
    const [rango, setRango] = useState('6M');

    const { data: datosOriginales, isLoading: cargando } = useQuery({
        queryKey: ['precios_historicos', empresaId],
        queryFn: () => precioService.getByEmpresa(empresaId),
        enabled: !!empresaId, 
        staleTime: 1000 * 60 * 10, 
    });

    const handleCambioRango = (event, nuevoRango) => {
        if (nuevoRango !== null) setRango(nuevoRango);
    };

    const datosFiltrados = useMemo(() => {
        if (!datosOriginales || !datosOriginales.length) return [];

        const formatearParaGrafica = (item, tipoCorta = true) => {
            let fechaObj;
            try {
                if (item.Fecha instanceof Date) fechaObj = item.Fecha;
                else if (typeof item.Fecha === 'string') fechaObj = new Date(item.Fecha.replace(' ', 'T').split('.')[0]);
                else if (typeof item.Fecha === 'number') fechaObj = new Date(item.Fecha);

                if (!fechaObj || isNaN(fechaObj.getTime())) fechaObj = new Date(item.Fecha);
                if (isNaN(fechaObj.getTime())) return { ...item, fechaValida: null, FechaCorta: 'Err', FechaLarga: 'Err' };

                return {
                    ...item,
                    fechaValida: fechaObj,
                    FechaCorta: tipoCorta 
                        ? fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : fechaObj.toLocaleDateString('es-ES'),
                    // NUEVO: Creamos una fecha siempre completa para el Tooltip
                    FechaLarga: fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                };
            } catch (e) {
                return { ...item, fechaValida: null, FechaCorta: 'Err', FechaLarga: 'Err' };
            }
        };

        const datosProcesados = datosOriginales.map(d => formatearParaGrafica(d, rango !== 'TODO'));
        datosProcesados.sort((a, b) => (a.fechaValida && b.fechaValida ? a.fechaValida.getTime() - b.fechaValida.getTime() : 0));
        
        if (rango === 'TODO') return datosProcesados;

        const datosConFecha = datosProcesados.filter(d => d.fechaValida);
        if (!datosConFecha.length) return [];

        const ultimaFecha = datosConFecha[datosConFecha.length - 1].fechaValida;
        const fechaLimite = new Date(ultimaFecha.getTime());

        if (rango === '1D') fechaLimite.setDate(fechaLimite.getDate() - 1);
        else if (rango === '5D') fechaLimite.setDate(fechaLimite.getDate() - 5);
        else if (rango === '1M') fechaLimite.setMonth(fechaLimite.getMonth() - 1);
        else if (rango === '6M') fechaLimite.setMonth(fechaLimite.getMonth() - 6);
        else if (rango === '1Y') fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);
        else if (rango === '5Y') fechaLimite.setFullYear(fechaLimite.getFullYear() - 5);

        return datosProcesados.filter(d => d.fechaValida && d.fechaValida >= fechaLimite);
    }, [datosOriginales, rango]);

    return { datosFiltrados, rango, cargando, handleCambioRango };
}; 