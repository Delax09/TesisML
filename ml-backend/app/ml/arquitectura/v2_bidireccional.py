import torch
import torch.nn as nn

class ModeloBidireccional_v2(nn.Module):
    def __init__(self, num_features):
        super(ModeloBidireccional_v2, self).__init__()
        
        #Motor Temporal Bidireccional
        self.lstm = nn.LSTM(input_size=num_features, hidden_size=32, batch_first=True, bidirectional=True)
        
        #ESTABILIZADOR 1: Es 64 porque (32 neuronas de ida + 32 de vuelta = 64)
        self.bn1 = nn.BatchNorm1d(64)
        self.dropout = nn.Dropout(0.4)
        
        #Capa de Razonamiento
        self.fc1 = nn.Linear(64, 16) 
        
        #ESTABILIZADOR 2
        self.bn2 = nn.BatchNorm1d(16)
        self.relu = nn.ReLU()
        
        #Cabezas Multi-Tarea
        self.cabeza_regresion = nn.Linear(16, 1)
        self.cabeza_clasificacion = nn.Linear(16, 1)

        self._init_weights()

    def _init_weights(self):
        """Inicialización robusta para convergencia más estable"""
        for name, param in self.named_parameters():
            if 'weight' in name:
                if param.dim() >= 2:  # Para tensores 2D+ (Linear, LSTM)
                    if 'lstm' in name:
                        nn.init.orthogonal_(param)
                    else:
                        nn.init.xavier_uniform_(param)
                elif 'bn' in name: 
                    # CRÍTICO: El multiplicador Gamma del BatchNorm DEBE iniciar en 1
                    nn.init.ones_(param)
                else:
                    # Otros pesos 1D genéricos
                    nn.init.normal_(param, 0, 0.01)
            elif 'bias' in name:
                # Los sesgos inician en 0
                nn.init.constant_(param, 0.0)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        
        x = lstm_out[:, -1, :]
        
        # Aplicamos la estabilización
        x = self.bn1(x)
        x = self.dropout(x)
        
        x = self.fc1(x)
        x = self.bn2(x)
        x = self.relu(x)
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x)
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v2(dias_pasados, num_features):
    return ModeloBidireccional_v2(num_features)