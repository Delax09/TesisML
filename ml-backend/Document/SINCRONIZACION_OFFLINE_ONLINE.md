# 📋 Sincronización: Cambios Offline → Online

## ✅ Cambios que YA se aplican automáticamente en ONLINE:

### 1. **Balanceo de clases centralizado** ⚖️
- **Variable global**: `MLEngine.BALANCE_METHOD = 'smote'`
- **Ubicación**: `app/ml/core/engine.py` (línea 26)
- **Afecta a**: 
  - ✅ `preparar_datos_lstm()` - **YA sincronizado**
  - ✅ `preparar_datos_cnn()` - **YA sincronizado**
- **Cómo funciona**: Ambos data_processors usan `preparar_datos()` que usa el valor de `MLEngine.BALANCE_METHOD`
- **Para cambiar**: Edita solo `engine.py` y se aplicará a TODOS los entrenamientos online

### 2. **Modelo v4 Híbrida (CNN+LSTM)** 🔄
- **Nuevo archivo**: `app/ml/arquitectura/v4_hibrida.py`
- **Sincronización manual**: 
  - ✅ Importado en `engine.py`
  - ✅ Agregado a orquestador LSTM (`pipeline_lstm/orquestador.py`)
  - ⏳ Requiere: Crear registro en BD con `Version='v4'`

---

## 📊 Flujo de datos (Online)

```
Routers (API)
    ↓
entrenar_pipeline_lstm() / entrenar_pipeline_cnn()
    ↓
Orquestador (LSTM/CNN)
    ↓
preparar_datos_lstm() / preparar_datos_cnn()
    ↓
preparar_datos() ← USE MLEngine.BALANCE_METHOD aquí
    ↓
preparar_datos_generico() ← BALANCEO AUTOMÁTICO
    ↓
Dataset entrenamiento (balanceado)
```

---

## 🔄 Dónde hacer cambios:

| Si quieres cambiar... | Edita... | Afecta... |
|----------------------|----------|-----------|
| Método de balanceo | `engine.py` line 26 | ✅ Offline + Online (ambas) |
| Agregar modelo v4 online | `routers/ia.py` | ✅ Permitir entrenar v4 desde API |
| Parámetros LSTM/CNN | `pipeline_base.py` | ✅ Offline + Online (ambas) |
| Features del modelo | `engine.py` FEATURES | ✅ Offline + Online (ambas) |

---

## 🎯 Cambios pendientes para sincronización total:

### 1. Crear tabla `ModeloIA` v4 en BD
```sql
INSERT INTO ModeloIA (Nombre, Version, Activo) 
VALUES ('Hibrida CNN+LSTM', 'v4', 1);
```

### 2. Actualizar router `/ia/entrenar` para permitir v4
- Archivo: `app/routers/ia.py`
- Cambio: Agregar 'v4' a lista de versiones válidas

### 3. Documentar nueva arquitectura
- Archivo: `Document/README_MODELOS.md` (crear)
- Incluir: v4 diagrama, performance esperado, uso

---

## 📈 Ventajas de esta sincronización:

✅ Un cambio en `engine.py` afecta TODOS los entrenamientos  
✅ Data preparation es idéntico en offline y online  
✅ Balanceo se aplica automáticamente sin modificar código  
✅ Modelos nuevos se integran fácilmente  
✅ Fácil mantener consistencia entre pipelines  

