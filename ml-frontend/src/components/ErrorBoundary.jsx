import React from 'react';
import { Box, Typography } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Aquí podrías enviar el error a un servicio como Sentry o Datadog
    console.error("Componente colapsado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px', bgcolor: '#fff1f2', borderRadius: 3, border: '1px dashed #fda4af' }}>
            <ReportProblemIcon sx={{ color: '#e11d48', fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" color="#e11d48">
                {this.props.mensajeFallo || "Algo salió mal al cargar este módulo."}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Nuestros ingenieros ya fueron notificados.
            </Typography>
        </Box>
      );
    }
    return this.props.children; 
  }
}

export default ErrorBoundary;