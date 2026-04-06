import torch
import torch.nn as nn

class ModeloBidireccional_v2(nn.Module):
    def __init__(self, num_features):
        super(ModeloBidireccional_v2, self).__init__()
        
        self.gru = nn.GRU(input_size=num_features, hidden_size=32, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.4)
        
        # Como es bidireccional, el hidden_size se multiplica por 2 (32 * 2 = 64)
        self.fc1 = nn.Linear(64, 16) 
        self.relu = nn.ReLU()
        
        # --- RED MULTI-TAREA ---
        self.cabeza_regresion = nn.Linear(16, 1)
        self.cabeza_clasificacion = nn.Linear(16, 1)

    def forward(self, x):
        gru_out, _ = self.gru(x)
        ultimo_dia = gru_out[:, -1, :]
        
        x = self.dropout(ultimo_dia)
        x = self.relu(self.fc1(x))
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x) # Sin sigmoide
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v2(dias_pasados, num_features):
    return ModeloBidireccional_v2(num_features)