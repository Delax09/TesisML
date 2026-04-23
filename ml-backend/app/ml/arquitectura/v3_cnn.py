import torch
import torch.nn as nn

class ModeloCNN_v3(nn.Module):
    def __init__(self, num_features, dias_pasados):
        super(ModeloCNN_v3, self).__init__()
        
        # Capa 1 con Estabilizador
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(32)
        self.relu1 = nn.ReLU()
        # Reduce la secuencia a la mitad (ej: 60 -> 30)
        self.pool1 = nn.MaxPool1d(kernel_size=2) 
        
        # Capa 2 con Estabilizador
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(64) 
        self.relu2 = nn.ReLU()
        # Reduce la secuencia a la mitad nuevamente (ej: 30 -> 15)
        self.pool2 = nn.MaxPool1d(kernel_size=2) 
        
        self.dropout = nn.Dropout(0.4)
        
        # Calcular el tamaño aplanado tras los dos MaxPools (cada uno divide por 2, en total divide por 4)
        tamano_aplanado = 64 * (dias_pasados // 4)
        
        # Capas Densas (Ahora usa la variable calculada dinámicamente)
        self.fc1 = nn.Linear(tamano_aplanado, 16)
        self.bn3 = nn.BatchNorm1d(16)
        self.relu3 = nn.ReLU()
        
        self.cabeza_regresion = nn.Linear(16, 1)
        self.cabeza_clasificacion = nn.Linear(16, 1)

    def forward(self, x):
        # Las CNN en PyTorch esperan (Batch, Features, Secuencia_Tiempo)
        x = x.permute(0, 2, 1) 
        
        # Pasada 1
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu1(x)
        x = self.pool1(x)
        
        # Pasada 2
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu2(x)
        x = self.pool2(x)
        
        # Aplanamiento y decisión
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        
        x = self.fc1(x)
        x = self.bn3(x)
        x = self.relu3(x)
        
        precio_predicho = self.cabeza_regresion(x)
        direccion_predicha = self.cabeza_clasificacion(x)
        
        return precio_predicho, direccion_predicha

def obtener_modelo_v3(dias_pasados, num_features):
    # Pasamos dias_pasados a la instanciación de la clase
    return ModeloCNN_v3(num_features, dias_pasados)