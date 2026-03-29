import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import resultadoService from '../../../services/resultadoService'; 
import empresaService from '../../../services/empresaService'; // CORRECCIÓN 1: Importación sin llaves {}

// CORRECCIÓN 2: Sacamos esta función matemática fuera del componente para que no interfiera con los Hooks
const calcularErrores = (datos, keyPrediccion) => {
  const validData = datos.filter(d => d.precioReal && d[keyPrediccion]);
  if (validData.length === 0) return { mae: 0, rmse: 0 };

  let sumaAbs = 0;
  let sumaCuad = 0;

  validData.forEach(d => {
    const error = d.precioReal - d[keyPrediccion];
    sumaAbs += Math.abs(error);
    sumaCuad += Math.pow(error, 2);
  });

  return {
    mae: (sumaAbs / validData.length).toFixed(4),
    rmse: Math.sqrt(sumaCuad / validData.length).toFixed(4)
  };
};

const ComparadorIA = () => {
  const [idEmpresa, setIdEmpresa] = useState(''); 
  const [empresas, setEmpresas] = useState([]); 
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [metricas, setMetricas] = useState({ m1: { mae: 0, rmse: 0 }, m2: { mae: 0, rmse: 0 } });
  const [ultimoAnalisis, setUltimoAnalisis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar lista de empresas al montar el componente
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const data = await empresaService.obtenerTodas();
        setEmpresas(data);
        if (data.length > 0) {
          setIdEmpresa(data[0].IdEmpresa);
        }
      } catch (error) {
        console.error("Error cargando empresas:", error);
      }
    };
    cargarEmpresas();
  }, []);

  // CORRECCIÓN 3: Metemos cargarDatos dentro del useEffect para quitar el Warning
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const resultados = await resultadoService.obtenerPorEmpresa(idEmpresa);
        
        // Procesar datos para el gráfico
        const datosAgrupados = {};
        resultados.forEach(res => {
          const fecha = res.FechaAnalisis.split('T')[0]; 
          if (!datosAgrupados[fecha]) {
            datosAgrupados[fecha] = { fecha, precioReal: parseFloat(res.PrecioActual) };
          }
          if (res.IdModelo === 1) datosAgrupados[fecha].prediccionM1 = parseFloat(res.PrediccionIA);
          if (res.IdModelo === 2) datosAgrupados[fecha].prediccionM2 = parseFloat(res.PrediccionIA);
        });

        const arrayGrafico = Object.values(datosAgrupados).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setDatosGrafico(arrayGrafico);

        // Calcular RMSE y MAE
        setMetricas({
          m1: calcularErrores(arrayGrafico, 'prediccionM1'),
          m2: calcularErrores(arrayGrafico, 'prediccionM2')
        });

        // Extraer el último análisis
        if (resultados.length > 0) {
          const ultimo = resultados.sort((a, b) => new Date(b.FechaAnalisis) - new Date(a.FechaAnalisis))[0];
          setUltimoAnalisis(ultimo);
        } else {
          setUltimoAnalisis(null); // Limpiar si no hay resultados para esa empresa
        }

      } catch (error) {
        console.error("Error cargando comparativa", error);
      }
      setLoading(false);
    };

    if (idEmpresa) {
      cargarDatos();
    }
  }, [idEmpresa]); // Ahora React sabe que el único trigger correcto es idEmpresa

  if (loading) return <p style={{ padding: '20px' }}>Cargando comparativa de modelos...</p>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Comparativa de Modelos IA y Explicabilidad (XAI)</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label><strong>Seleccionar Empresa: </strong></label>
        <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ padding: '5px', marginLeft: '10px' }}>
          {empresas.map((emp) => (
            <option key={emp.IdEmpresa} value={emp.IdEmpresa}>
              {emp.Ticket} - {emp.NombreEmpresa}
            </option>
          ))}
        </select>
      </div>

      {/* Gráfico */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Proyección de Precios</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="precioReal" stroke="#000000" strokeWidth={3} name="Precio Cierre (Real)" dot={false} />
            <Line type="monotone" dataKey="prediccionM1" stroke="#8884d8" name="LSTM Clásico (v1)" dot={false} />
            <Line type="monotone" dataKey="prediccionM2" stroke="#82ca9d" name="LSTM Bidireccional (v2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Tabla de Métricas */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Métricas de Error (Evaluación)</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '10px 0' }}>Modelo</th>
                <th>MAE</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 0' }}>LSTM Clásico (v1)</td>
                <td>{metricas.m1.mae}</td>
                <td>{metricas.m1.rmse}</td>
              </tr>
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                <td style={{ padding: '10px 0' }}><strong>LSTM Bidireccional (v2)</strong></td>
                <td><strong>{metricas.m2.mae}</strong></td>
                <td><strong>{metricas.m2.rmse}</strong></td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
            * RMSE penaliza más las desviaciones grandes. Menor valor indica mejor ajuste a la volatilidad del mercado.
          </p>
        </div>

        {/* Panel Explicabilidad (XAI) */}
        {ultimoAnalisis ? (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>Explicabilidad de la IA (Caja Blanca)</h3>
            <p><strong>Última Fecha Analizada:</strong> {new Date(ultimoAnalisis.FechaAnalisis).toLocaleString()}</p>
            
            <div style={{ marginTop: '15px' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Recomendación Final: </strong> 
                <span style={{ 
                  backgroundColor: ultimoAnalisis.Recomendacion === 'ALCISTA' ? '#dcfce7' : '#fee2e2', 
                  color: ultimoAnalisis.Recomendacion === 'ALCISTA' ? '#166534' : '#991b1b',
                  padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' 
                }}>
                  {ultimoAnalisis.Recomendacion}
                </span>
              </div>
              <ul style={{ lineHeight: '1.8' }}>
                <li>
                  <strong>RSI ({ultimoAnalisis.RSI ? parseFloat(ultimoAnalisis.RSI).toFixed(2) : 'N/D'}): </strong> 
                  {!ultimoAnalisis.RSI ? "Dato no calculado." : ultimoAnalisis.RSI < 30 ? "Mercado en sobreventa (Fuerza bajista agotada, posible rebote)." : ultimoAnalisis.RSI > 70 ? "Mercado en sobrecompra (Posible corrección)." : "Zona neutral."}
                </li>
                <li>
                  <strong>MACD ({ultimoAnalisis.MACD ? parseFloat(ultimoAnalisis.MACD).toFixed(2) : 'N/D'}): </strong> 
                  {!ultimoAnalisis.MACD ? "Dato no calculado." : ultimoAnalisis.MACD < 0 ? "Tendencia actual a la baja." : "Tendencia actual al alza."}
                </li>
                <li>
                  <strong>Medias Móviles: </strong> 
                  El precio actual (${ultimoAnalisis.PrecioActual ? parseFloat(ultimoAnalisis.PrecioActual).toFixed(2) : '0'}) frente a su EMA20 (${ultimoAnalisis.EMA20 ? parseFloat(ultimoAnalisis.EMA20).toFixed(2) : 'N/D'}).
                </li>
                <li>
                  <strong>Volatilidad (ATR): </strong> 
                  {ultimoAnalisis.ATR ? parseFloat(ultimoAnalisis.ATR).toFixed(2) : 'N/D'} USD diarios en promedio.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p>No hay análisis recientes para esta empresa.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparadorIA;