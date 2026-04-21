// src/pages/Usuario/ProyeccionesIA/ProyeccionesIA.js
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, FormControl, InputLabel, Select, 
    MenuItem, CircularProgress, ToggleButton, ToggleButtonGroup 
} from '@mui/material'; 
import AreaChartIcon from '@mui/icons-material/AreaChart';

import iaService from '../../../services/iaService'; 
import { useAuth } from 'context'; 
import { useProyeccionesIA, TarjetaProyeccion, GraficoComparativo } from 'features'; 
import { PageHeader } from 'components';

const VistaProyecciones = () => {
    const { usuario } = useAuth(); 
    const idUsuarioFiltro = usuario?.id;

    // Estados originales
    const [modelosActivos, setModelosActivos] = useState([]);
    const [modeloSeleccionado, setModeloSeleccionado] = useState('');
    const [cargandoModelos, setCargandoModelos] = useState(true); 
    const [sectorSeleccionado, setSectorSeleccionado] = useState('');
    const [empresasComparar, setEmpresasComparar] = useState([]);

    // --- NUEVOS ESTADOS PARA MODO COMPARACIÓN DE MODELOS ---
    const [modoComparacion, setModoComparacion] = useState('empresas'); // 'empresas' | 'modelos'
    const [empresaParaModelos, setEmpresaParaModelos] = useState('');
    const [datosModelosMultiples, setDatosModelosMultiples] = useState([]);
    const [cargandoMultiples, setCargandoMultiples] = useState(false);

    // Cargar modelos de IA disponibles (Solo 1 vez al montar el componente)
    useEffect(() => {
        let montado = true;
        const fetchModelos = async () => {
            if (!usuario?.id) return; 

            try {
                const data = await iaService.obtenerModelosPorUsuario(usuario.id);
                if (montado) {
                    setModelosActivos(data);
                    if (data.length > 0) {
                        setModeloSeleccionado(data[0].IdModelo);
                    } else {
                        setModeloSeleccionado('');
                    }
                }
            } catch (error) {
                console.error("Error cargando modelos", error);
            } finally {
                if (montado) setCargandoModelos(false); 
            }
        };
        fetchModelos();
        return () => { montado = false; };
    }, [usuario?.id]);

    // Extraemos las proyecciones (Usado en el modo "Empresas")
    const { proyecciones, sectores, cargando: cargandoProyecciones, error } = useProyeccionesIA(idUsuarioFiltro, modeloSeleccionado);
  
    // Auto-seleccionar la primera empresa al cambiar a modo 'modelos'
    useEffect(() => {
        if (modoComparacion === 'modelos' && !empresaParaModelos && proyecciones.length > 0) {
            setEmpresaParaModelos(proyecciones[0].idEmpresa);
        }
    }, [modoComparacion, proyecciones, empresaParaModelos]);

    // Fetch dinámico para múltiples modelos de una sola empresa
    useEffect(() => {
        let montado = true;
        if (modoComparacion === 'modelos' && empresaParaModelos && modelosActivos.length > 0) {
            const cargarModelos = async () => {
                setCargandoMultiples(true);
                try {
                    // Consultamos la IA de forma masiva para cada modelo disponible
                    const promesas = modelosActivos.map(async (modelo) => {
                        const res = await iaService.obtenerPrediccionesMasivas([empresaParaModelos], modelo.IdModelo);
                        const datosIA = res[empresaParaModelos] || { historial: [], prediccion: [] };
                        return {
                            simbolo: modelo.Nombre, // Hackeamos el símbolo para que el gráfico muestre el Nombre del Modelo
                            historial: datosIA.historial,
                            prediccion: datosIA.prediccion
                        };
                    });
                    const resultados = await Promise.all(promesas);
                    if (montado) setDatosModelosMultiples(resultados);
                } catch (error) {
                    console.error("Error obteniendo múltiples modelos", error);
                } finally {
                    if (montado) setCargandoMultiples(false);
                }
            };
            cargarModelos();
        }
        return () => { montado = false; };
    }, [modoComparacion, empresaParaModelos, modelosActivos]);

    if (cargandoModelos || cargandoProyecciones) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={6} gap={2} sx={{ width: '100%', minHeight: '60vh' }}>
                <CircularProgress size={40} color="primary" />
                <Typography color="text.secondary" fontWeight="500">
                    Sincronizando IA y Proyecciones...
                </Typography>
            </Box>
        );
    }  

    if (error) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>{error}</div>;

    const proyeccionesFiltradas = proyecciones.filter(p => 
        sectorSeleccionado === '' || p.sector === sectorSeleccionado
    );

    const handleToggleComparar = (simbolo) => {
        setEmpresasComparar(prev => 
            prev.includes(simbolo) ? prev.filter(s => s !== simbolo) : [...prev, simbolo]
        );
    };

    const datosAComparar = proyecciones.filter(p => empresasComparar.includes(p.simbolo));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
            <PageHeader 
                titulo="Análisis Predictivo de tu Portafolio"
                subtitulo="Explora el directorio global, analiza el historial de precios y revisa las predicciones de la Inteligencia Artificial."
                icono={AreaChartIcon} 
            />

            {/* TABS PARA CAMBIAR EL MODO DE COMPARACIÓN */}
            {modelosActivos.length > 1 && proyecciones.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <ToggleButtonGroup
                        value={modoComparacion}
                        exclusive
                        onChange={(e, newMode) => {
                            if (newMode) setModoComparacion(newMode);
                        }}
                        color="primary"
                        size="small"
                        sx={{ bgcolor: 'background.paper' }}
                    >
                        <ToggleButton value="empresas" sx={{ px: 3, fontWeight: 'bold' }}>Comparar Empresas</ToggleButton>
                        <ToggleButton value="modelos" sx={{ px: 3, fontWeight: 'bold' }}>Comparar Modelos IA</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

            {/* CONTROLES CONDICIONALES SEGÚN EL MODO */}
            {modoComparacion === 'empresas' ? (
                <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', sm: 'flex-end' }, flexWrap: 'wrap', width: '100%' }}>
                    {modelosActivos.length > 0 && (
                        <FormControl sx={{ width: { xs: '100%', sm: 250 } }} size="small">
                            <InputLabel id="filtro-modelo-label">Modelo Predictivo</InputLabel>
                            <Select
                                labelId="filtro-modelo-label"
                                value={modeloSeleccionado}
                                label="Modelo Predictivo"
                                onChange={(e) => setModeloSeleccionado(e.target.value)}
                            >
                                {modelosActivos.map(modelo => (
                                    <MenuItem key={modelo.IdModelo} value={modelo.IdModelo}>
                                        {modelo.Nombre}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl sx={{ width: { xs: '100%', sm: 250 } }} size="small">
                        <InputLabel id="filtro-sector-label">Filtrar por Sector</InputLabel>
                        <Select
                            labelId="filtro-sector-label"
                            value={sectorSeleccionado}
                            label="Filtrar por Sector"
                            onChange={(e) => setSectorSeleccionado(e.target.value)}
                        >
                            <MenuItem value=""><em>Todos los sectores</em></MenuItem>
                            {sectores.map(sector => (
                                <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%' }}>
                    <FormControl sx={{ width: { xs: '100%', sm: 350 } }} size="small">
                        <InputLabel id="filtro-empresa-modelos-label">Seleccionar Empresa a Analizar</InputLabel>
                        <Select
                            labelId="filtro-empresa-modelos-label"
                            value={empresaParaModelos}
                            label="Seleccionar Empresa a Analizar"
                            onChange={(e) => setEmpresaParaModelos(e.target.value)}
                        >
                            {proyecciones.map(p => (
                                <MenuItem key={p.idEmpresa} value={p.idEmpresa}>
                                    {p.simbolo} - {p.empresa}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* VISTA MODO EMPRESAS */}
            {modoComparacion === 'empresas' ? (
                <>
                    {empresasComparar.length >= 2 && (
                        <Paper sx={{ p: { xs: 2, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                Comparativa de Proyecciones ({empresasComparar.join(' vs ')})
                            </Typography>
                            <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                                <GraficoComparativo datos={datosAComparar} />
                            </Box>
                        </Paper>
                    )}
                
                    {proyecciones.length === 0 && (
                        <Box sx={{ textAlign: 'center', p: { xs: 3, sm: 5 }, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                No se encontraron empresas activas en tu portafolio.
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 3 }}>
                        {proyeccionesFiltradas.map((empresaData, index) => (
                            <TarjetaProyeccion 
                                key={index} 
                                datos={empresaData} 
                                seleccionado={empresasComparar.includes(empresaData.simbolo)}
                                onToggle={() => handleToggleComparar(empresaData.simbolo)}
                            />
                        ))}
                    </Box>
                </>
            ) : (
                /* VISTA MODO MODELOS (Multimodelo para 1 Empresa) */
                <>
                    {empresaParaModelos && (
                        <Paper sx={{ p: { xs: 2, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
                                Análisis Multimodelo: {proyecciones.find(p => p.idEmpresa === empresaParaModelos)?.simbolo}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Compara el rendimiento de tus modelos habilitados (LSTM, CNN, etc.) sobre este activo para identificar convergencias en la tendencia.
                            </Typography>

                            {cargandoMultiples ? (
                                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 400 }}><CircularProgress /></Box>
                            ) : (
                                <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                                    <GraficoComparativo 
                                        datos={datosModelosMultiples} 
                                        compararModelos={true} // <-- AHORA PASAMOS EL FLAG
                                    />
                                </Box>
                            )}
                        </Paper>
                    )}
                </>
            )}

            {!cargandoModelos && modelosActivos.length === 0 && (
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2, border: '1px solid #ef4444' }}>
                    <Typography color="error" fontWeight="bold">
                        Actualmente no tienes modelos de IA habilitados en tu cuenta.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                        Contacta a un administrador para solicitar acceso a las proyecciones.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default VistaProyecciones;