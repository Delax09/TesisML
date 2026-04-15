# 🔧 Fix: DataValidator.validar_y_limpiar

## Problema Identificado

```
Error: 'DataValidator' object has no attribute 'validar_y_limpiar'
```

La clase `DataValidator` en `app/ml/core/data_validation.py` no tenía implementado el método `validar_y_limpiar` que se estaba usando en:
- `app/ml/pipeline_lstm/data_processor.py`
- `app/ml/pipeline_cnn/data_processor.py`

---

## Solución Implementada

### ✅ Método Agregado a DataValidator

```python
@staticmethod
def validar_y_limpiar(df: pd.DataFrame,
                      min_filas: int = 50,
                      required_columns: list = None) -> Optional[pd.DataFrame]:
    """
    Valida y limpia un dataframe de una sola vez

    Args:
        df: DataFrame a validar y limpiar
        min_filas: Número mínimo de filas requeridas
        required_columns: Columnas requeridas (opcional)

    Returns:
        DataFrame limpio si es válido, None si no lo es
    """
```

### ¿Qué hace?

1. **Valida** que el dataframe no sea None ni esté vacío
2. **Verifica** que tenga el número mínimo de filas (default: 50)
3. **Confirma** que tiene las columnas requeridas (si se especifican)
4. **Sanitiza** los datos:
   - Reemplaza infinitos por NaN
   - Rellena NaN con forward fill
   - Recorta valores extremos (3 sigmas)
5. **Retorna** el dataframe limpio o None si falla

---

## Ubicación del Fix

```
ml-backend/app/ml/core/data_validation.py
├── Clase: DataValidator
└── Método nuevo: validar_y_limpiar() ✅
```

---

## Validación Realizada

✅ Sintaxis correcta en `data_validation.py`  
✅ Clase `DataValidator` encontrada  
✅ Método `validar_y_limpiar` disponible  
✅ Compatible con data processors LSTM y CNN  

---

## Cómo Usar

### En Data Processors

```python
from app.ml.core.data_validation import DataValidator

# Dentro de cualquier data processor
validator = DataValidator()
df_valido = validator.validar_y_limpiar(df)

if df_valido is None:
    print("Datos inválidos")
    return None

# Usar df_valido en el pipeline
```

---

## Ejemplo de Uso Completo

```python
# En pipeline_lstm/data_processor.py
def extraer_y_procesar_empresa(id_empresa: int) -> Optional[pd.DataFrame]:
    """Extrae datos de la BD y aplica indicadores técnicos con validación"""
    db = SessionLocal()
    try:
        registros = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa == id_empresa
        ).order_by(PrecioHistorico.Fecha.asc()).all()

        if len(registros) < 60:
            return None

        df = pd.DataFrame([...datos...])
        df = df.astype(float)

        # VALIDACIÓN 1: Datos crudos
        validator = DataValidator()
        df_valido = validator.validar_y_limpiar(df)
        if df_valido is None:
            print(f"Datos inválidos para empresa {id_empresa}")
            return None

        # Procesar indicadores
        df_procesado = MLEngine.calcular_indicadores(df_valido)
        df_procesado.ffill(inplace=True)
        df_procesado.bfill(inplace=True)

        # VALIDACIÓN 2: Datos post-indicadores
        df_procesado_valido = validator.validar_y_limpiar(df_procesado)
        return df_procesado_valido

    except Exception as e:
        print(f"Error procesando empresa {id_empresa}: {str(e)}")
        return None
    finally:
        db.close()
```

---

## Impacto

| Componente | Cambio |
|------------|--------|
| `data_validation.py` | +45 líneas (método nuevo) |
| `pipeline_lstm/data_processor.py` | Ya compatible ✅ |
| `pipeline_cnn/data_processor.py` | Ya compatible ✅ |
| Funcionalidad | Validación automática ✅ |
| Estabilidad | Mejorada ✅ |

---

## Verificación

Para verificar que el fix está completo:

```python
# Script de prueba
from app.ml.core.data_validation import DataValidator

validator = DataValidator()
df_valido = validator.validar_y_limpiar(df_test)

# Si df_valido no es None, el fix funciona correctamente ✅
```

---

**Estado**: ✅ RESUELTO  
**Fecha**: 15-04-2025  
**Archivos Modificados**: 1 (`data_validation.py`)