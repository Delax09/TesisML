import torch
import torch.nn as nn

class ModeloBidireccional_v2(nn.Module):
    def __init__(self, num_features: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()
        
        self.hidden_size = hidden_size
        
        # ============ RAMA PRINCIPAL (BiLSTM) ============
        self.lstm = nn.LSTM(
            input_size=num_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3 if num_layers > 1 else 0,
            bidirectional=True
        )
        
        # Al ser bidireccional, la salida es el doble del tamaño oculto
        lstm_out_size = hidden_size * 2
        
        self.layer_norm = nn.LayerNorm(lstm_out_size)
        
        # ============ MECANISMO DE ATENCIÓN ============
        self.attention = nn.Sequential(
            nn.Linear(lstm_out_size, lstm_out_size // 2),
            nn.Tanh(),
            nn.Linear(lstm_out_size // 2, 1)
        )
        
        # ============ CAPAS DENSAS ============
        self.fc1 = nn.Linear(lstm_out_size, hidden_size)
        self.ln1 = nn.LayerNorm(hidden_size)
        self.dropout1 = nn.Dropout(0.3)
        
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.ln2 = nn.LayerNorm(hidden_size // 2)
        self.dropout2 = nn.Dropout(0.2)
        
        # ============ CABEZAS DE SALIDA ============
        self.cabeza_regresion = nn.Linear(hidden_size // 2, 1)
        self.cabeza_clasificacion = nn.Linear(hidden_size // 2, 1)
        
        self._init_weights()

    def _init_weights(self):
        for name, param in self.named_parameters():
            if 'weight_ih' in name:
                nn.init.xavier_uniform_(param)
            elif 'weight_hh' in name:
                nn.init.orthogonal_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
    
    def forward(self, x):
        # Forward de BiLSTM
        lstm_out, _ = self.lstm(x) # (batch_size, seq_len, hidden_size * 2)
        lstm_out = self.layer_norm(lstm_out)
        
        # Atención
        attn_scores = self.attention(lstm_out)
        attn_weights = torch.softmax(attn_scores, dim=1)
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)
        
        # Densas
        x = self.fc1(context_vector)
        x = self.ln1(x)
        x = torch.relu(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        x = self.ln2(x)
        x = torch.relu(x)
        x = self.dropout2(x)
        
        p_reg = self.cabeza_regresion(x)
        l_clf = self.cabeza_clasificacion(x)
        
        return p_reg, l_clf

def obtener_modelo_v2(dias_pasados, num_features):
    return ModeloBidireccional_v2(num_features=num_features)