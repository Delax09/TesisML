// src/features/mercado/hooks/usePrecioHistorico.js
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { precioService } from '../../../services';

export const usePrecioHistorico = (empresaId) => {
    const [rango, setRango] = useState('6M');

    // Mantenemos la consulta a la API intacta
    const { data: datosOriginales, isLoading: cargando } = useQuery({
        queryKey: ['precios_historicos', empresaId],
        queryFn: () => precioService.getByEmpresa(empresaId),
        enabled: !!empresaId, 
        staleTime: 1000 * 60 * 10, 
    });

    const handleCambioRango = (event, nuevoRango) => {
        // Solo cambiamos si el usuario no hizo clic en el botón que ya estaba activo
        if (nuevoRango !== null) {
            setRango(nuevoRango);
        }
    };

    const datosFiltrados = useMemo(() => {
        if (!datosOriginales || !datosOriginales.length) return [];

        // 1. LIMPIEZA Y PARSEO ESTRÍCTO
        let datosLimpios = datosOriginales.map(item => {
            // Manejar distintos formatos de fecha que puede escupir el backend
            let fechaBase = item.FechaRegistro ? item.FechaRegistro : item.Fecha;         
            let fechaStr = typeof fechaBase === 'string' ? fechaBase : String(fechaBase);
            fechaStr = fechaStr.replace(' ', 'T').split('.')[0]; 
            const fechaObj = new Date(fechaStr);
            
            const precio = parseFloat(item.PrecioCierre);

            return {
                ...item,
                // Si la fecha es inválida, guardamos 0 temporalmente para filtrarla después
                tiempoMs: isNaN(fechaObj.getTime()) ? 0 : fechaObj.getTime(),
                fechaReal: fechaObj,
                PrecioCierre: isNaN(precio) ? null : precio
            };
        }).filter(d => d.tiempoMs > 0 && d.PrecioCierre !== null);

        // 2. ORDENAR CRONOLÓGICAMENTE (Del más antiguo al más nuevo)
        datosLimpios.sort((a, b) => a.tiempoMs - b.tiempoMs);
        
        if (datosLimpios.length === 0) return [];

        // 3. APLICAR EL FILTRO DE TIEMPO
        let datosRecortados = datosLimpios;
        
        if (rango !== 'TODO') {
            // Buscamos la fecha más reciente (el último elemento tras ordenar)
            const tiempoUltimoDato = datosLimpios[datosLimpios.length - 1].tiempoMs;
            
            // Constantes de tiempo en milisegundos
            const unDiaMs = 24 * 60 * 60 * 1000;
            let diasARestar = 0;

            switch (rango) {
                case '1D': diasARestar = 1; break;
                case '5D': diasARestar = 5; break;
                case '1M': diasARestar = 30; break;
                case '6M': diasARestar = 180; break;
                case '1Y': diasARestar = 365; break;
                case '5Y': diasARestar = 1825; break;
                default: diasARestar = 180;
            }

            const tiempoLimite = tiempoUltimoDato - (diasARestar * unDiaMs);
            
            // Filtramos los datos que sean mayores o iguales a la fecha límite
            datosRecortados = datosLimpios.filter(d => d.tiempoMs >= tiempoLimite);
            
            // Seguridad: Si el filtro recortó tanto que la gráfica quedaría en blanco, 
            // devolvemos al menos los últimos 2 datos para trazar una línea.
            if (datosRecortados.length < 2) {
                datosRecortados = datosLimpios.slice(-2);
            }
        }

        // 4. FORMATEAR PARA RECHARTS
        // Si el rango es de 1 o 5 días, mostramos la hora. Si es más largo, mostramos fecha.
        const mostrarHora = rango === '1D' || rango === '5D';

        return datosRecortados.map(d => ({
            ...d,
            FechaCorta: mostrarHora 
                ? d.fechaReal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : d.fechaReal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            FechaLarga: d.fechaReal.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        }));

    }, [datosOriginales, rango]); // Recalcula si cambian los datos o el usuario hace clic en el filtro

    return { datosFiltrados, rango, cargando, handleCambioRango };
};