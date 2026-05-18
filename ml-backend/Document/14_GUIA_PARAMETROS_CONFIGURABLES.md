# ⚙️ Guía de Parámetros Configurables

**Versión**: 2.0 | **Actualizado**: 18 Mayo 2026

---

## 🎯 Introducción

Este documento describe **TODOS los parámetros que puedes cambiar** en el pipeline de entrenamiento ML, con sus valores recomendados e impacto en la matriz de confusión.

---

## 📋 Tabla de Contenidos

1. [Parámetros de Focal Loss](#1-parámetros-de-focal-loss)
2. [Parámetros del Optimizador](#2-parámetros-del-optimizador)
3. [Balance de Pérdidas](#3-balance-de-pérdidas)
4. [Early Stopping](#4-early-stopping)
5. [Umbral de Decisión](#5-umbral-de-decisión)
6. [Parámetros de Arquitectura](#6-parámetros-de-arquitectura)
7. [Configuración Recomendada](#7-configuración-recomendada)

---

## 1. Parámetros de Focal Loss

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 43-44

```python
criterion_clf = FocalLoss(gamma=2.8, pos_weight=pos_weight, alpha=0.35)
```

### 1.1 Parámetro: `gamma`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 2.0 - 4.0 |
| **Valor actual** | 2.8 |
| **Tipo** | Float |
| **Impacto** | Enfoque en ejemplos difíciles |

**Explicación**:
- **Gamma alto (3.0-4.0)**: Enfoca MUCHO en ejemplos difíciles → Más conservador, reduce FP
- **Gamma medio (2.5-3.0)**: Balance entre difíciles y fáciles → Recomendado
- **Gamma bajo (2.0-2.5)**: Enfoca menos en difíciles → Más liberal, aumenta Recall

**Cómo cambiar**:
```python
# OPCIÓN 1: Editar directamente
# En pipeline_trainer.py, línea 43:
criterion_clf = FocalLoss(gamma=3.0, pos_weight=pos_weight, alpha=0.35)
#                                     ↑ Cambia aquí

# OPCIÓN 2: Crear archivo de config (mejor)
# Agregar a config_entrenamiento.py:
GAMMA = 3.0
```

**Impacto en matriz confusión**:
```
Gamma 2.0 (Liberal):   FP ⬆️  Recall ⬆️  TN ⬇️
Gamma 2.8 (Actual):    FP ➡️  Recall ➡️  TN ➡️
Gamma 3.5 (Conservative): FP ⬇️  Recall ⬇️  TN ⬆️
```

---

### 1.2 Parámetro: `alpha`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 0.2 - 0.5 |
| **Valor actual** | 0.35 |
| **Tipo** | Float |
| **Impacto** | Penalización clase positiva débil |

**Explicación**:
- **Alpha = 0.5**: Ambas clases igual peso → Balance perfecto
- **Alpha = 0.35**: Clase positiva penalizada → Reduce falsos positivos débiles ⭐
- **Alpha = 0.2**: Clase positiva muy penalizada → Puede subir FN

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 44:
criterion_clf = FocalLoss(gamma=2.8, pos_weight=pos_weight, alpha=0.40)
#                                                                     ↑
```

**Impacto**:
```
Alpha 0.25: Penalización leve de clase +  → FP ⬆️  Recall ⬆️
Alpha 0.35: Balance (ACTUAL)              → FP ➡️  Recall ➡️
Alpha 0.45: Penalización fuerte clase +   → FP ⬇️  Recall ⬇️
```

---

### 1.3 Parámetro: `pos_weight_factor`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 1.0 - 5.0 |
| **Valor actual** | 2.5 |
| **Tipo** | Float |
| **Impacto** | Penalización de falsos positivos |
| **Capping automático** | [1.5, 5.0] |

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 40

```python
def ejecutar_entrenamiento(self, model, train_loader, val_loader, device, epochs=50, pos_weight_factor=2.5):
```

**Explicación**:
- Es el factor por el que se multiplica el `pos_weight` calculado dinámicamente
- Mayor factor → Mayor penalización a falsos positivos
- Se calcula automáticamente según balance de clases

**Cómo cambiar**:

```python
# OPCIÓN 1: Pasar como argumento (RECOMENDADO)
from app.ml.pipeline_cnn.trainer import ejecutar_entrenamiento_cnn

resultado = ejecutar_entrenamiento_cnn(
    model, train_loader, val_loader, device,
    epochs=50,
    # pos_weight_factor=3.0  # Descomenta para cambiar
)

# OPCIÓN 2: Editar valor por defecto
# En pipeline_trainer.py, línea 40:
def ejecutar_entrenamiento(self, model, train_loader, val_loader, device, epochs=50, pos_weight_factor=3.0):
#                                                                                                            ↑
```

**Impacto**:
```
pos_weight = 1.5: Penalización mínima  → FP ⬆️  Recall ⬆️
pos_weight = 2.5: Balance (ACTUAL)     → FP ➡️  Recall ➡️
pos_weight = 3.5: Penalización fuerte  → FP ⬇️  Recall ⬇️
```

---

## 2. Parámetros del Optimizador

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 47

```python
optimizer = optim.AdamW(model.parameters(), lr=0.0008, weight_decay=2e-4)
```

### 2.1 Parámetro: `learning_rate` (lr)

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 0.0001 - 0.001 |
| **Valor actual** | 0.0008 |
| **Tipo** | Float |
| **Impacto** | Velocidad de convergencia |

**Explicación**:
- **LR alto (0.001)**: Converge rápido pero puede ser inestable
- **LR medio (0.0008)**: Convergencia estable ⭐ (ACTUAL)
- **LR bajo (0.0003)**: Converge lento pero muy estable

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 47:
optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=2e-4)
#                                               ↑
```

**Impacto**:
```
lr = 0.00005: Convergencia MUY lenta    → Muchos epochs
lr = 0.0008:  Convergencia buena        → ACTUAL
lr = 0.001:   Convergencia rápida       → Menos epochs (pero inestable)
```

### 2.2 Parámetro: `weight_decay`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 1e-5 - 1e-3 |
| **Valor actual** | 2e-4 |
| **Tipo** | Float (científica) |
| **Impacto** | Regularización L2 |

**Explicación**:
- Penaliza pesos grandes para evitar overfitting
- **weight_decay alto**: Mayor regularización → Menos overfitting pero underfitting
- **weight_decay bajo**: Menor regularización → Más overfitting

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 47:
optimizer = optim.AdamW(model.parameters(), lr=0.0008, weight_decay=5e-4)
#                                                                       ↑
```

**Impacto en overfitting**:
```
weight_decay = 1e-5:  Regularización mínima  → Overfitting ⬆️
weight_decay = 2e-4:  Regularización media   → ACTUAL
weight_decay = 5e-4:  Regularización fuerte  → Underfitting ⬆️
```

---

### 2.3 Parámetro: `eta_min`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 1e-7 - 1e-5 |
| **Valor actual** | 5e-7 |
| **Tipo** | Float (científica) |
| **Impacto** | Learning rate mínimo al final |

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 49

```python
scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=5e-7)
```

**Explicación**:
- Learning rate se reduce gradualmente hasta `eta_min`
- No afecta mucho el resultado final, solo la tasa de aprendizaje mínima

---

### 2.4 Parámetro: `max_norm` (Gradient Clipping)

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 0.1 - 2.0 |
| **Valor actual** | 0.5 |
| **Tipo** | Float |
| **Impacto** | Estabilidad de gradientes |

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 72

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.5)
```

**Explicación**:
- Limita la magnitud de los gradientes para evitar "gradient explosion"
- **max_norm bajo (0.2)**: Muy restrictivo, entrenamiento lento
- **max_norm medio (0.5)**: Balance ⭐ (ACTUAL)
- **max_norm alto (1.5)**: Menos restrictivo, puede ser inestable

---

## 3. Balance de Pérdidas

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 65-71

```python
perdida_reg = criterion_reg(p_reg, yr_b)
perdida_clf = criterion_clf(l_clf, yc_b)
perdida_base = 0.4 * perdida_reg + 0.6 * perdida_clf

factor_castigo = 0.02
castigo_extremo = factor_castigo * torch.mean(torch.abs(l_clf))

loss = perdida_base + castigo_extremo
```

### 3.1 Peso de Regresión vs Clasificación

| Parámetro | Valor Actual | Peso Actual |
|-----------|--------------|------------|
| Regresión | 0.4 | 40% |
| Clasificación | 0.6 | 60% |

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 69:
perdida_base = 0.3 * perdida_reg + 0.7 * perdida_clf  # Más énfasis en clf
#              ↑                    ↑
```

**Configuraciones recomendadas**:

| Objetivo | Reg % | Clf % | Caso de Uso |
|----------|-------|-------|-----------|
| Priorizar Precisión | 0.3 | 0.7 | Reducir FP al máximo |
| Balance (ACTUAL) | 0.4 | 0.6 | Equilibrio bueno |
| Priorizar Recall | 0.6 | 0.4 | Aumentar positivos detectados |
| Igual peso | 0.5 | 0.5 | Ambas tareas igual |

---

### 3.2 Factor de Castigo

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 0.0 - 0.1 |
| **Valor actual** | 0.02 |
| **Tipo** | Float |
| **Impacto** | Penalización de predicciones extremas |

**Explicación**:
- Penaliza logits muy altos o muy bajos (predicciones muy confiantes)
- Ayuda a que el modelo sea menos "seguro" → Menos falsos positivos

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 70:
factor_castigo = 0.05  # Aumentar castigo
```

**Impacto**:
```
factor_castigo = 0.0:   Sin castigo         → Predicciones muy extremas
factor_castigo = 0.02:  Castigo suave       → ACTUAL
factor_castigo = 0.1:   Castigo fuerte      → Modelo muy conservador
```

---

## 4. Early Stopping

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 51

```python
early_stopping = EarlyStopping(paciencia=15, delta=0.0003, modelo_inicial=model)
```

### 4.1 Parámetro: `paciencia`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 5 - 30 |
| **Valor actual** | 15 |
| **Tipo** | Integer |
| **Impacto** | Epochs sin mejora antes de parar |

**Explicación**:
- Si no hay mejora en N epochs, detiene el entrenamiento
- **paciencia baja (5)**: Termina rápido pero puede perder mejoras
- **paciencia media (15)**: Balance ⭐ (ACTUAL)
- **paciencia alta (25)**: Más exploración, más tiempo

**Cómo cambiar**:
```python
# En pipeline_trainer.py, línea 51:
early_stopping = EarlyStopping(paciencia=20, delta=0.0003, modelo_inicial=model)
#                                          ↑
```

---

### 4.2 Parámetro: `delta`

| Propiedad | Valor |
|-----------|-------|
| **Rango recomendado** | 0.00001 - 0.001 |
| **Valor actual** | 0.0003 |
| **Tipo** | Float |
| **Impacto** | Mejora mínima para resetear contador |

**Explicación**:
- Mejora mínima requerida para considerar "progreso"
- **delta alto (0.001)**: Solo cambios grandes cuentan → Termina antes
- **delta bajo (0.00001)**: Cualquier cambio cuenta → Termina más tarde

---

## 5. Umbral de Decisión

**Ubicación**: `app/ml/core/pipeline_trainer.py`, línea 154-188

El umbral se **optimiza automáticamente** en 2 fases:
1. **Fase 1**: Búsqueda gruesa (0.05 en 0.05)
2. **Fase 2**: Búsqueda fina (0.01 en 0.01)

### 5.1 Cómo cambiar la estrategia

```python
# En pipeline_trainer.py, línea 156:
umbrales_bastos = np.arange(0.1, 0.9, 0.05)  # Cambiar 0.05 para granularidad
```

**Impacto**:
```
Umbral 0.30: Muy liberal (FP ⬆️, Recall ⬆️)
Umbral 0.50: Balance   (AUTOMÁTICO)
Umbral 0.70: Conservador (FP ⬇️, Recall ⬇️)
```

---

## 6. Parámetros de Arquitectura

### 6.1 LSTM v1 (`app/ml/arquitectura/v1_lstm.py`)

```python
class ModeloLSTM_v1(nn.Module):
    def __init__(self, num_features: int, hidden_size: int = 96, num_layers: int = 2):
```

| Parámetro | Valor Actual | Rango | Impacto |
|-----------|--------------|-------|---------|
| `hidden_size` | 96 | 32-256 | Capacidad modelo |
| `num_layers` | 2 | 1-4 | Profundidad LSTM |
| Dropout CLF | 0.4, 0.35 | 0.2-0.6 | Regularización clasificación |
| Dropout REG | 0.3, 0.25 | 0.1-0.5 | Regularización regresión |

**Cómo cambiar**:
```python
# En v1_lstm.py, línea 2:
def __init__(self, num_features: int, hidden_size: int = 128, num_layers: int = 2):
#                                                        ↑ Aumentar capacidad
```

---

### 6.2 CNN v3 (`app/ml/arquitectura/v3_cnn.py`)

```python
class ModeloCNN_v3(nn.Module):
    def __init__(self, num_features, dias_pasados):
```

| Parámetro | Valor Actual | Impacto |
|-----------|--------------|---------|
| Conv1 out_channels | 48 | Discriminación 1ª capa |
| Conv2 out_channels | 96 | Discriminación 2ª capa |
| FC CLF neurons | 256, 128, 64 | Profundidad clasificación |
| FC REG neurons | 256, 128 | Profundidad regresión |

**Cómo cambiar**:
```python
# En v3_cnn.py, línea 8:
self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=64, kernel_size=3, padding=1)
#                                                               ↑ Aumentar para más capacidad
```

---

## 7. Configuración Recomendada

### Escenario 1: Reducir FP al máximo (Conservador)

```python
# Focal Loss - Muy restrictivo
gamma = 3.0
alpha = 0.45
pos_weight_factor = 3.5

# Optimizador - Converge lento
learning_rate = 0.0005
weight_decay = 5e-4

# Balance - Prioriza clasificación
perdida_reg = 0.2
perdida_clf = 0.8
factor_castigo = 0.05

# Early Stopping - Menos paciencia
paciencia = 10
```

**Resultado esperado**: FP ⬇️⬇️ Recall ⬇️ F1 ➡️

---

### Escenario 2: Balance Optimo (ACTUAL - Recomendado)

```python
# Focal Loss - Buen balance
gamma = 2.8
alpha = 0.35
pos_weight_factor = 2.5

# Optimizador - Convergencia estable
learning_rate = 0.0008
weight_decay = 2e-4

# Balance - Prioriza CLF moderadamente
perdida_reg = 0.4
perdida_clf = 0.6
factor_castigo = 0.02

# Early Stopping - Balance
paciencia = 15
```

**Resultado esperado**: FP ➡️ Recall ➡️ F1 ⬆️ (Mejora esperada +3-7pp)

---

### Escenario 3: Aumentar Recall (Liberal)

```python
# Focal Loss - Permisivo
gamma = 2.0
alpha = 0.25
pos_weight_factor = 1.5

# Optimizador - Converge rápido
learning_rate = 0.001
weight_decay = 1e-5

# Balance - Igual peso en ambas
perdida_reg = 0.5
perdida_clf = 0.5
factor_castigo = 0.005

# Early Stopping - Más paciencia
paciencia = 20
```

**Resultado esperado**: FP ⬆️ Recall ⬆️ F1 ➡️

---

### Escenario 4: Convergencia Rápida

```python
# Focal Loss - Moderado
gamma = 2.5
alpha = 0.30
pos_weight_factor = 2.0

# Optimizador - Rápido
learning_rate = 0.001
weight_decay = 1e-4

# Epochs reducidos
epochs = 30

# Early Stopping - Termina antes
paciencia = 8
delta = 0.001
```

**Resultado esperado**: Entrenamiento ~50% más rápido

---

## 🔍 Debugging: ¿Qué cambiar si...?

### ❌ Overfitting (val_loss >> train_loss)

```python
# Aumenta regularización:
weight_decay = 5e-4        # Duplica
dropout ↑                  # En arquitecturas
factor_castigo = 0.05      # Aumenta
learning_rate = 0.0005     # Reduce LR
```

### ❌ Underfitting (ambas pérdidas altas)

```python
# Reduce regularización:
weight_decay = 1e-5        # Reduce
hidden_size ↑ 128          # Aumenta modelo
learning_rate = 0.001      # Aumenta LR
epochs = 100               # Más epochs
```

### ❌ Entrenamiento Inestable (pérdida explota)

```python
# Estabiliza gradientes:
max_norm = 0.3             # Reduce
learning_rate = 0.0005     # Reduce LR
gamma = 2.0                # Reduce focal gamma
```

### ❌ FP muy altos (> 25,000)

```python
# Penaliza más FP:
gamma = 3.0
alpha = 0.45
pos_weight_factor = 3.5
factor_castigo = 0.05
perdida_clf = 0.7
```

### ❌ Recall bajo (< 60%)

```python
# Relaja penalizaciones:
gamma = 2.0
alpha = 0.25
pos_weight_factor = 1.5
factor_castigo = 0.005
umbral_decision ↓          # Reduce umbral
```

---

## 📝 Resumen Rápido

| Quiero... | Cambio Rápido |
|-----------|--------------|
| **Reducir FP** | gamma↑, alpha↑, pos_weight↑ |
| **Aumentar Recall** | gamma↓, alpha↓, pos_weight↓ |
| **Converger rápido** | lr↑, paciencia↓ |
| **Mejor estabilidad** | weight_decay↑, max_norm↓ |
| **Evitar overfitting** | weight_decay↑, factor_castigo↑, dropout↑ |

---

**Última actualización**: 18 Mayo 2026  
**Versión**: 2.0
