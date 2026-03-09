# NeuroCampus

MVP para analizar evaluaciones estudiantiles con **FastAPI (backend)**, **RBM Student** y **NLP (BETO)**.  
Incluye pipeline de preprocesamiento, entrenamiento y endpoints de predicción (**/predicciones/predict** resuelve/valida el bundle por defecto y puede ejecutar inferencia real cuando `do_inference=true`).

---

## Requisitos

- Python 3.10+ (recomendado 3.10–3.12)
- Node 18+ (frontend)
- Git Bash / WSL (Windows) o shell POSIX
- Dependencias Python (backend):
  - `torch`, `transformers`, `pandas`, `pyarrow`, `fastapi`, `uvicorn`, `scikit-learn`, `scipy` (para el reporte)

> **Windows (Git Bash):** usa **comillas simples** en `printf`/`echo` para evitar `event not found` por `!`.

---

## Estructura de carpetas (resumen)

```
backend/
  src/neurocampus/  # Lógica central del sistema
    app/            # FastAPI, routers, pipelines y jobs CLI
    models/         # Estrategias RBM, entrenamiento de modelos
    prediction/     # Fachada de predicción
    services/nlp/   # Preprocesamiento y teacher (BETO)
config/             # Configuraciones (e.g. auditoría y búsqueda de hiperparámetros)
scripts/            # Scripts utilitarios (train models, smoke tests, simuladores)
frontend/           # Aplicación web (Vite + React + TS + Tailwind)
tests/              # Pruebas automatizadas (unitarias y API)
docs/               # Documentación y diagramas
schemas/            # JSON schemas
examples/           # Ejemplos versionables y dummy (reportes)

# Carpetas generadas (NO versionadas)
artifacts/          # Trabajos (jobs), champions (modelos activos), reportes
data/               # Datasets estandarizados y etiquetados
```

---

## Guía de Arquitectura

El sistema está dividido en dos grandes bloques:
- **Backend (FastAPI)**: Orquesta la carga de datos, el procesamiento de Procesamiento de Lenguaje Natural (PLN) utilizando el modelo BETO pre-entrenado y las estrategias de modelado de Machine Learning, principalmente focalizadas en Máquinas de Boltzmann Restringidas (RBM).
- **Frontend (Vite + React)**: Provee una interfaz gráfica de usuario para subir datasets, iniciar y monitorear trabajos de preparación, y visualizar las métricas y reportes del modelo "champion".
- **Scripts y Herramientas**: Utilidades en `scripts/` para ejecutar entrenamientos sin servidor, limpiar la carpeta temporal de artefactos y preparar ejecuciones de validación cruzada.

Para una exploración profunda teórica de los modelos y del ecosistema de ML empleado, revisar la carpeta `/docs`.

---

## Setup rápido

### 1) Backend

```bash
# Linux/macOS
python -m venv .venv && source .venv/bin/activate
# Windows PowerShell
# python -m venv .venv ; .\.venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt
```

Crea ignores para artefactos:

```bash
mkdir -p artifacts/{jobs,champions,reports}
printf '*\n!.gitkeep\n' > artifacts/jobs/.gitignore
printf '*\n!.gitkeep\n' > artifacts/champions/.gitignore
printf '*\n!.gitkeep\n' > artifacts/reports/.gitignore
touch artifacts/jobs/.gitkeep artifacts/champions/.gitkeep artifacts/reports/.gitkeep
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Pipeline de datos (end-to-end)

> Todos los comandos asumen que ejecutas desde la **raíz del repo**.  
> Cuando uses módulos Python, define `PYTHONPATH="$PWD/backend/src"`.

### A) Cargar CSV crudo → parquet estandarizado

Convierte tu CSV de evaluaciones a un parquet con:
- `comentario`
- `calif_1..calif_10` (solo columnas `pregunta_1..10` o `pregunta 1..10`)
- (opcional) metadatos que quieras preservar

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.app.jobs.cmd_cargar_dataset   --in examples/Evaluacion.csv   --out data/processed/evaluaciones_2025.parquet   --meta-list "codigo_materia,docente,grupo,periodo"
```

> El cargador admite nombres de pregunta con **espacio o guion bajo** (ej. `pregunta 1` / `pregunta_1`).

### B) Preprocesamiento + BETO (teacher)

Limpia, lematiza y etiqueta con **BETO** (modo **probs** recomendado).  
Filtra por número mínimo de tokens y aplica “gating” por confianza.

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.app.jobs.cmd_preprocesar_beto   --in data/processed/evaluaciones_2025.parquet   --out data/labeled/evaluaciones_2025_beto.parquet   --beto-mode probs   --threshold 0.90 --margin 0.25 --neu-min 0.90   --min-tokens 1
```

Genera un subset **texto-válido** (aceptado por el teacher):

```bash
python - <<'PY'
import pandas as pd
df = pd.read_parquet("data/labeled/evaluaciones_2025_beto.parquet")
df[(df["has_text"]==1) & (df["accepted_by_teacher"]==1)]   .to_parquet("data/labeled/evaluaciones_2025_beto_textonly.parquet", index=False)
print("OK -> data/labeled/evaluaciones_2025_beto_textonly.parquet")
PY
```

### C) Entrenamiento RBM (Student)

Modelo recomendado (estable actual): **texto + num**, `minmax`, 100 épocas.

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.models.train_rbm   --type general   --data data/labeled/evaluaciones_2025_beto_textonly.parquet   --job-id auto   --seed 42   --epochs 100 --n-hidden 64   --cd-k 1 --epochs-rbm 1   --batch-size 128   --lr-rbm 5e-3 --lr-head 1e-2   --scale-mode minmax   --use-text-probs
```

El job crea una carpeta `artifacts/jobs/<JOB_ID>` con:
- `vectorizer.json`, `rbm.pt`, `head.pt`
- `job_meta.json`, `metrics.json`

### D) Promover “champion” (vía API)

En el backend actual, el “champion” se guarda como:

- `artifacts/champions/<family>/<dataset_id>/champion.json`

Para promover un run existente a champion usa:

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/champion/promote" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "<dataset_id>",
    "family": "<family>",
    "model_name": "<model_name>",
    "run_id": "<run_id>"
  }'
```

> Nota: `model_name` puede ser el nombre del modelo (p.ej. `rbm_general`) y `run_id` es el generado por el entrenamiento.

Opcional (si necesitas cambiar la ruta base de artifacts):
- `NC_ARTIFACTS_DIR=/ruta/a/artifacts`

---

## Backend (FastAPI)

Levanta el API:

```bash
uvicorn neurocampus.app.main:app --reload --app-dir backend/src
# Docs en: http://127.0.0.1:8000/docs
```

### Predicciones (resolve/validate + inferencia opcional)

La pestaña **Predicciones** del frontend opera actualmente sobre la family `score_docente`.
El backend expone dos capas de uso:

- **Endpoints especializados de la pestaña**: listados de datasets/docentes/materias, predicción individual y batch.
- **Endpoint unificado `/predicciones/predict`**: resuelve el `run_id` (directo o por champion), valida el bundle y puede ejecutar inferencia sobre el feature-pack cuando `do_inference=true`.

**Health:**
```bash
curl -s "http://127.0.0.1:8000/predicciones/health"
```

**Resolver/validar por run_id (sin inferencia):**
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/predict" \
  -H "Content-Type: application/json" \
  -d '{ "run_id": "<run_id>" }'
```

**Resolver/validar por champion (sin inferencia):**
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/predict" \
  -H "Content-Type: application/json" \
  -d '{ "use_champion": true, "dataset_id": "<dataset_id>", "family": "score_docente" }'
```

**Inferir sobre feature-pack y persistir salida:**
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "use_champion": true,
    "dataset_id": "<dataset_id>",
    "family": "score_docente",
    "do_inference": true,
    "persist": true,
    "limit": 50
  }'
```

**Predicción individual de un par docente–materia:**
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/individual" \
  -H "Content-Type: application/json" \
  -d '{ "dataset_id": "<dataset_id>", "teacher_key": "<teacher_key>", "materia_key": "<materia_key>" }'
```

**Batch con polling:**
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/batch/run" \
  -H "Content-Type: application/json" \
  -d '{ "dataset_id": "<dataset_id>" }'

curl -s "http://127.0.0.1:8000/predicciones/batch/<job_id>"
```

Códigos esperados:
- `200`: bundle resuelto y válido; si `do_inference=true`, incluye `predictions` y opcionalmente `predictions_uri`.
- `202`: job batch aceptado para ejecución asíncrona.
- `404`: champion no existe, el run no existe o faltan artifacts requeridos.
- `422`: predictor no listo, request inválido o se pidió `persist=true` sin `do_inference=true`.

---

## Reporte “¿le irá bien?” por (docente/materia/grupo)

Job batch que agrega por columnas de grupo (usa `sentiment_label_teacher` o `p_pos`):

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.app.jobs.cmd_score_docente   --in data/labeled/evaluaciones_2025_beto.parquet   --out artifacts/reports/docente_score.parquet   --group-cols "codigo materia,grupo"   --pos-th 0.55 --alpha 0.05 --mix-w 0.4
```

Salida (parquet) con:
- `n`, `pos_count`, `pct_pos`, `pct_pos_lo/hi` (Jeffreys CI),
- medias `calif_*_mean`, `prob_bueno_pct` (score combinado 0–100).

> Para versionar ejemplos sin datos reales, copia un **dummy** a `examples/reports/`.

---

## Buenas prácticas de Git

Ignora artefactos/datos reales y caches:

```
**/__pycache__/
.venv/
.env
artifacts/*
!artifacts/**/.gitkeep
!artifacts/**/.gitignore
data/**/*.parquet
data/**/*.csv
frontend/node_modules/
```

> Versiona **solo** ejemplos sintéticos (`examples/`), código y documentación.

---

## Solución de problemas (rápido)

- **Git Bash**: usa comillas **simples** en `printf '*
!.gitkeep
'`.
- **Rutas**: ejecuta desde la **raíz**. Si estás en subcarpetas, usa rutas relativas correctas.
- **HuggingFace symlinks (warning)** en Windows: es solo aviso; funciona con caché “degradada”.
- **422 “Field required: input”**: el body del endpoint debe ir envuelto en `{"input": {...}}`.
- **Pocos comentarios útiles**: sube `--min-tokens`, ajusta `threshold/margin/neu-min` o entrena con `--use-text-probs`.

---

## Roadmap corto

- Random Search 3-fold para hparams (15–25 trials).
- Exponer reportes en UI (ranking por `prob_bueno_pct`).
- Endpoint “batch” con subida de CSV y barra de progreso.
- Dockerización (backend y volumen de `artifacts/`).

---