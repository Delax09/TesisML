from app.ml.core.pipeline_trainer import PipelineTrainer

# Instancia del trainer para LSTM
trainer_lstm = PipelineTrainer("LSTM", "logs/lstm_training.log")

def ejecutar_entrenamiento_lstm(model, train_loader, val_loader, device, epochs=50):
    """Alias para consistencia con nomenclatura LSTM con mejoras"""
    return trainer_lstm.ejecutar_entrenamiento(model, train_loader, val_loader, device, epochs)

def evaluar_modelo_lstm(model, val_loader, device, umbral_decision=None):
    """Alias para consistencia con nomenclatura LSTM"""
    if umbral_decision is None:
        # 🆕 MEJORA: Optimizar umbral automáticamente para minimizar FP + FN
        umbral_decision = trainer_lstm.optimizar_umbral_decision(model, val_loader, device)
    return trainer_lstm.evaluar_modelo(model, val_loader, device, umbral_decision)

def ejecutar_validacion_cruzada_lstm(model_class, data_processor, device, k=5, epochs=50):
    """Alias para consistencia con nomenclatura LSTM"""
    return trainer_lstm.ejecutar_validacion_cruzada(model_class, data_processor, device, k, epochs)