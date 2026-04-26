// src/services/resultadoService.js
import api from './api';

/**
 * Obtiene todos los resultados históricos de la base de datos.
 */
const obtenerTodos = async () => {
  const response = await api.get('/resultados');
  return response.data;
};

const obtenerResultadoPorEmpresa = async (empresaId, modeloId = null) => {
    // Si viene un modeloId, lo agregamos como Query Parameter
    const params = modeloId ? { modelo_id: modeloId } : {};
    const response = await api.get(`/resultados/empresa/${empresaId}`, { params });
    return response.data;
};

/**
 * Obtiene un resultado específico por su ID.
 */
const obtenerPorId = async (id) => {
  const response = await api.get(`/resultados/${id}`);
  return response.data;
};

/**
 * Obtiene el historial de análisis de una empresa en particular.
 * Ideal para trazar gráficos de cómo ha evolucionado la predicción, MACD, RSI, etc.
 * @param {number} idEmpresa - ID de la empresa
 */
const obtenerPorEmpresa = async (idEmpresa) => {
  // Asumiendo que tu backend expone una ruta tipo /resultados/empresa/{id}
  // Si usa query params sería: api.get(`/resultados?idEmpresa=${idEmpresa}`)
  const response = await api.get(`/resultados/empresa/${idEmpresa}`);
  return response.data;
};

/**
 * Obtiene solo el ÚLTIMO análisis generado para cada empresa.
 * Esta es la función clave que usarás en el `useDashboard.js` para reemplazar 
 * los números aleatorios (Math.random) por las predicciones reales de tu IA.
 */
const obtenerUltimosResultados = async () => {
  const response = await api.get('/resultados/ultimos');
  return response.data;
};

/**
 * Crea un nuevo registro de resultado.
 * (Nota: En un flujo ML real, normalmente es el backend de Python quien inserta 
 * esto en la BD tras ejecutar el modelo, pero se deja por si necesitas inserción manual/testing).
 */
const crear = async (datos) => {
  /* datos esperados según tu BD: 
   { PrecioActual, PrediccionIA, VariacionPCT, RSI, Score, MACD, ATR, EMA20, EMA50, Recomendacion, IdEmpresa, IdModelo } 
  */
  const response = await api.post('/resultados', datos);
  return response.data;
};

/**
 * Elimina un registro de resultado específico.
 */
const eliminar = async (id) => {
  const response = await api.delete(`/resultados/${id}`);
  return response.data;
};



const resultadoService = {
  obtenerTodos,
  obtenerResultadoPorEmpresa,
  obtenerPorId,
  obtenerPorEmpresa,
  obtenerUltimosResultados,
  crear,
  eliminar
};

export default resultadoService;