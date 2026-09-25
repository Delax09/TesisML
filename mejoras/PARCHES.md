# Parches puntuales

Cambios pequeños y de bajo riesgo. Cada uno indica el archivo, el motivo y el reemplazo.

---

## 1. Las métricas reportadas no corresponden al modelo guardado

**Archivo:** `app/ml/pipeline_lstm/orquestador.py` (y su gemelo en `pipeline_cnn/`)

Se guardan los pesos del early stopping pero se evalúa `modelo_pt`, que todavía
tiene los pesos de la **última** época. Los tres números que van a la tesis
(métricas, umbral, pesos) vienen de dos modelos distintos.

```python
resultado_entrenamiento = ejecutar_entrenamiento_lstm(modelo_pt, train_loader, val_loader, device)
mejores_pesos = resultado_entrenamiento["pesos"]

# ── AÑADIR: cargar los mejores pesos ANTES de evaluar ──
modelo_pt.load_state_dict(mejores_pesos)
modelo_pt.eval()

# El umbral debe calcularse con los mismos pesos que se van a guardar
umbral_optimo = trainer_lstm.optimizar_umbral_decision(modelo_pt, val_loader, device)

metricas = evaluar_modelo_lstm(modelo_pt, val_loader, device, umbral_decision=umbral_optimo)
```

Y en `pipeline_trainer.py`, dentro de `ejecutar_entrenamiento`, el umbral final se
calcula sobre `model` (última época). Reemplazar el bloque final por:

```python
if mejor_modelo is None:
    mejor_modelo = {k: v.cpu().clone() for k, v in model.state_dict().items()}

# Restaurar antes de calcular el umbral final
model.load_state_dict(mejor_modelo)
umbral_final = self.optimizar_umbral_decision(model, val_loader, device)
```

Nota adicional: `mejor_modelo = early_stopping.mejores_pesos` está **después** del
`if early_stopping.detener: break`, así que al dispararse el early stopping se pierde
la última asignación. Mueve esa línea justo antes del `if`.

---

## 2. El umbral y el scaler se cargan de una versión que puede no ser la del modelo

**Archivo:** `app/ml/core/engine.py`

Hoy `_inicializar_recursos` carga siempre `models/scaler.pkl` (global, sobreescrito por
el último pipeline que corra, sea LSTM o CNN) y `_cargar_umbral_optimo` busca la carpeta
de versión más reciente por orden alfabético. Modelo, scaler y umbral pueden venir de
tres entrenamientos distintos.

Guarda un puntero explícito a la versión activa y carga los tres artefactos juntos:

```python
def _inicializar_recursos(self):
    base_dir = Path(__file__).resolve().parent.parent
    puntero = base_dir / "models" / f"ACTIVO_{self.version}.json"

    if not puntero.exists():
        logger.error("No hay version activa para %s. Ejecuta el entrenamiento.", self.version)
        return

    version_id = json.loads(puntero.read_text(encoding="utf-8"))["version_id"]
    version_dir = base_dir / "models" / "versiones" / version_id

    metadata = json.loads((version_dir / "metadata.json").read_text(encoding="utf-8"))

    # Contrato: la configuración de inferencia sale del metadata, no de constantes
    # de clase. Si el modelo se entrenó con 60 días de memoria, inferir con 90 rompe.
    self.dias_memoria = metadata["config"]["dias_memoria"]
    self.features = metadata["config"]["features"]
    self.umbral = metadata["metricas"]["umbral_optimo"]

    self.scaler = joblib.load(version_dir / "scaler.pkl")   # el scaler DE ESA versión
    self.model = self._construir_arquitectura(len(self.features), self.dias_memoria)
    # strict=True: si la arquitectura no coincide debe FALLAR, no cargar pesos a medias
    self.model.load_state_dict(
        torch.load(version_dir / "model.pth", map_location=self.device, weights_only=True),
        strict=True,
    )
    self.model.eval()
```

Y en `model_versioning.py`, guardar la configuración completa en el metadata (hoy no
está, y sin ella el entrenamiento no es reproducible):

```python
metadata = {
    "version_id": version_id,
    ...
    "config": {
        "dias_memoria": MLEngine.DIAS_MEMORIA_IA,
        "dias_prediccion": MLEngine.DIAS_PREDICCION,
        "features": list(MLEngine.FEATURES),
        "umbral_clase": 0.005,
        "balance_method": MLEngine.BALANCE_METHOD,
        "seed": 42,
        "epochs": epochs,
        "lr": 0.001,
        "fecha_fin_train": fecha_fin_train,
        "fecha_fin_val": fecha_fin_val,
    },
    "entorno": {
        "python": sys.version.split()[0],
        "torch": torch.__version__,
        "commit_git": subprocess.getoutput("git rev-parse --short HEAD"),
    },
    "archivos": {
        # PurePosixPath: los metadatos actuales tienen "versiones\\LSTM_v1..." y
        # esas rutas se rompen en el servidor Linux
        "modelo": PurePosixPath(model_path.relative_to(self.base_path)).as_posix(),
        "scaler": PurePosixPath(scaler_path.relative_to(self.base_path)).as_posix(),
    },
}
```

---

## 3. `NewsSentiment` vale siempre 0.5 en producción

**Archivo:** `app/auto/generar_predicciones.py`

El DataFrame de inferencia se arma sin fechas, así que queda con `RangeIndex` 0..149.
Dentro de `_agregar_feature_sentimiento`, `pd.to_datetime(0)` devuelve 1970-01-01,
ninguna noticia cae en esa ventana y el feature queda constante. En entrenamiento sí
hay fechas, así que el modelo aprendió con una feature que en producción no existe.

```python
df = pd.DataFrame([{
    'Fecha': p.Fecha,                     # ← FALTA
    'Close': float(p.PrecioCierre),
    'Volume': float(p.Volumen),
    'High': float(p.PrecioMaximo if p.PrecioMaximo else p.PrecioCierre),
    'Low': float(p.PrecioMinimo if p.PrecioMinimo else p.PrecioCierre),
} for p in reversed(precios)])
df['Fecha'] = pd.to_datetime(df['Fecha'])
df = df.set_index('Fecha').sort_index()
```

Y en `engine.py`, añadir una guarda que falle en vez de degradarse en silencio:

```python
if not isinstance(df.index, pd.DatetimeIndex):
    raise TypeError("calcular_indicadores requiere DatetimeIndex para unir noticias.")
```

Aparte, el join de sentimiento recorre el índice fila por fila (`for idx in df.index`)
haciendo un filtrado de pandas por iteración. Reemplázalo por un `merge_asof`, que es
la operación correcta para uniones point-in-time:

```python
diario = sent_df.set_index('fecha')['score'].resample('D').mean()
media_7d = diario.rolling('7D', min_periods=1).mean()
df['NewsSentiment'] = pd.merge_asof(
    df.sort_index(), media_7d.rename('NewsSentiment').sort_index(),
    left_index=True, right_index=True, direction='backward',
)['NewsSentiment'].fillna(0.5).clip(0, 1)
```

**Importante para la tesis:** solo tienes noticias de fechas recientes. Durante el
entrenamiento la feature es 0.5 constante en todo el historial antiguo y solo varía al
final. Eso es una distribución que cambia dentro del propio dataset. O consigues
histórico de noticias que cubra todo el periodo, o sacas la feature del modelo y la
usas únicamente como capa informativa en el dashboard. Reportar ambas opciones y por
qué elegiste una es material de tesis.

---

## 4. La IA se apaga sola en producción

**Archivo:** `app/main.py`

```python
try:
    import torch
    import tensorflow as tf   # ← TensorFlow NO está en requirement.txt ni se usa
    import joblib
    IA_AVAILABLE = True
except ImportError:
    IA_AVAILABLE = False
```

En cualquier instalación limpia el import de TF falla, `IA_AVAILABLE` queda en `False`
y la app imprime "Modo Producción: IA desactivada". Elimina la línea de TensorFlow.

Además, el bloque `lifespan` carga `modelo_acciones_v1/v2/v3.pth` en `app.state` con
`torch.load()` sin `weights_only=True`, pero **nadie usa `app.state.model_*`**: el
`MLEngine` carga sus propios pesos. Es código muerto que duplica memoria. Bórralo o
conviértelo en una caché real de instancias de `MLEngine`:

```python
app.state.engines = {v: MLEngine(version=v) for v in ("v1", "v2", "v3", "v4")}
```

---

## 5. Sanitización que borra la señal y filtra estadísticas globales

**Archivo:** `app/ml/core/data_validation.py`, método `sanitizar_datos`

```python
for col in df.select_dtypes(include=[np.number]):
    mean = df[col].mean()      # ← media de TODA la serie, incluido el futuro
    std = df[col].std()
    df[col] = df[col].clip(mean - 3*std, mean + 3*std)
```

Dos problemas: (a) usa estadísticas de la serie completa, incluidos días posteriores al
punto de decisión; (b) recortar `Close` a ±3σ del historial completo aplasta las
tendencias, que son justamente lo que el modelo debería aprender. Y se ejecuta dos veces
(antes y después de calcular indicadores).

Recorta solo los indicadores acotados, con ventana móvil y nunca los precios:

```python
COLUMNAS_NO_RECORTABLES = {"Close", "Open", "High", "Low", "Volume", "SMA20", "BB_Upper", "BB_Lower"}

for col in df.select_dtypes(include=[np.number]):
    if col in COLUMNAS_NO_RECORTABLES:
        continue
    med = df[col].expanding(min_periods=60).median()      # solo pasado
    mad = (df[col] - med).abs().expanding(min_periods=60).median()
    df[col] = df[col].clip(med - 5 * mad, med + 5 * mad)
```

También sustituye el `.bfill()` global: rellenar hacia atrás mete valores futuros en las
primeras filas. Descarta el warm-up en su lugar:

```python
df = df.ffill().iloc[60:]   # los primeros 60 días no tienen indicadores válidos
```

---

## 6. El falso ADX

**Archivo:** `app/ml/core/engine.py`

```python
df_clean['ADX'] = df_clean['ATR'].rolling(window=14).mean()   # esto es un ATR suavizado
```

Está en `FEATURES` como si midiera fuerza de tendencia, y es casi colineal con `ATR`.
O lo calculas bien (con +DI/−DI y el índice direccional), o lo sacas de `FEATURES` y lo
dices en la tesis. Lo que no puedes es dejar la etiqueta puesta.

```python
def _adx(df, period=14):
    up = df['High'].diff()
    down = -df['Low'].diff()
    plus_dm  = np.where((up > down) & (up > 0), up, 0.0)
    minus_dm = np.where((down > up) & (down > 0), down, 0.0)
    tr = pd.concat([
        df['High'] - df['Low'],
        (df['High'] - df['Close'].shift()).abs(),
        (df['Low'] - df['Close'].shift()).abs(),
    ], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    plus_di  = 100 * pd.Series(plus_dm,  index=df.index).ewm(alpha=1/period, adjust=False).mean() / atr.clip(lower=1e-9)
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1/period, adjust=False).mean() / atr.clip(lower=1e-9)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).clip(lower=1e-9)
    return dx.ewm(alpha=1/period, adjust=False).mean()
```

---

## 7. Features no estacionarios

**Archivo:** `app/ml/core/engine.py`, lista `FEATURES`

`Close`, `SMA20`, `BB_Upper`, `BB_Lower` y `ATR` son niveles de precio. Aunque el scaler
por activo ya ayuda, un nivel de precio nunca visto (NVDA a 180 tras entrenar hasta 40)
queda fuera de rango igual. Conviértelos a magnitudes relativas y sin unidades:

```python
FEATURES = [
    'LogReturn',
    'RSI',
    'MACD_norm',          # MACD / Close
    'Z_Score',            # ya es relativo
    'ATR_pct',            # ATR / Close
    'Volatilidad_10d',
    'CMF',
    'ADX',                # el real
    'Volumen_rel',        # Volume / media móvil 20d del volumen
    'Dist_SMA20',         # (Close - SMA20) / SMA20
    'Ancho_BB',           # (BB_Upper - BB_Lower) / SMA20
]
```

Todas son adimensionales, comparables entre AAPL, FALABELLA.SN y BTC-USD, y estables en
el tiempo. `Close` y `Volume` crudos salen de la lista.

---

## 8. Definición del objetivo

**Archivo:** `app/ml/core/engine.py`

`log_ret > 0.005` a 21 días mete "cayó 30%" y "subió 0.4%" en la misma clase negativa.
Y 0.5% fijo significa algo muy distinto para una utility que para BTC. Dos alternativas,
elige una y justifícala:

```python
# Opción A: umbral ajustado por volatilidad (recomendada)
umbral_dinamico = 0.5 * df['ATR_pct'].to_numpy()[idx_hoy] * np.sqrt(dias_prediccion)
y_clf = (log_ret > umbral_dinamico).astype(np.float32)

# Opción B: tres clases con zona neutra explícita
#   -1 BAJISTA (< -u), 0 NEUTRO (entre -u y u), 1 ALCISTA (> u)
```

La opción B encaja además con las tres recomendaciones que ya muestra el dashboard
(ALCISTA / MANTENER / BAJISTA), que hoy se derivan de un clasificador binario mediante
dos umbrales inventados (`UMBRAL_BAJISTA = 1 - umbral`).

---

## 9. Configuración y seguridad

**`app/core/config.py`**

```python
CORS_ORIGINS: List[str] = ["*"]   # con allow_credentials=True esto es inválido
```

Un origen comodín junto a `allow_credentials=True` es rechazado por los navegadores y,
peor, si se resuelve mal expone las cookies de sesión. Además, los middlewares de CSRF y
cabeceras de seguridad solo se activan si `ENVIRONMENT != "development"`: un `.env` mal
copiado deja la API desnuda. Invierte el default.

```python
ENVIRONMENT: str = "production"          # el default seguro es producción
CORS_ORIGINS: List[str] = ["http://localhost:3000"]

@field_validator("CORS_ORIGINS")
@classmethod
def no_comodin_en_produccion(cls, v, info):
    if info.data.get("ENVIRONMENT") == "production" and "*" in v:
        raise ValueError("CORS_ORIGINS no puede ser '*' en producción")
    return v

@field_validator("SECRET_KEY")
@classmethod
def clave_suficiente(cls, v):
    if len(v) < 32:
        raise ValueError("SECRET_KEY debe tener al menos 32 caracteres")
    return v
```

En `main.py`, aplica los middlewares de seguridad siempre y deja solo Swagger detrás del
flag de desarrollo.

---

## 10. Reproducibilidad del repositorio

**`.gitignore` de la raíz** está guardado en **UTF-16**, así que git no interpreta el
patrón `.env`. Vuelve a guardarlo en UTF-8 sin BOM:

```bash
printf '.env\n*.env\nml-backend/data/\nml-backend/app/ml/models/versiones/\nlogs/\n__pycache__/\n' > .gitignore
```

**Dependencias sin fijar.** Todo con `>=` y sin lockfile: nadie puede reproducir tus
resultados, ni siquiera tú dentro de seis meses. Además `requirement.txt` incluye
`pipeline` (paquete equivocado) y `transformers` duplicado, y `requirements-prod.txt`
**no incluye torch ni scikit-learn** pese a que el backend hace inferencia.

```bash
pip install pip-tools
# requirements.in con las dependencias directas y sus rangos
pip-compile requirements.in -o requirements.txt --generate-hashes
```

**49 MB de CSV y binarios `.pth` versionados**, y `app/ml/models/versiones` está en
`.gitignore` pero ya estaba trackeado (el ignore no aplica a archivos ya seguidos):

```bash
git rm -r --cached ml-backend/data ml-backend/app/ml/models/versiones
# y para los artefactos que sí quieres conservar:
git lfs track "*.pth" "*.pkl"
```

**Semillas.** No hay ninguna fijada. Añade al inicio del entrenamiento:

```python
def fijar_semilla(seed=42):
    import random, os
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    os.environ["PYTHONHASHSEED"] = str(seed)
```

**CI sin control de calidad.** Los workflows despliegan pero no corren nada. Añade antes
del deploy:

```yaml
- name: Tests
  run: |
    pip install -r ml-backend/requirements.txt pytest
    pytest ml-backend/tests/ -v
```

Y quita `StrictHostKeyChecking=no` del rsync (usa `ssh-keyscan` con la huella fijada) y
cambia `npm install` por `npm ci`. El parcheo del bundle con `sed` sobra: ya tienes
`VITE_API_URL` en el `.env` del frontend, úsalo en el build.

---

## 11. Lo que ve el usuario

Con AUC ≈ 0.51, el dashboard muestra "ALCISTA" con un campo `confianza` en porcentaje que
es la salida cruda de una sigmoide. En `engine.py`:

```python
"confianza": float(probabilidad_alcista * 100 if score == 1 else (1 - probabilidad_alcista) * 100),
```

Eso no es confianza: es una probabilidad sin calibrar. Calíbrala y mídelo:

```python
from sklearn.calibration import CalibratedClassifierCV   # o calibración isotónica manual
# y reporta Brier score + curva de calibración en la tesis
```

Mientras el AUC no supere de forma consistente a los baselines, el dashboard debería
mostrar el resultado del backtest junto a cada recomendación (acierto histórico real,
retorno medio, drawdown) y un aviso visible de que no es asesoría de inversión. Presentar
la incertidumbre honestamente suma en una defensa; ocultarla detrás de un porcentaje
grande es lo que va a generar preguntas incómodas.
