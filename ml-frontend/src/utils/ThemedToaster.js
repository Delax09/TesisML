// src/utils/ThemedToaster.js
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';

const ThemedToaster = () => {
  const theme = useTheme();

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        style: {
          // Usamos los tokens definidos en theme.js y colors.js
          borderRadius: '12px',
          background: theme.palette.background.paper, 
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          fontSize: '0.9rem',
          padding: '12px 16px',
          boxShadow: theme.shadows[4],
        },
        success: {
          iconTheme: {
            primary: theme.palette.primary.main,
            secondary: theme.palette.background.paper,
          },
        },
        error: {
          // Si no tienes 'error' en el palette, MUI suele tener uno por defecto o puedes usar un color fijo
          iconTheme: {
            primary: theme.palette.error?.main || '#ef4444',
            secondary: theme.palette.background.paper,
          },
        },
      }}
    />
  );
};

export default ThemedToaster;