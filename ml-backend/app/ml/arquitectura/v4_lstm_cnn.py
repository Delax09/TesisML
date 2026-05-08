import torch
import torch.nn as nn

class ModeloLSTMCNN_v4(nn.Module):
    """
    Modelo Híbrido Optimizado CNN + BiLSTM
    - CNN con convoluciones dilatadas: Extrae características locales sin destruir la dimensión temporal.
    - BiLSTM: Procesa las dependencias temporales complejas en ambas direcciones de la ventana histórica.
    """
    def __init__(self, num_features: int, dias_pasados: int, hidden_size: int = 64):
        super().__init__()
        
        # ============ RAMA CNN (Extracción de Patrones Locales) ============
        # Usamos Dilation en lugar de MaxPool para mantener la longitud de la secuencia intacta (dias_pasados)
        # Dilation=2 "estira" el kernel para ver patrones más amplios
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=32, kernel_size=3, padding=2, dilation=2)
        self.bn_conv1 = nn.BatchNorm1d(32)
        self.relu_conv1 = nn.ReLU()
        
        # Dilation=4 captura patrones aún más amplios (tendencias cortas)
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=4, dilation=4)
        self.bn_conv2 = nn.BatchNorm1d(64)
        self.relu_conv2 = nn.ReLU()
        
        # ============ RAMA LSTM (Procesamiento Secuencial) ============
        # Ahora la LSTM recibe la secuencia completa (dias_pasados) con 64 features enriquecidas por la CNN
        self.lstm = nn.LSTM(
            input_size=64,           # Salida de los canales de la conv2
            hidden_size=hidden_size,
            num_layers=2,
            batch_first=True,
            dropout=0.3,
            bidirectional=True       # 🛑 BiLSTM activada para máximo contexto
        )
        
        # Salida de la BiLSTM será el doble de hidden_size
        lstm_out_size = hidden_size * 2
        
        # ============ MECANISMO DE ATENCIÓN ============
        self.attention = nn.Sequential(
            nn.Linear(lstm_out_size, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )
        
        # ============ CAPAS DE FUSIÓN Y DECISIÓN ============
        self.bn_fusion = nn.BatchNorm1d(lstm_out_size)
        self.dropout_fusion = nn.Dropout(0.4)
        
        self.fc1 = nn.Linear(lstm_out_size, hidden_size)
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
                        nn.init.kaiming_normal_(param, nonlinearity='relu') # Mejor para redes con ReLUs (CNNs)
                else:
                    nn.init.normal_(param, 0, 0.01)
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
    
    def forward(self, x):
        # Entrada original: (batch, seq_len, features)
        
        # ============ RAMA CNN ============
        # Permutar para que la CNN procese la secuencia temporal en la última dimensión: (batch, features, seq_len)
        x_cnn = x.permute(0, 2, 1)
        
        x_cnn = self.conv1(x_cnn)
        x_cnn = self.bn_conv1(x_cnn)
        x_cnn = self.relu_conv1(x_cnn)
        
        x_cnn = self.conv2(x_cnn)
        x_cnn = self.bn_conv2(x_cnn)
        x_cnn = self.relu_conv2(x_cnn)  
        # Salida CNN: (batch, 64_canales, seq_len) -> Note que seq_len se mantiene igual
        
        # ============ RAMA LSTM ============
        # Permutar de vuelta a (batch, seq_len, 64_canales) para que la LSTM lo entienda
        x_lstm_in = x_cnn.permute(0, 2, 1)
        
        lstm_out, _ = self.lstm(x_lstm_in)  # lstm_out: (batch, seq_len, hidden_size * 2)
        
        # ============ MECANISMO DE ATENCIÓN ============
        attn_scores = self.attention(lstm_out)
        attn_weights = torch.softmax(attn_scores, dim=1)
        # Suma ponderada de todos los días basándonos en la atención
        context_vector = torch.sum(attn_weights * lstm_out, dim=1)  # (batch, hidden_size * 2)
        
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

def obtener_modelo_v4(dias_pasados: int, num_features: int, hidden_size: int = 64):
    """
    Factory function para crear el modelo híbrido v4
    """
    # Usamos hidden_size = 64 por defecto para darle más capacidad a la red (el original tenía 32)
    return ModeloLSTMCNN_v4(num_features, dias_pasados, hidden_size)