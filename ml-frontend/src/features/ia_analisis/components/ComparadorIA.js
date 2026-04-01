// src/features/ia_analisis/components/ComparadorIA.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import resultadoService from '../../../services/resultadoService'; 
import empresaService from '../../../services/empresaService';

import { 
  Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Grid, Chip, List, ListItem, ListItemIcon, ListItemText, Divider, CircularProgress, useTheme 
} from '@mui/material'; // <-- SE AGREGÓ ListItemIcon AQUÍ

// Íconos para la explicabilidad
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import SpeedIcon from '@mui/icons-material/Speed';

const calcularErrores = (datos, keyPrediccion) => {
  const validData = datos.filter(d => d.precioReal && d[keyPrediccion]);
  if (validData.length === 0) return { mae: 0, rmse: 0 };
  let sumaAbs = 0; let sumaCuad = 0;
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
  const theme = useTheme();
  const [idEmpresa, setIdEmpresa] = useState(''); 
  const [empresas, setEmpresas] = useState([]); 
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [metricas, setMetricas] = useState({ m1: { mae: 0, rmse: 0 }, m2: { mae: 0, rmse: 0 } });
  const [ultimoAnalisis, setUltimoAnalisis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const data = await empresaService.obtenerTodas();
        setEmpresas(data);
        if (data.length > 0) setIdEmpresa(data[0].IdEmpresa);
      } catch (error) { console.error("Error cargando empresas:", error); }
    };
    cargarEmpresas();
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const resultados = await resultadoService.obtenerPorEmpresa(idEmpresa);
        const datosAgrupados = {};
        resultados.forEach(res => {
          const fecha = res.FechaAnalisis.split('T')[0]; 
          if (!datosAgrupados[fecha]) datosAgrupados[fecha] = { fecha, precioReal: parseFloat(res.PrecioActual) };
          if (res.IdModelo === 1) datosAgrupados[fecha].prediccionBrutaM1 = parseFloat(res.PrediccionIA);
          if (res.IdModelo === 2) datosAgrupados[fecha].prediccionBrutaM2 = parseFloat(res.PrediccionIA);
        });

        const arrayCronologico = Object.values(datosAgrupados).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        const datosAlineados = [];
        for (let i = 1; i < arrayCronologico.length; i++) {
          const datoHoy = arrayCronologico[i];
          const datoAyer = arrayCronologico[i - 1];
          datosAlineados.push({
            fecha: datoHoy.fecha,
            precioReal: datoHoy.precioReal,
            prediccionM1: datoAyer.prediccionBrutaM1,
            prediccionM2: datoAyer.prediccionBrutaM2
          });
        }
        setDatosGrafico(datosAlineados);
        setMetricas({
          m1: calcularErrores(datosAlineados, 'prediccionM1'),
          m2: calcularErrores(datosAlineados, 'prediccionM2')
        });
        if (resultados.length > 0) {
          const ultimo = resultados.sort((a, b) => new Date(b.FechaAnalisis) - new Date(a.FechaAnalisis))[0];
          setUltimoAnalisis(ultimo);
        } else { setUltimoAnalisis(null); }
      } catch (error) { console.error("Error cargando comparativa", error); }
      setLoading(false);
    };
    if (idEmpresa) cargarDatos();
  }, [idEmpresa]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      
      <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Typography variant="h6" fontWeight="bold">Analizar Activo:</Typography>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel id="select-empresa-label">Empresa / Ticker</InputLabel>
          <Select
            labelId="select-empresa-label"
            value={idEmpresa}
            label="Empresa / Ticker"
            onChange={(e) => setIdEmpresa(e.target.value)}
          >
            {empresas.map((emp) => (
              <MenuItem key={emp.IdEmpresa} value={emp.IdEmpresa}>
                {emp.Ticket} - {emp.NombreEmpresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Proyección de Precios</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Comparativa entre el precio real de cierre y las predicciones de los modelos v1 y v2.</Typography>
        
        <Box sx={{ width: '100%', height: 450 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
              <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadows[3] }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              <Line type="monotone" dataKey="precioReal" stroke={theme.palette.text.primary} strokeWidth={4} name="Precio Cierre (Real)" dot={false} />
              <Line type="monotone" dataKey="prediccionM1" stroke={theme.palette.primary.main} name="LSTM Clásico (v1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="prediccionM2" stroke={theme.palette.secondary.main} name="LSTM Bidireccional (v2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Métricas de Error (Evaluación)</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Modelo</TableCell>
                    <TableCell align="right">MAE</TableCell>
                    <TableCell align="right">RMSE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>LSTM Clásico (v1)</TableCell>
                    <TableCell align="right">{metricas.m1.mae}</TableCell>
                    <TableCell align="right">{metricas.m1.rmse}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'market.positive.bg' }}>
                    <TableCell sx={{ color: 'market.positive.text', fontWeight: 'bold' }}>LSTM Bidireccional (v2)</TableCell>
                    <TableCell align="right" sx={{ color: 'market.positive.text', fontWeight: 'bold' }}>{metricas.m1.mae}</TableCell>
                    <TableCell align="right" sx={{ color: 'market.positive.text', fontWeight: 'bold' }}>{metricas.m1.rmse}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
              * RMSE penaliza más las desviaciones grandes. Menor valor indica mejor ajuste a la volatilidad.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Explicabilidad de la IA (Caja Blanca)</Typography>
            
            {ultimoAnalisis ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Último análisis: {new Date(ultimoAnalisis.FechaAnalisis).toLocaleString()}
                </Typography>
                
                <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Recomendación:</Typography>
                  <Chip 
                    label={ultimoAnalisis.Recomendacion} 
                    sx={{ 
                      fontWeight: '900', 
                      bgcolor: ultimoAnalisis.Recomendacion === 'ALCISTA' ? 'market.positive.bg' : 'market.negative.bg',
                      color: ultimoAnalisis.Recomendacion === 'ALCISTA' ? 'market.positive.text' : 'market.negative.text',
                      border: '1px solid',
                      borderColor: ultimoAnalisis.Recomendacion === 'ALCISTA' ? 'market.positive.border' : 'market.negative.border'
                    }} 
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <List size="small" disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon><InfoOutlinedIcon color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary={`RSI: ${ultimoAnalisis.RSI ? parseFloat(ultimoAnalisis.RSI).toFixed(2) : 'N/D'}`} 
                      secondary={!ultimoAnalisis.RSI ? "Sin datos." : ultimoAnalisis.RSI < 30 ? "Sobreventa (posible rebote)." : ultimoAnalisis.RSI > 70 ? "Sobrecompra (posible corrección)." : "Zona neutral."} 
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemIcon><TimelineIcon color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary={`MACD: ${ultimoAnalisis.MACD ? parseFloat(ultimoAnalisis.MACD).toFixed(2) : 'N/D'}`} 
                      secondary={ultimoAnalisis.MACD < 0 ? "Tendencia bajista." : "Tendencia alcista."} 
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemIcon><SpeedIcon color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary={`Volatilidad (ATR): ${ultimoAnalisis.ATR ? parseFloat(ultimoAnalisis.ATR).toFixed(2) : 'N/D'} USD`} 
                      secondary="Promedio de movimiento diario." 
                    />
                  </ListItem>
                </List>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 150 }}>
                <Typography color="text.secondary">No hay análisis recientes para esta empresa.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComparadorIA;