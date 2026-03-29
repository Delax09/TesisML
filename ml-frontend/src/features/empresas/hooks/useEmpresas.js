// src/features/empresas/hooks/useEmpresas.js
import { useState, useEffect, useCallback } from 'react';
import { empresaService } from '../../../services'; 

export const useEmpresas = () => {
    const [empresas, setEmpresas] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // 1. Extraemos la función fuera del useEffect y usamos useCallback
    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            const data = await empresaService.obtenerEmpresasConSectores();
            setEmpresas(data.empresas);
            setSectores(data.sectores);
        } catch (err) {
            console.error("Error cargando tabla de empresas:", err);
            setError(err);
        } finally {
            setCargando(false);
        }
    }, []); // El array vacío asegura que la función no se recree en cada render

    // 2. Llamamos a la función cuando el componente se monta por primera vez
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // 3. Exportamos la función cargarDatos para que otros componentes puedan forzar la recarga
    return { empresas, sectores, cargando, error, cargarDatos };
};