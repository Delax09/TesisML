from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_cnn = PipelineTrainer("CNN", "logs/cnn_training.log")

def ejecutar_entrenamiento_cnn(model, train_loader, val_loader, device, epochs=50):
    return trainer_cnn.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_cnn(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_cnn.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)