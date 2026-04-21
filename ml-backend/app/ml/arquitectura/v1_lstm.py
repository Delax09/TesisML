import torch
import torch.nn as nn

class ModeloLSTM_v1(nn.Module):
    def __init__(self, num_features: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()
        
        self.lstm = nn.LSTM(
            input_size=num_features, 
            hidden_size=hidden_size, 
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3 if num_layers > 1 else 0
        )
        
        #Capa de Atención Temporal
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )
        
        self.bn1 = nn.BatchNorm1d(hidden_size)
        self.dropout1 = nn.Dropout(0.4)
        
        self.fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.bn2 = nn.BatchNorm1d(hidden_size // 2)
        self.relu = nn.ReLU()
        self.dropout2 = nn.Dropout(0.3)
        
        self.fc2 = nn.Linear(hidden_size // 2, hidden_size // 4)
        self.bn3 = nn.BatchNorm1d(hidden_size // 4)
        
        self.cabeza_regresion = nn.Linear(hidden_size // 4, 1)     
        self.cabeza_clasificacion = nn.Linear(hidden_size // 4, 1)

        self._init_weights()

    def _init_weights(self):
        for name, param in self.named_parameters():
            if 'weight' in name:
                if param.dim() >= 2:  
                    if 'lstm' in name: nn.init.orthogonal_(param)
                    else: nn.init.xavier_uniform_(param)
                elif 'bn' in name: nn.init.ones_(param)
                else: nn.init.normal_(param, 0, 0.01)
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x) # lstm_out: (batch, seq_len, hidden)
        
        #Cálculo de Atención
        attn_weights = torch.softmax(self.attention(lstm_out), dim=1) # Qué días importan
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)    # Resumen enfocado
        
        x = self.bn1(context_vector)
        x = self.dropout1(x)
        
        x = self.fc1(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.dropout2(x)
        
        x = self.fc2(x)
        x = self.bn3(x)
        x = self.relu(x)
        
        p_reg = self.cabeza_regresion(x)
        l_clf = self.cabeza_clasificacion(x)
        return p_reg, l_clf

def obtener_modelo_v1(dias_pasados, num_features, hidden_size=64, num_layers=2):
    return ModeloLSTM_v1(num_features, hidden_size, num_layers)