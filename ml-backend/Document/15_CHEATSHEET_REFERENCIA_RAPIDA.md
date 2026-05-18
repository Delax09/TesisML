# 🚀 Cheatsheet - Referencia Rápida

**Actualizado**: 18 Mayo 2026 | **Versión**: 2.0

---

## 📚 Documentación Rápida

### Empezar en 2 minutos ⚡

| Necesito... | Ver documento |
|------------|--------------|
| Resumen de todo | [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md) |
| Cómo entrenar | [12_GUIA_USO_TRAINERS.md](12_GUIA_USO_TRAINERS.md) |
| Qué cambió en mayo | [13_OPTIMIZACION_MATRIZ_CONFUSION_MAYO2026.md](13_OPTIMIZACION_MATRIZ_CONFUSION_MAYO2026.md) |
| Qué parámetro cambiar | [14_GUIA_PARAMETROS_CONFIGURABLES.md](14_GUIA_PARAMETROS_CONFIGURABLES.md) |
| Todo (índice completo) | [1. INDEX.md](1. INDEX.md) |

---

## 🎯 Entrenar un Modelo

### LSTM

```python
from app.ml.pipeline_lstm.trainer import ejecutar_entrenamiento_lstm
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

pesos_mejores = ejecutar_entrenamiento_lstm(
    model, train_loader, val_loader, device, 
    epochs=50  # Cambia aquí para más/menos epochs
)

model.load_state_dict(pesos_mejores)
```

### CNN

```python
from app.ml.pipeline_cnn.trainer import ejecutar_entrenamiento_cnn
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

resultado = ejecutar_entrenamiento_cnn(
    model, train_loader, val_loader, device,
    epochs=50,
    pos_weight_factor=2.5  # Cambia para ajustar penalización FP
)

model.load_state_dict(resultado['pesos'])
umbral = resultado['umbral_optimo']
```

---

## ⚙️ Cambiar Parámetros Clave

### Opción 1: Pasar como argumento

```python
# LSTM
ejecutar_entrenamiento_lstm(
    model, train_loader, val_loader, device,
    epochs=100,
    pos_weight_factor=3.0  # Más penalización a FP
)

# CNN
ejecutar_entrenamiento_cnn(
    model, train_loader, val_loader, device,
    epochs=100,
    pos_weight_factor=3.0
)
```

### Opción 2: Editar `pipeline_trainer.py`

**Focal Loss** (línea 43-44):
```python
criterion_clf = FocalLoss(gamma=3.0, pos_weight=pos_weight, alpha=0.40)
```

**Optimizador** (línea 47):
```python
optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=5e-4)
```

**Balance pérdidas** (línea 69):
```python
perdida_base = 0.3 * perdida_reg + 0.7 * perdida_clf  # Más CLF
```

**Early Stopping** (línea 51):
```python
early_stopping = EarlyStopping(paciencia=20, delta=0.0001, modelo_inicial=model)
```

---

## 🎯 Escenarios Rápidos

### ❌ Muchos FP (> 25,000)

```python
# Estrategia: Penalizar más FP
gamma = 3.0          # ↑ Enfoca en difíciles
alpha = 0.45         # ↑ Penaliza clase +
pos_weight_factor = 3.5  # ↑ Castiga FP
factor_castigo = 0.05    # ↑ Predicciones extremas
```

### ✅ Balance Bueno (ACTUAL)

```python
# Estrategia: Balance óptimo
gamma = 2.8          # Enfoque moderado
alpha = 0.35         # Penalización moderada
pos_weight_factor = 2.5  # Balance
factor_castigo = 0.02    # Castigo suave
```

### ⬆️ Bajo Recall (< 60%)

```python
# Estrategia: Aumentar predicciones positivas
gamma = 2.0          # ↓ Menos enfoque
alpha = 0.25         # ↓ Menos penalización
pos_weight_factor = 1.5  # ↓ Menos castigo
factor_castigo = 0.005   # ↓ Menos restricción
```

### ⚡ Entrenamiento Rápido

```python
# Estrategia: Convergencia rápida
learning_rate = 0.001    # ↑ Más rápido
paciencia = 8            # ↓ Termina antes
epochs = 30              # ↓ Menos epochs
```

---

## 📊 Evaluar Modelo

```python
from app.ml.core.class_balance_validator import ClassBalanceValidator

# Diagnosticar matriz confusión
diag = ClassBalanceValidator.analizar_matriz_confusion(y_real, y_pred)

print(f"TP: {diag['TP']}, TN: {diag['TN']}, FP: {diag['FP']}, FN: {diag['FN']}")
print(f"Precision: {diag['precision']:.3f}")
print(f"Recall (Sensitivity): {diag['sensitivity_recall']:.3f}")
print(f"Especificidad: {diag['specificity']:.3f}")
print(f"\n{diag['diagnostico_fpn']}")

# Generar reporte
df_reporte = MatrizConfusionReport.generar_reporte(y_real, y_pred, "Mi_Modelo")
print(df_reporte)
```

---

## 🔍 Debugging Rápido

| Problema | Solución |
|----------|----------|
| **Overfitting** | ↑ weight_decay, ↑ dropout, ↓ lr |
| **Underfitting** | ↓ weight_decay, ↑ hidden_size, ↑ lr |
| **Inestable** | ↓ max_norm, ↓ lr, ↓ gamma |
| **FP muy altos** | ↑ gamma, ↑ alpha, ↑ pos_weight |
| **Recall bajo** | ↓ gamma, ↓ alpha, ↓ pos_weight |
| **Lento** | ↑ lr, ↓ paciencia, ↓ epochs |

---

## 📈 Métricas Esperadas

### Antes (Abril 2026)
```
FP: 27,590  TN: 8,733   Precision: 46.9%  Recall: 77.2%  F1: 58.3%
```

### Después (Mayo 2026 - Estimado)
```
CONSERVADOR:  FP: 21,000  TN: 11,400  Precision: 52.8%  Recall: 75.0%  F1: 62.0%
OPTIMISTA:    FP: 17,400  TN: 13,100  Precision: 58.3%  Recall: 74.0%  F1: 65.4%
```

---

## 🔧 Arquitecturas

### LSTM v1 - Torres Separadas
```
Input → LSTM (hidden=96) → Attention → Split
                                      ├─ Tower CLF (256→128→64→1)
                                      └─ Tower REG (256→128→1)
```

### CNN v3 - Convolucional Profunda
```
Input → Conv1 (48 ch) → Conv2 (96 ch) → Flatten → Split
                                                  ├─ Tower CLF (256→128→64→1)
                                                  └─ Tower REG (256→128→1)
```

---

## 💾 Salvar Configuración

```python
# config_entrenamiento.py
class ConfigML:
    # Focal Loss
    GAMMA = 2.8
    ALPHA = 0.35
    POS_WEIGHT_FACTOR = 2.5
    
    # Optimizer
    LEARNING_RATE = 0.0008
    WEIGHT_DECAY = 2e-4
    
    # Training
    EPOCHS = 50
    BATCH_SIZE = 64
    
    # Early Stopping
    EARLY_STOPPING_PATIENCE = 15
    EARLY_STOPPING_DELTA = 0.0003
    
    # Loss Balance
    PERDIDA_REG_WEIGHT = 0.4
    PERDIDA_CLF_WEIGHT = 0.6
    FACTOR_CASTIGO = 0.02
```

---

## 📚 Documentos Clave

1. **[13_OPTIMIZACION_MATRIZ_CONFUSION_MAYO2026.md](13_OPTIMIZACION_MATRIZ_CONFUSION_MAYO2026.md)** - Todas las mejoras
2. **[14_GUIA_PARAMETROS_CONFIGURABLES.md](14_GUIA_PARAMETROS_CONFIGURABLES.md)** - Parámetro por parámetro
3. **[12_GUIA_USO_TRAINERS.md](12_GUIA_USO_TRAINERS.md)** - Ejemplos de código

---

## 🚀 Comandos Útiles

```bash
# Ejecutar API
cd ml-backend
python run.py

# Acceder a documentación
http://localhost:8000/docs

# Logs del entrenamiento
tail -f logs/cnn_training.log
tail -f logs/lstm_training.log
```

---

## ⚡ Cambio más impactante

```python
# Cambiar esto tiene el MAYOR impacto en reducir FP:
pos_weight_factor = 3.5  # De 2.5 a 3.5 → -30% FP

# Cambiar esto tiene segundo mayor impacto:
gamma = 3.0              # De 2.8 a 3.0 → -15% FP

# Cambiar esto NO tiene mucho impacto:
paciencia = 10           # De 15 a 10 (similar resultados)
```

---

**Última actualización**: 18 Mayo 2026
