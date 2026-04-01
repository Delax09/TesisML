// src/features/noticias/components/NoticiaCard.js
import React from 'react';
import { 
  Card, CardMedia, CardContent, CardActions, 
  Typography, Box, Chip, Button 
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const NoticiaCard = ({ noticia }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.02)' }
      }}
    >
      <CardMedia
        component="img"
        height="160"
        image={noticia.url_imagen || 'https://placehold.co/400x200/png?text=Sin+Imagen'}
        alt={noticia.titular}
        sx={{ objectFit: 'cover' }}
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip 
            label={noticia.ticker_relacionado} 
            color="primary" 
            size="small" 
            sx={{ fontWeight: 'bold' }}
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(noticia.fecha_publicacion).toLocaleDateString()}
          </Typography>
        </Box>

        <Typography gutterBottom variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: 1.2 }}>
          {noticia.titular}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box',
          overflow: 'hidden',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
        }}>
          {noticia.resumen || "Haz clic en 'Leer completa' para ver los detalles del artículo."}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Typography variant="caption" fontWeight="bold" color="text.disabled">
          Fuente: {noticia.fuente}
        </Typography>
        <Button 
          size="small" 
          endIcon={<OpenInNewIcon />} 
          href={noticia.url_noticia} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Leer
        </Button>
      </CardActions>
    </Card>
  );
};

export default NoticiaCard;