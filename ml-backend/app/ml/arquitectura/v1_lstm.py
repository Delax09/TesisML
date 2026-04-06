import torch
import torch.nn as nn

class ModeloLSTM_v1(nn.Module):
    def __init__(self, num_features):
        super(ModeloLSTM_v1, self).__init__()
        self.lstm = nn.LSTM(input_size=num_features, hidden_size=32, batch_first=True)
        self.dropout = nn.Dropout(0.4) 
        self.fc1 = nn.Linear(32, 16)
        self.relu = nn.ReLU()
        
        self.cabeza_regresion = nn.Linear(16, 1)     
        self.cabeza_clasificacion = nn.Linear(16, 1) 

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        ultimo_dia = lstm_out[:, -1, :] 
        x = self.dropout(ultimo_dia)
        x = self.relu(self.fc1(x))
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x)
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v1(dias_pasados, num_features):
    return ModeloLSTM_v1(num_features)