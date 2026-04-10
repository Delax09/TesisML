import torch
import torch.nn as nn

class ModeloCNN_v3(nn.Module):
    def __init__(self, num_features):
        super(ModeloCNN_v3, self).__init__()
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=32, kernel_size=3, padding=1)
        self.relu1 = nn.ReLU()
        self.pool1 = nn.MaxPool1d(kernel_size=2)
        
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.relu2 = nn.ReLU()
        self.pool2 = nn.AdaptiveAvgPool1d(1) 
        
        self.dropout = nn.Dropout(0.4)
        self.fc1 = nn.Linear(64, 16)
        self.bn3 = nn.BatchNorm1d(16)
        self.relu3 = nn.ReLU()
        
        self.cabeza_regresion = nn.Linear(16, 1)
        self.cabeza_clasificacion = nn.Linear(16, 1)

    def forward(self, x):
        x = x.permute(0, 2, 1) # (Batch, Features, Dias)
        
        x = self.pool1(self.relu1(self.conv1(x)))
        x = self.pool2(self.relu2(self.conv2(x)))
        
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.relu3(self.fc1(x))
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x) 
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v3(dias_pasados, num_features):
    return ModeloCNN_v3(num_features)