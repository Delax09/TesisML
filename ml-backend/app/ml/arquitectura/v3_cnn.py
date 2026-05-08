import torch
import torch.nn as nn

class ModeloCNN_v3(nn.Module):
    def __init__(self, num_features, dias_pasados):
        super(ModeloCNN_v3, self).__init__()
        
        # Capa 1: Dilated Convolution
        # Dilation=2 permite a la red "mirar" más atrás en el tiempo sin aumentar parámetros
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=32, kernel_size=3, padding=2, dilation=2)
        self.bn1 = nn.BatchNorm1d(32)
        self.relu1 = nn.ReLU()
        
        # Capa 2: Dilation mayor
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=4, dilation=4)
        self.bn2 = nn.BatchNorm1d(64) 
        self.relu2 = nn.ReLU()
        
        # En lugar de MaxPool agresivos, usamos Global Average Pooling al final
        # Esto reduce cualquier secuencia temporal a un vector fijo
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.dropout = nn.Dropout(0.4)
        
        # Ahora el tamaño aplanado siempre será igual al número de canales de salida (64)
        self.fc1 = nn.Linear(64, 32)
        self.bn3 = nn.BatchNorm1d(32)
        self.relu3 = nn.ReLU()
        
        self.cabeza_regresion = nn.Linear(32, 1)
        self.cabeza_clasificacion = nn.Linear(32, 1)

    def forward(self, x):
        # Permutar a (Batch, Features, Secuencia_Tiempo)
        x = x.permute(0, 2, 1) 
        
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu1(x)
        
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu2(x)
        
        # Pooling global y aplanamiento
        x = self.global_pool(x) # Salida: (Batch, 64, 1)
        x = torch.flatten(x, 1) # Salida: (Batch, 64)
        
        x = self.dropout(x)
        x = self.fc1(x)
        x = self.bn3(x)
        x = self.relu3(x)
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x)
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v3(dias_pasados, num_features):
    return ModeloCNN_v3(num_features, dias_pasados)