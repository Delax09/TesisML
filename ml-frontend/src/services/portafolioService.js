// src/services/portafolioService.js
import api from './api';

const obtenerTodos = async () => {
  const response = await api.get('/portafolios');
  return response.data;
};

const crear = async (idUsuario, idEmpresa) => {
  const response = await api.post('/portafolios', {
    IdUsuario: idUsuario,
    IdEmpresa: idEmpresa,
    FechaAgregado: new Date().toISOString() // <- ¡AQUÍ AGREGAMOS LA FECHA!
  });
  return response.data;
};

const eliminar = async (idPortafolio) => {
  const response = await api.delete(`/portafolios/${idPortafolio}`);
  return response.data;
};

const portafolioService = {
  obtenerTodos,
  crear,
  eliminar
};

export default portafolioService;