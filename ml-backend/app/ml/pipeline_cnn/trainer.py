from app.ml.core.pipeline_trainer import PipelineTrainer

# Instancia del trainer para CNN
trainer_cnn = PipelineTrainer("CNN", "logs/cnn_training.log")

def ejecutar_entrenamiento_cnn(model, train_loader, val_loader, device, epochs=50):
    """Alias para consistencia con nomenclatura CNN con mejoras"""
    return trainer_cnn.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_cnn(model, val_loader, device, umbral_decision=None):
    """Alias para consistencia con nomenclatura CNN"""
    if umbral_decision is None:
        # 🆕 MEJORA: Optimizar umbral automáticamente para minimizar FP + FN
        umbral_decision = trainer_cnn.optimizar_umbral_decision(model, val_loader, device)
    return trainer_cnn.evaluar_modelo(model, val_loader, device, umbral_decision)

def ejecutar_validacion_cruzada_cnn(model_class, data_processor, device, k=5, epochs=50):
    """Alias para consistencia con nomenclatura CNN"""
    return trainer_cnn.ejecutar_validacion_cruzada(model_class, data_processor, device, k, epochs)