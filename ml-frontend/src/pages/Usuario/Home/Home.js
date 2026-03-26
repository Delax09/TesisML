// src/pages/Usuario/Home/Home.js
import React, { useState } from 'react';
import { useAuth } from 'context';
import { EmpresaTable, PrecioChart, ResultadoPanel } from 'components';
import { api } from 'services'; // Importamos api para la petición PUT

// Importaciones de Material-UI
import { Box, Typography, Paper, Grid, Alert, Button } from '@mui/material';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import EditIcon from '@mui/icons-material/Edit';
import toast from 'react-hot-toast';

export default function Home() {
  const { usuario, actualizarDatosContexto } = useAuth();
    // Estado para controlar a qué empresa se le hizo clic en la tabla
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({ id: null, nombre: "" });

  const manejarSeleccionEmpresa = (id, nombre) => {
    setEmpresaSeleccionada({ id, nombre });
  };

  // --- Lógica para editar el nombre del usuario ---
  const manejarEditarPerfil = async () => {
    const nuevoNombre = window.prompt("Introduce tu nuevo nombre:", usuario.nombre);
    
    if (nuevoNombre && nuevoNombre !== usuario.nombre) {
      try {
        // Asumiendo que tu endpoint de FastAPI es PUT /usuarios/{id}
        // y espera un objeto con el campo "Nombre"
        await api.put(`/usuarios/${usuario.id}`, { Nombre: nuevoNombre });
        
        // Actualizamos el contexto global para que el saludo cambie
        actualizarDatosContexto({ nombre: nuevoNombre });
        
        toast.success("Perfil actualizado con éxito");
      } catch (error) {
        console.error(error);
        toast.error("No se pudo actualizar el perfil");
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '1400px', margin: '0 auto', pb: 4 }}>
      
      {/* HEADER: Saludo Estilo Dashboard */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ backgroundColor: 'primary.light', p: 1.5, borderRadius: 2, display: 'flex', color: 'white', boxShadow: 2 }}>
             <QueryStatsIcon fontSize="large" />
          </Box>
          <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                Mi Portafolio, {usuario?.nombre?.split(' ')[0] || 'Inversor'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Analiza el historial de precios y descubre tendencias del mercado con Inteligencia Artificial.
              </Typography>
          </Box>
        </Box>

        {/* BOTÓN EDITAR PERFIL */}
        <Button 
          variant="outlined" 
          startIcon={<EditIcon />}
          onClick={manejarEditarPerfil}
          sx={{ borderRadius: 2, fontWeight: 'bold' }}
        >
          Editar Perfil
        </Button>
      </Paper>

   {/* AVISO DE UX: Solo se muestra si no han seleccionado una empresa */}
      {!empresaSeleccionada.id && (
         <Alert severity="info" sx={{ borderRadius: 2, fontSize: '1.05rem', alignItems: 'center' }}>
           Haz clic en cualquier empresa de la tabla inferior para visualizar su gráfico de precios y el análisis predictivo.
         </Alert>
      )}

 {/* SECCIÓN 1: Gráficos de Análisis y Resultados */}
      {/* Usamos Grid para manejar la responsividad automáticamente */}
      <Grid container spacing={3}>

        {/* Gráfico de Precios 
            xs={12}: Teléfonos (100% ancho)
            md={7} o md={8}: Laptops (divide el espacio)
            lg={8}: Monitores grandes
            xl={9}: Pantallas ultrawide
        */}
        <Grid item xs={12} md={8} lg={8} xl={9}>
          <Box sx={{ height: '100%', minHeight: '400px' }}>
            <PrecioChart 
              empresaId={empresaSeleccionada.id} 
              nombreEmpresa={empresaSeleccionada.nombre} 
            />
          </Box>
        </Grid>
        
        {/* Panel de Resultados IA */}
        <Grid item xs={12} md={4} lg={4} xl={3}>
          <Box sx={{ height: '100%' }}>
            <ResultadoPanel 
              empresaId={empresaSeleccionada.id} 
            />
          </Box>
        </Grid>
      </Grid>

      {/* SECCIÓN 2: Tabla de Datos */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2, pl: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            &nbsp;Mercado Disponible
        </Typography>
        
        <EmpresaTable 
            onSelect={manejarSeleccionEmpresa} 
            esAdmin={false} // Pasamos explícitamente false por seguridad
        />
      </Box>

    </Box>
  );
}