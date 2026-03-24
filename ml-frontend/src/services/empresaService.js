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

const empresaService = {
  obtenerTodas,
  obtenerEmpresasConSectores
};

export default empresaService;