from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_lstm = PipelineTrainer("LSTM", "logs/lstm_training.log")

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=50):
    return trainer_lstm.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_lstm(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_lstm.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)