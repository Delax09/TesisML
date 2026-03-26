// src/services/empresaService.js
import api from './api';

const obtenerTodas = async () => {
  const response = await api.get('/empresas');
  return response.data;
};

// NUEVA FUNCIÓN: Trae empresas, sectores y los cruza en un solo lugar
const obtenerEmpresasConSectores = async () => {
  // 1. Hacemos ambas peticiones en paralelo
  const [empresasRes, sectoresRes] = await Promise.all([
    api.get('/empresas'),
    api.get('/sectores')
  ]);

  const empresas = empresasRes.data;
  const sectores = sectoresRes.data;

  // 2. Cruzamos los datos aquí mismo en el servicio
  const empresasMapeadas = empresas.map(empresa => {
    const sectorMatch = sectores.find(s => s.IdSector === empresa.IdSector);
    return {
      ...empresa,
      NombreSector: sectorMatch ? sectorMatch.NombreSector : 'Sin Sector'
    };
  });

  // 3. Devolvemos un objeto limpio con lo que necesita la vista
  return {
    empresas: empresasMapeadas,
    sectores: sectores
  };
};

const crear = async (datos) => {
  // datos: { Ticket, NombreEmpresa, IdSector, Activo }
  const response = await api.post('/empresas', datos);
  return response.data;
};

const actualizar = async (id, datos) => {
  const response = await api.put(`/empresas/${id}`, datos);
  return response.data;
};

const eliminar = async (id) => {
  const response = await api.delete(`/empresas/${id}`);
  return response.data;
};

const empresaService = {
  obtenerTodas,
  obtenerEmpresasConSectores,
  crear,      // <--- ¡No olvides exportarlos!
  actualizar,
  eliminar
};

export default empresaService;