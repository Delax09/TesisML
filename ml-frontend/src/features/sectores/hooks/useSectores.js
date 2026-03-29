import { useState, useEffect } from 'react';
import { sectorService } from '../../../services';

export const useSectoresList = () => {
    const [sectores, setSectores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await sectorService.getAll();
                setSectores(data);
                setCargando(false);
            } catch (err) {
                setError("No se pudo conectar con el servidor de Sectores");
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    return { sectores, cargando, error };
};