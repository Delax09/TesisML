import torch
import torch.nn as nn

class ModeloBidireccional_v2(nn.Module):
    def __init__(self, num_features):
        super(ModeloBidireccional_v2, self).__init__()
        # bidirectional=True multiplica la salida por 2 (hacia adelante y atrás)
        self.lstm = nn.LSTM(input_size=num_features, hidden_size=32, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.4)
        # La entrada a la capa lineal ahora es 64 (32 * 2)
        self.fc1 = nn.Linear(64, 16) 
        self.relu = nn.ReLU()

        self.cabeza_regresion = nn.Linear(16,1)
        self.cabeza_clasificacion = nn.Linear(16,1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        ultimo_dia = lstm_out[:, -1, :]
        x = self.dropout(ultimo_dia)
        x = self.relu(self.fc1(x))

        precio_pred = self.cabeza_regresion(x)
        dir_pred = self.cabeza_clasificacion(x)  # Devolver logits, no probabilidades

        return precio_pred, dir_pred

def obtener_modelo_v2(dias_pasados, num_features):
    return ModeloBidireccional_v2(num_features)