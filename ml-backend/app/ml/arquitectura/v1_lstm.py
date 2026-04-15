import torch
import torch.nn as nn

class ModeloLSTM_v1(nn.Module):
    def __init__(self, num_features):
        super(ModeloLSTM_v1, self).__init__()
        
        #Motor Temporal
        self.lstm = nn.LSTM(input_size=num_features, hidden_size=32, batch_first=True)
        
        #ESTABILIZADOR 1: Domina la salida de la GRU (32 neuronas)
        self.bn1 = nn.BatchNorm1d(32) 
        self.dropout = nn.Dropout(0.4) 
        
        # Capa de Razonamiento
        self.fc1 = nn.Linear(32, 16)
        
        #ESTABILIZADOR 2: Afina la decisión justo antes de predecir (16 neuronas)
        self.bn2 = nn.BatchNorm1d(16)
        self.relu = nn.ReLU()
        
        #Cabezas Multi-Tarea
        self.cabeza_regresion = nn.Linear(16, 1)     
        self.cabeza_clasificacion = nn.Linear(16, 1) 

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        
        # Extraemos solo el último día de la secuencia
        x = lstm_out[:, -1, :] 
        
        # Aplicamos la estabilización matemática
        x = self.bn1(x)
        x = self.dropout(x)
        
        x = self.fc1(x)
        x = self.bn2(x)
        x = self.relu(x)
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x) 
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v1(dias_pasados, num_features):
    return ModeloLSTM_v1(num_features)