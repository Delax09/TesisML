// src/features/admin/hooks/useAccesosIA.js
import { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { notificar } from '../../../utils/notificaciones'; 

export const useAccesosIA = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [modelosDisponibles, setModelosDisponibles] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modelosUsuario, setModelosUsuario] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setLoading(true);
      try {
        const [usersRes, modelosRes] = await Promise.all([
          adminService.getUsuarios(),
          adminService.getTodosModelos()
        ]);
        
        // NUEVO: Filtrar para excluir a los administradores (IdRol === 2)
        const usuariosFiltrados = usersRes.filter(usuario => usuario.IdRol !== 2);
        
        setUsuarios(usuariosFiltrados);
        setModelosDisponibles(modelosRes);
      } catch (error) {
        // CORRECCIÓN: Uso del método .error
        notificar.error("Error al cargar usuarios y modelos.");
      } finally {
        setLoading(false);
      }
    };
    cargarDatosIniciales();
  }, []);

  // Cargar los modelos de un usuario cuando se selecciona
  useEffect(() => {
    if (!usuarioSeleccionado) {
      setModelosUsuario([]);
      return;
    }

    const cargarModelosUsuario = async () => {
      setLoading(true);
      try {
        const accesos = await adminService.getModelosPorUsuario(usuarioSeleccionado.IdUsuario);
        setModelosUsuario(accesos);
      } catch (error) {
        // CORRECCIÓN: Uso del método .error
        notificar.error("Error al cargar los accesos del usuario.");
      } finally {
        setLoading(false);
      }
    };

    cargarModelosUsuario();
  }, [usuarioSeleccionado]);

  // Función para alternar el acceso
  const alternarAcceso = async (idModelo) => {
    if (!usuarioSeleccionado) return;

    try {
      setLoading(true);
      const resultado = await adminService.toggleModeloUsuario(usuarioSeleccionado.IdUsuario, idModelo);
      
      // Actualizar el estado local
      if (resultado.Activo) {
        const modeloAñadido = modelosDisponibles.find(m => m.IdModelo === idModelo);
        if (modeloAñadido) {
           setModelosUsuario(prev => [...prev, modeloAñadido]);
        }
      } else {
        setModelosUsuario(prev => prev.filter(m => m.IdModelo !== idModelo));
      }
      
      // CORRECCIÓN: Uso del método .exito
      notificar.exito(resultado.message);
    } catch (error) {
      // CORRECCIÓN: Uso del método .error
      notificar.error("Error al cambiar el estado del modelo.");
    } finally {
      setLoading(false);
    }
  };

  return {
    usuarios,
    modelosDisponibles,
    usuarioSeleccionado,
    setUsuarioSeleccionado,
    modelosUsuario,
    alternarAcceso,
    loading
  };
};