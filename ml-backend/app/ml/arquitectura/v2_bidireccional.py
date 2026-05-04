import torch
import torch.nn as nn

class ModeloBidireccional_v2(nn.Module):
    def __init__(self, num_features: int, hidden_size: int = 96, num_layers: int = 3):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_features = num_features
        
        # ============ RAMA PRINCIPAL (LSTM Unidireccional) ============
        # Usamos LSTM unidireccional porque en predicción real no tenemos datos futuros
        self.lstm_layers = nn.ModuleList()
        self.layer_norms = nn.ModuleList()
        self.dropouts = nn.ModuleList()
        
        # Primera capa LSTM
        self.lstm_layers.append(
            nn.LSTM(
                input_size=num_features,
                hidden_size=hidden_size,
                num_layers=1,
                batch_first=True,
                dropout=0
            )
        )
        self.layer_norms.append(nn.LayerNorm(hidden_size))
        self.dropouts.append(nn.Dropout(0.2))
        
        # Capas LSTM adicionales con residual connections
        for i in range(1, num_layers):
            self.lstm_layers.append(
                nn.LSTM(
                    input_size=hidden_size,
                    hidden_size=hidden_size,
                    num_layers=1,
                    batch_first=True,
                    dropout=0
                )
            )
            self.layer_norms.append(nn.LayerNorm(hidden_size))
            self.dropouts.append(nn.Dropout(0.2))
        
        # ============ MECANISMO DE ATENCIÓN ============
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, 1)
        )
        
        # ============ CAPAS DENSAS CON RESIDUAL ============
        self.fc1 = nn.Linear(hidden_size, hidden_size)
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
        """Inicialización mejorada para capas LSTM"""
        for name, param in self.named_parameters():
            if 'weight_ih' in name:  # Input-Hidden en LSTM
                nn.init.xavier_uniform_(param)
            elif 'weight_hh' in name:  # Hidden-Hidden en LSTM (recurrente)
                nn.init.orthogonal_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, num_features)
        
        Returns:
            (precio_predicho, direccion_predicha)
        """
        # Procesar a través de capas LSTM con residual connections
        lstm_out = x  # Inicializar con input
        
        for i, (lstm_layer, ln, dropout) in enumerate(
            zip(self.lstm_layers, self.layer_norms, self.dropouts)
        ):
            # Forward LSTM
            lstm_output, _ = lstm_layer(lstm_out)
            
            # Layer Normalization
            lstm_output = ln(lstm_output)
            
            # Residual connection (si las dimensiones coinciden)
            if lstm_output.shape[-1] == lstm_out.shape[-1] and i > 0:
                lstm_output = lstm_output + lstm_out[:, -lstm_output.shape[1]:, :]
            
            # Dropout
            lstm_out = dropout(lstm_output)
        
        # ============ MECANISMO DE ATENCIÓN ============
        # Calcular pesos de atención para cada step temporal
        attn_scores = self.attention(lstm_out)  # (batch, seq_len, 1)
        attn_weights = torch.softmax(attn_scores, dim=1)  # Softmax sobre secuencia
        
        # Context vector: suma ponderada de todos los steps
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)  # (batch, hidden_size)
        
        # ============ CAPAS DENSAS ============
        x = self.fc1(context_vector)
        x = self.ln1(x)
        x = torch.relu(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        x = self.ln2(x)
        x = torch.relu(x)
        x = self.dropout2(x)
        
        # ============ SALIDAS ============
        p_reg = self.cabeza_regresion(x)
        l_clf = self.cabeza_clasificacion(x)
        
        return p_reg, l_clf


def obtener_modelo_v2(dias_pasados, num_features):
    """Factory function para crear modelo V2"""
    return ModeloBidireccional_v2(
        num_features=num_features,
        hidden_size=96,
        num_layers=3
    )