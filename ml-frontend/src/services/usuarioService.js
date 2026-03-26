import api from './api';

const actualizarPerfil = async (id, datos) => {
  // datos: { nombre, email, password (opcional) }
  const response = await api.put(`/usuarios/${id}`, datos);
  return response.data;
};

const usuarioService = {
  actualizarPerfil
};

export default usuarioService;