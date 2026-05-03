import torch
import torch.nn as nn

class ModeloLSTMCNN_v4(nn.Module):
    """
    Modelo Híbrido que combina CNN + LSTM para obtener lo mejor de ambos mundos:
    - CNN extrae características locales de patrones de precios
    - LSTM procesa las dependencias temporales
    """
    def __init__(self, num_features: int, dias_pasados: int, hidden_size: int = 32):
        super().__init__()
        
        # ============ RAMA CNN ============
        # Extrae características locales (patrones de precios)
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=16, kernel_size=3, padding=1)
        self.bn_conv1 = nn.BatchNorm1d(16)
        self.relu_conv1 = nn.ReLU()
        self.pool1 = nn.MaxPool1d(kernel_size=2)  # dias_pasados // 2
        
        self.conv2 = nn.Conv1d(in_channels=16, out_channels=32, kernel_size=3, padding=1)
        self.bn_conv2 = nn.BatchNorm1d(32)
        self.relu_conv2 = nn.ReLU()
        # Sin pool para mantener suficiente información temporal
        
        # ============ RAMA LSTM ============
        # Procesa la secuencia temporal con características extraídas por CNN
        self.lstm = nn.LSTM(
            input_size=32,  # Salida de la segunda convolución
            hidden_size=hidden_size,
            num_layers=2,
            batch_first=True,
            dropout=0.2
        )
        
        # Atención temporal
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )
        
        # ============ CAPAS DE FUSIÓN ============
        self.bn_fusion = nn.BatchNorm1d(hidden_size)
        self.dropout_fusion = nn.Dropout(0.3)
        
        self.fc1 = nn.Linear(hidden_size, hidden_size)
        self.bn1 = nn.BatchNorm1d(hidden_size)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.3)
        
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.bn2 = nn.BatchNorm1d(hidden_size // 2)
        self.relu2 = nn.ReLU()
        
        # ============ CABEZAS DE SALIDA ============
        self.cabeza_regresion = nn.Linear(hidden_size // 2, 1)
        self.cabeza_clasificacion = nn.Linear(hidden_size // 2, 1)
        
        self._init_weights()
    
    def _init_weights(self):
        for name, param in self.named_parameters():
            if 'weight' in name:
                if param.dim() >= 2:
                    if 'lstm' in name:
                        nn.init.orthogonal_(param)
                    else:
                        nn.init.xavier_uniform_(param)
                else:
                    nn.init.normal_(param, 0, 0.01)
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
    
    def forward(self, x):
        # x shape: (batch, seq_len, features)
        
        # ============ RAMA CNN ============
        # Permutar para CNN: (batch, features, seq_len)
        x_cnn = x.permute(0, 2, 1)
        
        # Primera convolución con pooling
        x_cnn = self.conv1(x_cnn)
        x_cnn = self.bn_conv1(x_cnn)
        x_cnn = self.relu_conv1(x_cnn)
        x_cnn = self.pool1(x_cnn)  # (batch, 16, seq_len // 2)
        
        # Segunda convolución sin pooling
        x_cnn = self.conv2(x_cnn)
        x_cnn = self.bn_conv2(x_cnn)
        x_cnn = self.relu_conv2(x_cnn)  # (batch, 32, seq_len // 2)
        
        # Permutar de vuelta para LSTM: (batch, seq_len // 2, 32)
        x_cnn = x_cnn.permute(0, 2, 1)
        
        # ============ RAMA LSTM ============
        # LSTM procesa las características extraídas por CNN
        lstm_out, _ = self.lstm(x_cnn)  # (batch, seq_len // 2, hidden_size)
        
        # Aplicar atención
        attn_weights = torch.softmax(self.attention(lstm_out), dim=1)
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)  # (batch, hidden_size)
        
        # ============ CAPAS DE FUSIÓN ============
        x = self.bn_fusion(context_vector)
        x = self.dropout_fusion(x)
        
        x = self.fc1(x)
        x = self.bn1(x)
        x = self.relu1(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        x = self.bn2(x)
        x = self.relu2(x)
        
        # ============ SALIDAS ============
        p_reg = self.cabeza_regresion(x)
        l_clf = self.cabeza_clasificacion(x)
        
        return p_reg, l_clf

def obtener_modelo_v4(dias_pasados: int, num_features: int, hidden_size: int = 32):
    """
    Factory function para crear el modelo híbrido v4
    
    Args:
        dias_pasados: Número de días de historia (ventana temporal)
        num_features: Número de features del dataset
        hidden_size: Tamaño del hidden state del LSTM (default: 32)
    
    Returns:
        ModeloLSTMCNN_v4 instanciado y listo para usar
    """
    return ModeloLSTMCNN_v4(num_features, dias_pasados, hidden_size)
