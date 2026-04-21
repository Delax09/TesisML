# 📊 Propuesta: Integración AlphaVantage + FRED API para Mejora de Modelos ML

**Fecha**: Abril 2026  
**Estado**: Propuesta Técnica  
**Objetivo**: Mejorar predicciones LSTM/CNN agregando contexto macroeconómico y datos avanzados

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problema Identificado](#problema-identificado)
3. [Solución Propuesta](#solución-propuesta)
4. [Arquitectura Técnica](#arquitectura-técnica)
5. [Impacto Esperado](#impacto-esperado)
6. [Roadmap de Implementación](#roadmap-de-implementación)
7. [Consideraciones Técnicas](#consideraciones-técnicas)
8. [Análisis de Riesgo](#análisis-de-riesgo)

---

## 🎯 Resumen Ejecutivo

### El Desafío
Nuestros modelos LSTM/CNN actualmente presentan:
- **Falsos Positivos**: 15-20% (señales alcistas en contexto bajista)
- **Falsos Negativos**: 10-15% (perdidas oportunidades alcistas reales)
- **Limitación**: Solo usan datos técnicos del ticker individual

### La Solución
Enriquecer el pipeline con:
1. **AlphaVantage API**: Métricas técnicas avanzadas y datos intraday
2. **FRED API**: Indicadores macroeconómicos (tasa federal, desempleo, PIB, VIX)
3. **Feature Engineering**: Combinar ambas para detectar contexto económico

### Impacto Proyectado
- **F1-Score**: ↑ 5-12%
- **Falsos Positivos**: ↓ 15-25%
- **Falsos Negativos**: ↓ 10-15%
- **Tiempo de Desarrollo**: 3-4 semanas
- **Inversión**: 0 (APIs gratuitas)

---

## 🔍 Problema Identificado

### Limitaciones Actuales

#### 1. **Falta de Contexto Macroeconómico**
```
Situación actual:
├─ Modelo ve: RSI=75 (sobrecompra), MACD positivo
├─ Predicción: "ALCISTA"
└─ Realidad: Fed acaba de subir tasa → Rally termina → ❌ FALSE POSITIVE
```

#### 2. **Métricas Técnicas Limitadas**
- 30+ indicadores actuales, pero:
  - Sin volatilidad intraday
  - Sin análisis de clusters de volumen
  - Sin patrones de liquidez
  - Sin correlación con índices principales

#### 3. **Sensibilidad a Cambios de Régimen**
```
Escenario 1: Mercado normal
├─ Umbral óptimo: 0.50
└─ Funciona bien ✓

Escenario 2: Alta volatilidad
├─ Umbral sigue siendo 0.50
├─ Genera FP en picos de miedo
└─ Funciona mal ❌
```

---

## 💡 Solución Propuesta

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sistema Enriquecido                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ENTRADA                                                         │
│  ├─ yfinance (precios diarios) ✓ Existente                      │
│  ├─ AlphaVantage (métricas avanzadas) 🆕 Nuevo                  │
│  └─ FRED API (indicadores macro) 🆕 Nuevo                       │
│                                                                  │
│  PROCESAMIENTO                                                   │
│  ├─ Validación de datos                                         │
│  ├─ Cálculo de indicadores técnicos                             │
│  ├─ Combinación con indicadores macro                           │
│  └─ Detección de regímenes de volatilidad                       │
│                                                                  │
│  FEATURE ENGINEERING                                             │
│  ├─ 30+ indicadores técnicos actuales                           │
│  ├─ 4+ indicadores macro (Tasa Fed, Desempleo, PIB, VIX)       │
│  ├─ Correlaciones dinámicas                                     │
│  ├─ Beta económico                                              │
│  └─ Total: ~35-40 features optimizados                          │
│                                                                  │
│  ENTRENAMIENTO                                                   │
│  ├─ LSTM v1/v2 (clásico)                                        │
│  ├─ LSTM v1/v2 Enriquecido (con macro)                          │
│  ├─ CNN v3 (clásico)                                            │
│  └─ CNN v3 Enriquecido (con macro)                              │
│                                                                  │
│  PREDICCIÓN                                                      │
│  ├─ Umbral base: 0.50                                           │
│  ├─ Umbral dinámico según volatilidad régimen                   │
│  └─ Validación cruzada macroeconómica                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura Técnica

### 1. Extensión de Base de Datos (SIN modificar tablas existentes)

```sql
-- Nueva tabla: Indicadores Macroeconómicos
CREATE TABLE IndicadorMacroeconomico (
    IdIndicador INT PRIMARY KEY,
    Fecha DATE NOT NULL,
    Nombre VARCHAR(100) NOT NULL,  -- "Tasa_Federal", "Desempleo", etc.
    Valor DECIMAL(18,6) NOT NULL,
    Fuente VARCHAR(50) DEFAULT 'FRED',
    FechaActualizacion DATETIME DEFAULT GETDATE()
);

-- Nueva tabla: Datos AlphaVantage
CREATE TABLE DatosAlphaVantage (
    IdAlphaVantage INT PRIMARY KEY,
    IdEmpresa INT NOT NULL FOREIGN KEY,
    Fecha DATE NOT NULL,
    Close DECIMAL(18,4),
    Volume BIGINT,
    RSI DECIMAL(5,2),           -- RSI del API
    MACD DECIMAL(18,6),         -- MACD del API
    BollingerUpper DECIMAL(18,4),
    BollingerLower DECIMAL(18,4),
    MetricasAvanzadas JSON      -- Almacenar datos adicionales
);

-- Nueva tabla: Features Enriquecidos
CREATE TABLE FeatureEnriquecido (
    IdFeature INT PRIMARY KEY,
    IdEmpresa INT NOT NULL FOREIGN KEY,
    Fecha DATE NOT NULL,
    CorrMacro DECIMAL(5,3),     -- Correlación con indicadores macro (-1 a 1)
    VolatilityRegime VARCHAR(20), -- 'HIGH', 'MEDIUM', 'LOW'
    BetaEconomico DECIMAL(5,3),   -- Sensibilidad a cambios económicos
    ContextoEconomico VARCHAR(MAX), -- JSON con contexto
    FechaCalculo DATETIME DEFAULT GETDATE()
);
```

**Ventaja Principal**: `PrecioHistorico` permanece **100% intacta**. Datos nuevos coexisten en paralelo.

---

### 2. Nuevos Módulos de Servicios

#### `app/services/data_providers/alpha_vantage_provider.py`

```python
"""
Proveedor de datos AlphaVantage
- Descarga datos OHLCV con frecuencias avanzadas
- Calcula indicadores técnicos adicionales
- Maneja rate limiting (5 req/min en free tier)
"""

Funciones principales:
├─ fetch_daily_adjusted(ticker)
│  └─ Retorna: OHLCV ajustado por splits/dividendos
│
├─ fetch_intraday(ticker, interval='5min')
│  └─ Retorna: Datos cada 5/15/30/60 minutos
│
├─ fetch_technical_indicators(ticker, indicator='RSI')
│  └─ RSI, MACD, Bollinger, Stochastic, ADX, etc.
│
├─ calcular_metricas_avanzadas(df)
│  └─ Combina múltiples indicadores en scores
│
└─ cache_management()
   └─ Cache local SQLite para no exceder límites
```

**Características de Robustez**:
- ✅ Rate limiting con cola de reintentos
- ✅ Fallback automático a yfinance si falla
- ✅ Retry logic con backoff exponencial
- ✅ Validación de datos antes de guardar
- ✅ Logging detallado de errores

---

#### `app/services/data_providers/fred_provider.py`

```python
"""
Proveedor de datos FRED (Federal Reserve Economic Data)
- Descarga indicadores macroeconómicos
- Sincroniza fechas con el mercado
"""

Funciones principales:
├─ fetch_series(series_id, start_date, end_date)
│  └─ Descarga: Tasa Federal, Desempleo, PIB, Spread, etc.
│
├─ fetch_recession_data()
│  └─ Retorna: Períodos de recesión históricas (NBER)
│
├─ interpolar_datos_feriados(df)
│  └─ Rellena fines de semana/feriados (último valor conocido)
│
└─ calcular_regimen_economico(df)
   ├─ Expansión vs Recesión
   ├─ Tight vs Loose (política monetaria)
   └─ Alto vs Bajo crédito (spread)
```

**Series FRED a Utilizar** (Todas gratuitas):
| ID | Descripción | Frecuencia | Utilidad |
|---|---|---|---|
| `DFF` | Tasa Federal Diaria | Diaria | Política monetaria actual |
| `UNRATE` | Tasa de Desempleo | Mensual | Salud laboral |
| `A191RL1Q225SBEA` | PIB Real | Trimestral | Crecimiento económico |
| `VIXCLS` | VIX (Volatilidad Implícita) | Diaria | Miedo de mercado |
| `TED` | TED Spread | Diaria | Estrés crediticio |
| `MORTGAGE30US` | Tasa Hipotecaria | Semanal | Sentimiento consumidor |

---

#### `app/services/feature_enrichment_service.py`

```python
"""
Servicio de enriquecimiento de features
Combina datos técnicos, AlphaVantage y FRED en un feature set cohesivo
"""

Funciones principales:
├─ enriquecer_features_con_macro(df_precios, df_macro)
│  └─ Combina precios (índice diario) con macro (valores puntuales)
│     ├─ Forward fill para datos mensuales
│     └─ Normalización Z-score
│
├─ calcular_correlacion_dinamica(ticker, ventana=60)
│  └─ Correlation rolling con índices principales
│     ├─ S&P 500, NASDAQ, Russell 2000
│     └─ Bondad predicativa: correlaciones estables > volátiles
│
├─ detectar_regimen_volatilidad(df, ventana=20)
│  └─ Clasifica en: HIGH (>20% vol anualizado)
│     ├─ MEDIUM (10-20%)
│     └─ LOW (<10%)
│
├─ calcular_beta_economico(ticker, macro_features)
│  └─ Regresión rolling: Δ_ticker ~ β * Δ_macro_factors
│     ├─ β > 1: Sensible a cambios económicos
│     └─ β < 1: Defensivo, independiente
│
├─ generar_senales_macro(df_macro)
│  └─ FLAGS booleanos:
│     ├─ recession_incoming (VIX > 20 AND TED > 50)
│     ├─ fed_tightening (tasa Fed aumentando)
│     ├─ credit_stress (TED spread > 100)
│     └─ liquidez_baja (volumen < media móvil)
│
└─ validar_prediccion_con_contexto(prediccion_modelo, contexto_macro)
   └─ Retorna: prediccion_ajustada = prediccion * factor_contexto
      ├─ Si recesión: reducir confianza (factor ↓ 0.7-0.9)
      ├─ Si expansión: aumentar (factor ↑ 1.0-1.1)
      └─ Si volatilidad alta: recentrar a neutral (factor → 0.5)
```

---

### 3. Nuevos Modelos de Base de Datos

#### `app/models/indicador_macroeconomico.py`
```python
# Almacena series FRED descargadas
# Permite trackear histórico y tendencias
# Optimizado para queries por fecha_rango
```

#### `app/models/datos_alpha_vantage.py`
```python
# Complemento a PrecioHistorico
# Datos intraday y métricas avanzadas
# JSON para extensibilidad futura
```

#### `app/models/feature_enriquecido.py`
```python
# Cache pre-calculado de features
# Evita recalcular cada vez
# Acelera entrenamiento 3-5x
```

---

### 4. Actualización del Motor de ML

#### Extensión de `app/ml/core/engine.py` (SIN romper existente)

```python
class FeatureEnricher:
    """Nueva clase que amplía MLEngine sin modificarlo"""
    
    @staticmethod
    def expandir_features(df_precio, df_macro=None):
        """
        Input:  DataFrame con 30+ features técnicos
        Output: DataFrame con 35-40 features (técnicos + macro)
        """
        if df_macro is not None:
            # Agregar indicadores macro
            df_expandido['Tasa_Federal'] = df_macro['DFF'].interpolate()
            df_expandido['VIX_Level'] = df_macro['VIXCLS'].interpolate()
            df_expandido['Desempleo'] = df_macro['UNRATE'].ffill()
            
            # Agregar señales compuestas
            df_expandido['Economic_Signal'] = calcular_señal_macro(df_macro)
            
        return df_expandido

# MLEngine.FEATURES expandido:
# Antes:  30 features técnicos
# Ahora:  30 técnicos + 4 macro + 2 compuestos = 36 features
```

---

### 5. Pipeline Enriquecido (Paralelo)

```
app/ml/pipeline_enriquecido/
├── __init__.py
├── data_processor.py
│   ├─ extraer_y_procesar_empresa_enriquecida()
│   └─ Usa FeatureEnricher automáticamente
│
├── trainer.py
│   ├─ Reutiliza PipelineTrainer base
│   └─ Umbral dinámico por régimen de volatilidad
│
└── orquestador.py
    ├─ entrenar_pipeline_lstm_enriquecido()
    ├─ entrenar_pipeline_cnn_enriquecido()
    └─ Idéntico a actual pero con features expandidos
```

**Ventaja**: Coexiste con pipeline actual. Ambos entrenan en paralelo.

---

### 6. Actualización de Procesos de Actualización

#### `app/auto/actualizar_datos_enriquecidos.py` (NUEVO)

```python
def ejecutar_actualizacion_enriquecida():
    """
    Orquesta la descarga de todos los datos en paralelo
    """
    # 1. yfinance (como siempre) ✅
    ejecutar_actualizacion_masiva()  # Existente
    
    # 2. AlphaVantage (nuevo, respetando rate limits)
    para cada_empresa:
        alpha_provider.fetch_daily_adjusted(ticker)  # 1 req cada 12 seg
        
    # 3. FRED (nuevo, una sola vez por serie)
    fred_provider.fetch_series('DFF', start_date, end_date)  # 1 req total
    fred_provider.fetch_series('UNRATE', start_date, end_date)
    fred_provider.fetch_series('VIXCLS', start_date, end_date)
    # ... más series
    
    # 4. Enriquecimiento (secuencial, paralelo por empresa)
    para cada_empresa:
        feature_enrichment_service.enriquecer_features_con_macro(
            df_precios[empresa],
            df_macro
        )

# Frecuencia de ejecución:
# - Precios: Diaria (como ahora)
# - AlphaVantage: Diaria (con rate limiting)
# - FRED: Semanal (datos semanales)
# - Enriquecimiento: Diaria
```

---

## 📈 Impacto Esperado

### 1. Reducción de Falsos Positivos

| Escenario | Problema Actual | Solución | Mejora |
|-----------|-----------------|----------|--------|
| **Rally en recesión** | ✗ Señal ALCISTA falsa | ✓ Detecta recession_incoming | ↓ 20-30% FP |
| **Sobrecompra ante caída Fed** | ✗ Sigue alcista | ✓ Beta económico β>1 = filtro | ↓ 10-15% FP |
| **Liquidez baja** | ✗ Señal ruidosa | ✓ Volumen < percentil 25 = descarta | ↓ 8-12% FP |
| **Volatilidad extrema** | ✗ Umbral fijo genera FP | ✓ Umbral dinámico por régimen | ↓ 12-18% FP |

**Total FP reduction: 15-25%**

---

### 2. Reducción de Falsos Negativos

| Escenario | Problema Actual | Solución | Mejora |
|-----------|-----------------|----------|--------|
| **Compra anticipada a caída Fed** | ✗ Señal llega tarde | ✓ Beta económico β<0 = anticipatory | ↑ 8-10% oportunidades |
| **Momentum en expansión económica** | ✗ Sin contexto | ✓ Economic_Signal=expansión amplifica | ↑ 5-8% |
| **Liquidez retornando** | ✗ Sin validación vol | ✓ Volumen > percentil 75 = validación | ↑ 6-9% |

**Total FN reduction: 10-15%**

---

### 3. Métricas Globales

```
BASELINE (Actual)
├─ Accuracy: ~72%
├─ Precision: ~68%
├─ Recall: ~65%
├─ F1-Score: ~66%
├─ AUC: ~0.75
└─ FP Rate: ~18%

ESPERADO (Con enriquecimiento)
├─ Accuracy: ~78% (+6%)
├─ Precision: ~73% (+5%)
├─ Recall: ~71% (+6%)
├─ F1-Score: ~72% (+6%) ← Métrica principal
├─ AUC: ~0.82 (+7%)
└─ FP Rate: ~12% (-6%) ← Reducción directa

IMPACTO EN PORTFOLIO
├─ Rentabilidad: +8-15% por reducción de drawdowns
├─ Sharpe Ratio: +12-18% (menos ruido = mejor riesgo-retorno)
└─ Máximo Drawdown: -15-20% (menos pérdidas por FP)
```

---

### 4. Beneficios Intangibles

- **Confianza en predicciones**: Decisiones basadas en contexto macroeconómico
- **Explicabilidad**: "ALCISTA porque PIB está creciendo, no solo RSI"
- **Adaptabilidad**: Modelos automáticamente ajustan umbral a condiciones
- **Escalabilidad**: Sistema listo para agregar más data sources (commodities, crypto, etc.)

---

## 🚀 Roadmap de Implementación

### Fase 1: Preparación (Semana 1)

**Tareas**:
- [ ] Obtener API keys (AlphaVantage free, FRED free)
- [ ] Crear modelos de BD (Alembic migrations)
- [ ] Documento de guías de desarrollo
- [ ] Setup de testing environment

**Tiempo**: 3-4 días  
**Recursos**: 1 Backend + 1 DevOps  
**Deliverables**: BD esquema, API keys, documentación

---

### Fase 2: Implementación de Proveedores (Semana 1-2)

**Sprint 2A: AlphaVantage Provider** (3-4 días)
- [ ] Implementar `alpha_vantage_provider.py`
- [ ] Sistema de caching local (SQLite)
- [ ] Rate limiting (5 req/min)
- [ ] Retry logic con backoff exponencial
- [ ] Unit tests (cobertura >90%)

**Sprint 2B: FRED Provider** (2-3 días)
- [ ] Implementar `fred_provider.py`
- [ ] Downloader de series históricas
- [ ] Sincronización de fechas
- [ ] Interpolación de datos
- [ ] Unit tests

**Tiempo**: 6-7 días  
**Recursos**: 2 Backend  
**Deliverables**: Proveedores funcionales y testeados

---

### Fase 3: Feature Engineering (Semana 2)

**Tareas**:
- [ ] Implementar `feature_enrichment_service.py`
  - [ ] Combinación de datos técnicos + macro
  - [ ] Cálculo de correlaciones dinámicas
  - [ ] Detección de regímenes de volatilidad
  - [ ] Cálculo de beta económico
  - [ ] Generación de señales macro
  
- [ ] Extender `engine.py` con FeatureEnricher
- [ ] Tests de integración
- [ ] Validación de datos

**Tiempo**: 4-5 días  
**Recursos**: 1 Backend + 1 Data Scientist  
**Deliverables**: Feature enrichment funcional, validación de features

---

### Fase 4: Pipeline Enriquecido (Semana 3)

**Tareas**:
- [ ] Crear `pipeline_enriquecido/data_processor.py`
- [ ] Crear `pipeline_enriquecido/trainer.py`
- [ ] Crear `pipeline_enriquecido/orquestador.py`
- [ ] Umbral dinámico por volatilidad
- [ ] Logging mejorado

**Tiempo**: 3-4 días  
**Recursos**: 1 Backend + 1 ML Engineer  
**Deliverables**: Pipeline funcional, listo para entrenamiento

---

### Fase 5: Entrenamiento y Validación (Semana 3-4)

**Tareas**:
- [ ] Entrenar LSTM v1/v2 enriquecido
- [ ] Entrenar CNN v3 enriquecido
- [ ] Comparar vs baseline (LSTM/CNN actuales)
- [ ] Análisis de mejoras por métrica
- [ ] A/B testing en backtesting

**Tiempo**: 4-5 días  
**Recursos**: 1 ML Engineer + GPU  
**Deliverables**: Modelos entrenados, reportes comparativos

---

### Fase 6: Documentación y Deployment (Semana 4)

**Tareas**:
- [ ] Documentar arquitectura
- [ ] Guías de mantenimiento
- [ ] Procedimientos de actualización
- [ ] Runbook de issues
- [ ] Deployment a producción

**Tiempo**: 2-3 días  
**Recursos**: 1 Backend + 1 DevOps  
**Deliverables**: Documentación, deployment scripts

---

### Timeline Resumido

```
Semana 1:  Preparación + AlphaVantage + FRED (50%)
Semana 2:  FRED (50%) + Feature Engineering
Semana 3:  Pipeline Enriquecido + Entrenamiento
Semana 4:  Validación + Documentación + Deployment

Total: 3-4 semanas
Equipo: 3-4 personas
Costo: $0 (APIs gratuitas)
```

---

## ⚙️ Consideraciones Técnicas

### 1. Rate Limiting

**AlphaVantage** (Free tier):
- Límite: 5 requests por minuto
- Solución: Cola de reintentos + caché local SQLite
- Implementación:
  ```python
  if requisitos_pendientes > 5:
      esperar = (requisitos_pendientes - 5) * 12 segundos
  ```

**FRED**:
- Límite: 120 requests por minuto
- Impacto: Negligible (solo ~10 series necesarias)
- Solución: Ejecutar una sola vez al inicio

---

### 2. Sincronización de Fechas

**Problema**: FRED datos mensuales, mercado datos diarios

**Solución**:
```python
# Opción 1: Forward fill (último valor conocido)
df_macro['Desempleo'].ffill()  # Mes 1: 4.5% todos los días

# Opción 2: Interpolación lineal (valores intermedios)
df_macro['PIB'].interpolate(method='linear')

# Opción 3: Búsqueda de fecha más cercana
fecha_macro = obtener_fecha_cercana(fecha_mercado, df_macro)
```

**Recomendación**: Forward fill para indicadores (desempleo no cambia diariamente)

---

### 3. Normalización de Features

**Problema**: Escalas incompatibles
- Precio: $100-$500
- VIX: 10-80
- Tasa Federal: 0-5%

**Solución**: RobustScaler (ya usado en código)
```python
from sklearn.preprocessing import RobustScaler

scaler = RobustScaler()
features_normalizados = scaler.fit_transform(df_features)
```

---

### 4. Validación de Datos

Antes de usar:
- ✅ No NaNs (después de interpolación)
- ✅ No outliers extremos (>3σ)
- ✅ Correlación con features existentes (<0.95)
- ✅ Datos en rango esperado (VIX: 10-80, Tasa: 0-5%)

---

### 5. Versionamiento de Features

```
app/ml/core/
├── engine.py
│   └── FEATURES v1 (30 indicadores técnicos)
│
├── feature_enricher.py
│   ├── FEATURES_EXPANDED v1 (30 + 4 macro)
│   └── FEATURES_EXPANDED v2 (30 + 6 macro + 2 compuestos)
│
└── models/
    ├── modelo_v1_baseline.pth
    ├── modelo_v1_enriquecido.pth
    └── modelo_v2_enriquecido.pth
```

**Importancia**: MLEngine debe saber qué version de features usa cada modelo

---

## ⚠️ Análisis de Riesgo

### Riesgo 1: Cambio de API AlphaVantage
**Probabilidad**: Media  
**Impacto**: Alto (ruptura de descarga)  
**Mitigación**: 
- [ ] Fallback a yfinance
- [ ] Documentar cambios de API
- [ ] Testing automático de conectividad

---

### Riesgo 2: Datos FRED Retrasados
**Probabilidad**: Alta (FRED publica mensualmente)  
**Impacto**: Medio (predicciones con lag)  
**Mitigación**:
- [ ] Forward fill asegura continuidad
- [ ] Usar últimos datos disponibles
- [ ] Documentar lags esperados

---

### Riesgo 3: Sobrefitting a Datos Macro
**Probabilidad**: Media  
**Impacto**: Alto (modelo aprende correlaciones pasadas)  
**Mitigación**:
- [ ] Validación cruzada con datos no usados
- [ ] Walk-forward testing
- [ ] Monitoring de performance en producción

---

### Riesgo 4: Incompatibilidad con Modelos Actuales
**Probabilidad**: Baja (arquitectura paralela)  
**Impacto**: Crítico (ruptura de sistema)  
**Mitigación**:
- [ ] Coexistencia garantizada (modelos antiguos intactos)
- [ ] Tests de regresión
- [ ] Canary deployment antes de full rollout

---

### Riesgo 5: Aumento de Complejidad
**Probabilidad**: Alta  
**Impacto**: Medio (difícil mantenimiento)  
**Mitigación**:
- [ ] Documentación exhaustiva
- [ ] Modularización clara
- [ ] Logging detallado para debugging

---

## ✅ Criterios de Éxito

- [ ] **Técnico**: F1-Score mejora >5%, FP reduce 15-25%
- [ ] **Performance**: Tiempo de entrenamiento <2x actual
- [ ] **Confiabilidad**: 99.9% uptime en actualizaciones
- [ ] **Mantenibilidad**: Documentación completa, tests >85%
- [ ] **Escalabilidad**: Agregar nueva fuente datos en <1 día

---

## 📚 Dependencias Nuevas

```
alpha-vantage==2.3.1          # Datos técnicos avanzados
fred==1.3.0                   # Federal Reserve Economic Data
requests==2.31.0              # HTTP requests con retry
python-dateutil==2.8.2        # Manejo de fechas
```

**Instalación**:
```bash
pip install alpha-vantage fred requests python-dateutil
```

---

## 🎓 Ventajas de Este Enfoque

| Ventaja | Descripción |
|---------|-------------|
| ✅ **Backward Compatible** | Código actual funciona exactamente igual |
| ✅ **Reutilización** | Usa clases/métodos existentes (PipelineTrainer, etc.) |
| ✅ **Modular** | Cada componente independiente, fácil de testear |
| ✅ **Escalable** | Agregar más data sources (crypto, commodities, etc.) |
| ✅ **Reversible** | Si no mejora, se puede desactivar |
| ✅ **Sin costo** | APIs gratuitas (AlphaVantage free, FRED libre) |
| ✅ **Profesional** | Arquitectura utilizada en fondos cuantitativos reales |

---

## 📞 Próximos Pasos

### Aprobación Ejecutiva
- [ ] Revisión de este documento
- [ ] Aprobación de roadmap
- [ ] Asignación de recursos

### Kick-off Técnico
- [ ] Meeting con equipo de desarrollo
- [ ] Asignación de tareas
- [ ] Setup de repositorio y CI/CD

### Inicio de Desarrollo
- [ ] Fase 1: Preparación (Semana 1)
- [ ] Fase 2: Proveedores (Semana 1-2)
- [ ] Fase 3: Feature Engineering (Semana 2)

---

## 📝 Preguntas Frecuentes

**P: ¿Rompe esto el código actual?**  
R: No. Arquitectura paralela, modelos antiguos intactos.

**P: ¿Cuánto cuesta?**  
R: $0. APIs completamente gratuitas (AlphaVantage free tier, FRED abierto).

**P: ¿Cuánto tiempo de desarrollo?**  
R: 3-4 semanas con equipo de 3-4 personas.

**P: ¿Qué si AlphaVantage cae?**  
R: Fallback automático a yfinance, sin interrumpir entrenamiento.

**P: ¿Se puede volver atrás si no mejora?**  
R: Sí. Mantener ambos pipelines, comparar métricas.

**P: ¿Mejora la latencia de predicción?**  
R: No significativamente. Features calculados offline, predicción igual de rápida.

---

## 👥 Contacto

**Propuesta preparada por**: [Tu nombre]  
**Fecha**: Abril 2026  
**Versión**: 1.0

---

**Apéndice: Referencias**
- AlphaVantage Docs: https://www.alphavantage.co/documentation/
- FRED API: https://fred.stlouisfed.org/docs/api/
- Technical Indicators: https://www.investopedia.com/
- Macroeconomic Context: Federal Reserve Economic Data (FRED)

