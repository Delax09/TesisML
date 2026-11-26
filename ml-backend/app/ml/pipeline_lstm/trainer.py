from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_lstm = PipelineTrainer("LSTM", "logs/lstm_training.log")

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=None):
    return trainer_lstm.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs=epochs)

def entrenar_ensamble_lstm(fabrica, train_loader, val_loader, device, n_semillas=None, epochs=None):
    return trainer_lstm.entrenar_con_semillas(fabrica, train_loader, val_loader, device,
                                              n_semillas=n_semillas, epochs=epochs)

def evaluar_modelo_lstm(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_lstm.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)
