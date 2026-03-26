// src/pages/Usuario/Portafolio/Portafolio.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, List, ListItem, ListItemText, IconButton, Chip, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from 'context';
import { empresaService, portafolioService } from 'services';
import toast from 'react-hot-toast';

export default function Portafolio() {
  const { usuario } = useAuth();
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [misEmpresas, setMisEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);

    const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      // 1. Obtenemos todas las empresas (con su sector)
      const dataEmpresas = await empresaService.obtenerEmpresasConSectores();
      const todasLasEmpresas = dataEmpresas.empresas;

      // 2. Obtenemos todos los portafolios y filtramos los del usuario actual
      const todosLosPortafolios = await portafolioService.obtenerTodos();
      const misConexiones = todosLosPortafolios.filter(
        (p) => p.IdUsuario === usuario.id && p.Activo !== false
      );

      // 3. Cruzamos los datos para separar las empresas
      const empresasEnPortafolio = [];
      const empresasFueraDePortafolio = [];

      todasLasEmpresas.forEach((empresa) => {
        const conexion = misConexiones.find((p) => p.IdEmpresa === empresa.IdEmpresa);
        if (conexion) {
          empresasEnPortafolio.push({
            ...empresa,
            IdPortafolio: conexion.IdPortafolio // Guardamos el ID de la conexión para poder eliminarla
          });
        } else {
          empresasFueraDePortafolio.push(empresa);
        }
      });

      setMisEmpresas(empresasEnPortafolio);
      setEmpresasDisponibles(empresasFueraDePortafolio);
    } catch (error) {
      console.error("Error al cargar datos del portafolio", error);
      toast.error("Error al cargar tu portafolio");
    } finally {
      setCargando(false);
    }
    }, [usuario]); 

    useEffect(() => {
        if (usuario?.id) {
        cargarDatos();
        }
    }, [usuario, cargarDatos]); 

  const manejarAgregar = async (idEmpresa) => {
    try {
      await portafolioService.crear(usuario.id, idEmpresa);
      toast.success("Empresa agregada a tu portafolio");
      cargarDatos(); // Recargamos para actualizar las listas
    } catch (error) {
      toast.error("No se pudo agregar la empresa");
    }
  };

  const manejarEliminar = async (idPortafolio) => {
    try {
      await portafolioService.eliminar(idPortafolio);
      toast.success("Empresa removida de tu portafolio");
      cargarDatos();
    } catch (error) {
      toast.error("No se pudo remover la empresa");
    }
  };

  if (cargando) return <Typography>Cargando tu portafolio...</Typography>;

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto', pb: 4 }}>
      <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 4 }}>
        Gestionar Mi Portafolio
      </Typography>

      <Grid container spacing={4}>
        {/* LISTA 1: MIS EMPRESAS */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'primary.main' }}>
              Empresas en Seguimiento
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {misEmpresas.length === 0 ? (
              <Typography color="text.secondary">No tienes empresas en tu portafolio aún.</Typography>
            ) : (
              <List>
                {misEmpresas.map((emp) => (
                  <ListItem 
                    key={emp.IdPortafolio}
                    sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 2 }}
                    secondaryAction={
                      <IconButton edge="end" color="error" onClick={() => manejarEliminar(emp.IdPortafolio)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={`${emp.Ticket} - ${emp.NombreEmpresa}`} 
                      secondary={<Chip label={emp.NombreSector} size="small" sx={{ mt: 0.5 }} />}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* LISTA 2: EMPRESAS DISPONIBLES */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.secondary' }}>
              Mercado Disponible
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {empresasDisponibles.length === 0 ? (
              <Typography color="text.secondary">Ya sigues a todas las empresas disponibles.</Typography>
            ) : (
              <List>
                {empresasDisponibles.map((emp) => (
                  <ListItem 
                    key={emp.IdEmpresa}
                    sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 2 }}
                    secondaryAction={
                      <IconButton edge="end" color="primary" onClick={() => manejarAgregar(emp.IdEmpresa)}>
                        <AddCircleOutlineIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={`${emp.Ticket} - ${emp.NombreEmpresa}`} 
                      secondary={emp.NombreSector}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}