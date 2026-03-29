import { useState, useEffect } from 'react';
import { rolService } from '../../../services';

export const useRolesList = () => {
    const [roles, setRoles] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const data = await rolService.getAll();
                setRoles(data);
            } catch (error) {
                console.error("Error cargando roles");
            } finally {
                setCargando(false);
            }
        };
        fetchRoles();
    }, []);

    return { roles, cargando };
};