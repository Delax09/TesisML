from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Input, Dropout

"""
        LSTM(128, return_sequences=True),
        Dropout(0.2), """

def obtener_modelo_v1(shape_1, shape_2):
    """Modelo LSTM Clásico: Rápido y efectivo para tendencias cortas."""
    return Sequential([
        Input(shape=(shape_1, shape_2)),

        LSTM(64, return_sequences=False),
        
        Dense(32, activation='relu'),
        Dense(1)
    ])