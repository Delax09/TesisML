import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      // 1. Archivos sueltos en la raíz de src/ que importas directamente
      'config': '/src/config.js',
      'theme': '/src/theme.js',
      
      // 2. Carpetas principales
      'services': '/src/services',
      'features': '/src/features',
      'context': '/src/context',
      'utils': '/src/utils',
      'components': '/src/components',
      'constants': '/src/constants',
      'layouts': '/src/layouts',
      'navigation': '/src/navigation',
      'pages': '/src/pages',
      'assets': '/src/assets',
      
      // Atajo moderno opcional
      '@': '/src'
    }
  }
});