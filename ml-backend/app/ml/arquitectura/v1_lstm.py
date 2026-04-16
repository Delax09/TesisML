import torch
import torch.nn as nn

class ModeloLSTM_v1(nn.Module):
    def __init__(self, num_features: int, hidden_size: int = 64, num_layers: int = 2):
        """
        LSTM mejorado para predicción de precios.
        
        Args:
            num_features: Número de indicadores técnicos
            hidden_size: Dimensión del estado oculto (recomendado: 64-128)
            num_layers: Número de capas LSTM apiladas
        """
        super().__init__()
        
        # Motor Temporal Multi-capa
        self.lstm = nn.LSTM(
            input_size=num_features, 
            hidden_size=hidden_size, 
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3 if num_layers > 1 else 0
        )
        
        # Batch Norm después de LSTM
        self.bn1 = nn.BatchNorm1d(hidden_size)
        self.dropout1 = nn.Dropout(0.4)
        
        # Capas densas progresivas
        self.fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.bn2 = nn.BatchNorm1d(hidden_size // 2)
        self.relu = nn.ReLU()
        self.dropout2 = nn.Dropout(0.3)
        
        self.fc2 = nn.Linear(hidden_size // 2, 32)
        self.bn3 = nn.BatchNorm1d(32)
        
        # Cabezas Multi-Tarea
        self.head_regression = nn.Linear(32, 1)
        self.head_classification = nn.Linear(32, 1)
        
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
        
        # Tomar solo la última posición temporal
        x = lstm_out[:, -1, :]
        
        x = self.bn1(x)
        x = self.dropout1(x)
        
        x = self.fc1(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.dropout2(x)
        
        x = self.fc2(x)
        x = self.bn3(x)
        x = self.relu(x)
        
        reg_pred = self.head_regression(x)
        clf_pred = self.head_classification(x)
        
        return reg_pred, clf_pred

def obtener_modelo_v1(dias_pasados, num_features, hidden_size=64, num_layers=2):
    return ModeloLSTM_v1(num_features, hidden_size, num_layers)