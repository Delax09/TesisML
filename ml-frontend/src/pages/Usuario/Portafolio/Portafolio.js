// src/pages/Usuario/Portafolio/Portafolio.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import { useAuth } from 'context';
import { empresaService, portafolioService } from 'services';
import toast from 'react-hot-toast';
import { ListaPortafolio } from 'components'; // Tu nuevo componente

export default function Portafolio() {
  const { usuario } = useAuth();
  
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [misEmpresas, setMisEmpresas] = useState([]);
  const [sectoresDisponibles, setSectoresDisponibles] = useState([]);
  
  const [cargando, setCargando] = useState(true);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const dataEmpresas = await empresaService.obtenerEmpresasConSectores();
      const todosLosPortafolios = await portafolioService.obtenerTodos();
      
      const misConexiones = todosLosPortafolios.filter(p => p.IdUsuario === usuario.id && p.Activo !== false);

      const enPortafolio = [];
      const fueraDePortafolio = [];
      const sectoresSet = new Set(); 

      dataEmpresas.empresas.forEach((empresa) => {
        const conexion = misConexiones.find((p) => p.IdEmpresa === empresa.IdEmpresa);
        if (conexion) {
          enPortafolio.push({ ...empresa, IdPortafolio: conexion.IdPortafolio });
        } else {
          fueraDePortafolio.push(empresa);
          sectoresSet.add(empresa.NombreSector); 
        }
      });

      setMisEmpresas(enPortafolio);
      setEmpresasDisponibles(fueraDePortafolio);
      setSectoresDisponibles(Array.from(sectoresSet).sort()); 
    } catch (error) {
      console.error("Error al cargar datos", error);
      toast.error("Error al cargar tu portafolio");
    } finally {
      setCargando(false);
    }
  }, [usuario]); 

  useEffect(() => {
    if (usuario?.id) cargarDatos();
  }, [usuario, cargarDatos]); 

  // --- FUNCIONES CRUD ---
  const manejarAgregarUna = async (idEmpresa) => {
    try {
      await portafolioService.crear(usuario.id, idEmpresa);
      toast.success("Empresa agregada");
      cargarDatos(); 
    } catch (error) {
      toast.error("Error al agregar");
    }
  };

  const manejarEliminarUna = async (idPortafolio) => {
    try {
      await portafolioService.eliminar(idPortafolio);
      toast.success("Empresa removida");
      cargarDatos();
    } catch (error) {
      toast.error("Error al remover");
    }
  };

  const manejarAgregarMultiples = async (idsAgregar) => {
    setProcesandoMasivo(true);
    const idNoti = toast.loading(`Agregando ${idsAgregar.length} empresas...`);
    try {
      await Promise.all(idsAgregar.map(id => portafolioService.crear(usuario.id, id)));
      toast.success(`Agregadas correctamente`, { id: idNoti });
      cargarDatos();
    } catch (error) {
      toast.error("Error al agregar masivamente", { id: idNoti });
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const manejarEliminarMultiples = async (idsEliminar) => {
    setProcesandoMasivo(true);
    const idNoti = toast.loading(`Removiendo ${idsEliminar.length} empresas...`);
    try {
      await Promise.all(idsEliminar.map(id => portafolioService.eliminar(id)));
      toast.success(`Removidas correctamente`, { id: idNoti });
      cargarDatos();
    } catch (error) {
      toast.error("Error al remover masivamente", { id: idNoti });
    } finally {
      setProcesandoMasivo(false);
    }
  };

  if (cargando) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 4, pt: {xs: 2, lg: 0} }}>
        Gestionar Mi Portafolio
      </Typography>

      <Grid container spacing={{ xs: 2, md: 3, lg: 4 }} alignItems="stretch">
        
        {/* PANEL: MIS EMPRESAS */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 3, height: '100%' }}>
            <ListaPortafolio 
              titulo="Empresas en Seguimiento"
              empresas={misEmpresas}
              sectores={Array.from(new Set(misEmpresas.map(e => e.NombreSector))).sort()}
              procesando={procesandoMasivo}
              esRemover={true}
              idProp="IdPortafolio" // Llave para eliminar
              onAccionIndividual={manejarEliminarUna}
              onAccionMultiple={manejarEliminarMultiples}
              mensajeVacio="No tienes empresas en tu portafolio aún."
            />
          </Paper>
        </Grid>

        {/* PANEL: EMPRESAS DISPONIBLES */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 3, height: '100%' }}>
            <ListaPortafolio 
              titulo="Mercado Disponible"
              empresas={empresasDisponibles}
              sectores={sectoresDisponibles}
              procesando={procesandoMasivo}
              esRemover={false}
              idProp="IdEmpresa" // Llave para agregar
              onAccionIndividual={manejarAgregarUna}
              onAccionMultiple={manejarAgregarMultiples}
              mensajeVacio="Ya sigues a todas las empresas disponibles."
            />
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}