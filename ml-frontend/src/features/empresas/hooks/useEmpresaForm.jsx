// src/features/empresas/hooks/useEmpresaForm.js
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { sectorService } from '../../../services';

export const useEmpresaForm = (empresaInicial, onSave) => {
    const [sectores, setSectores] = useState([]);

    // Inicializamos react-hook-form
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: empresaInicial || { Ticket: '', NombreEmpresa: '', IdSector: '', Activo: true }
    });

    useEffect(() => {
        const cargarSectores = async () => {
            try {
                const data = await sectorService.getAll();
                setSectores(data);
            } catch (error) {
                console.error("Error al cargar sectores", error);
            }
        };
        cargarSectores();
        
        // Si cambia la empresaInicial (ej: editar otra), reseteamos el formulario
        if (empresaInicial) reset(empresaInicial);
    }, [empresaInicial, reset]);

    const onSubmit = (data) => {
        // Transformaciones previas al guardado
        data.Ticket = data.Ticket.toUpperCase();
        onSave(data);
    };

    // Exportamos handleSubmit ya envuelto con nuestra función onSubmit
    return { sectores, register, errors, onSubmit: handleSubmit(onSubmit) };
};