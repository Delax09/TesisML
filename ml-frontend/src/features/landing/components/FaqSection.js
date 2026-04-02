import React, { useState } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqs = [
  {
    question: "¿Qué tipo de análisis realiza la plataforma?",
    answer: "Utilizamos modelos de Machine Learning avanzados (como redes neuronales LSTM) para analizar el histórico de precios y generar proyecciones que te ayuden en la toma de decisiones."
  },
  {
    question: "¿Necesito conocimientos avanzados en finanzas o programación?",
    answer: "No. Hemos diseñado la interfaz para que sea intuitiva, mostrando las métricas, backtesting y predicciones de forma clara para cualquier nivel de usuario."
  },
  {
    question: "¿La información se actualiza en tiempo real?",
    answer: "Los datos se actualizan de forma periódica según el cierre de los mercados, garantizando que el modelo cuente con la información validada más reciente."
  }
];

export default function FaqSection() {
  // Estado para controlar qué acordeón está abierto (null = todos cerrados)
  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    // Si el panel ya estaba abierto, lo cerramos (false), si no, guardamos su ID
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box id="faq" sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h3" component="h2" align="center" sx={{ mb: 4, fontWeight: 'bold', color: 'text.primary' }}>
        Preguntas Frecuentes
      </Typography>
      
      {faqs.map((faq, index) => {
        const panelId = `panel${index}`;
        return (
          <Accordion 
            key={index} 
            elevation={0} 
            // Aquí ocurre la magia: comparamos el estado con el ID actual
            expanded={expanded === panelId} 
            onChange={handleChange(panelId)}
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              mb: 1, 
              '&:before': { display: 'none' } 
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon color="primary" />}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}