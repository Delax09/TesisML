from app.ml.core.pipeline_trainer import PipelineTrainer

trainer_cnn = PipelineTrainer("CNN", "logs/cnn_training.log")

def ejecutar_entrenamiento_cnn(model, train_loader, val_loader, device, epochs=None):
    return trainer_cnn.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs=epochs)

def entrenar_ensamble_cnn(fabrica, train_loader, val_loader, device, n_semillas=None, epochs=None):
    return trainer_cnn.entrenar_con_semillas(fabrica, train_loader, val_loader, device,
                                             n_semillas=n_semillas, epochs=epochs)

def evaluar_modelo_cnn(model, loader, device, umbral_decision=0.5, meta=None):
    return trainer_cnn.evaluar_modelo(model, loader, device, umbral_decision, meta=meta)
