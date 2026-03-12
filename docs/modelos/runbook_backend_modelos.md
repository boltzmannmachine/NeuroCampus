# Runbook Backend — Modelos

Este runbook describe cómo operar, verificar y diagnosticar el backend del módulo
**Modelos** sin depender del frontend.

Su objetivo es facilitar pruebas manuales, smoke tests y resolución de fallos en
los flujos de:

- descubrimiento de datasets;
- verificación de readiness;
- construcción de feature-pack;
- entrenamiento;
- sweep;
- consulta de runs;
- promoción y consulta de champion.

---

## Alcance real del módulo

En la versión actual de NeuroCampus, el router `/modelos` cubre dos familias de
trabajo:

- `sentiment_desempeno`
- `score_docente`

Y expone operaciones para:

- detectar datasets disponibles en el filesystem;
- verificar artefactos mínimos requeridos;
- preparar `feature-pack`;
- lanzar entrenamientos en background;
- consultar estado de jobs;
- ejecutar sweep de modelos;
- inspeccionar runs persistidos;
- promover y consultar el champion vigente.

---

## Prerrequisitos

- Python instalado y entorno virtual activo.
- Dependencias del backend instaladas.
- Ejecución desde la raíz del repo o con rutas coherentes.

Variables de entorno relevantes:

- `NC_ARTIFACTS_DIR`
  - directorio físico donde se escriben artefactos;
  - si no se define, se usa `<repo>/artifacts`.
- `NC_PROJECT_ROOT`
  - raíz del repo si se ejecuta desde un `cwd` no estándar.

---

## Estructura de artefactos relevante

### Datasets y datos intermedios

- `datasets/<dataset_id>.parquet|csv`
- `data/processed/<dataset_id>.parquet|csv`
- `data/labeled/<dataset_id>_beto.parquet`
- `historico/unificado_labeled.parquet`

### Feature-pack

- `artifacts/features/<dataset_id>/train_matrix.parquet`
- `artifacts/features/<dataset_id>/pair_matrix.parquet`
- `artifacts/features/<dataset_id>/meta.json`
- `artifacts/features/<dataset_id>/pair_meta.json`

### Runs y champion

- `artifacts/runs/<run_id>/`
- `artifacts/champions/<family>/<dataset_id>/champion.json`
- `artifacts/sweeps/<sweep_id>/summary.json` (si aplica)

---

## Gates recomendados

Desde la raíz del repo:

```bash
make lint
make be-test
make be-ci
```

Si solo quieres validar backend antes de tocar entrenamiento:

```bash
make be-test
```

---

## Levantar backend

```bash
uvicorn neurocampus.app.main:app --reload --app-dir backend/src
```

Si necesitas validar imports rápidamente:

```bash
PYTHONPATH=backend/src python -c "import neurocampus; print('ok')"
```

---

## Endpoints clave del router `/modelos`

### Descubrimiento y readiness

- `GET /modelos/datasets`
- `GET /modelos/readiness?dataset_id=...`

### Preparación de artefactos

- `POST /modelos/feature-pack/prepare`

### Entrenamiento y sweep

- `POST /modelos/entrenar`
- `POST /modelos/sweep`
- `POST /modelos/entrenar/sweep`
- `GET /modelos/estado/{job_id}`
- `GET /modelos/sweeps/{sweep_id}`

### Runs y champion

- `GET /modelos/runs`
- `GET /modelos/runs/{run_id}`
- `GET /modelos/champion`
- `POST /modelos/champion/promote`

---

## 1) Verificar datasets detectados

El backend detecta `dataset_id` a partir de varias ubicaciones del filesystem:

- `artifacts/features/*`
- `data/labeled/*`
- `data/processed/*`
- `datasets/*`

### Prueba rápida

```bash
curl -s "http://127.0.0.1:8000/modelos/datasets"
```

### Qué revisar

Para cada dataset, la respuesta puede indicar:

- `has_train_matrix`
- `has_pair_matrix`
- `has_labeled`
- `has_processed`
- `has_raw_dataset`
- `has_champion_sentiment`
- `has_champion_score`

Esto permite diagnosticar rápidamente si el dataset está listo para:

- entrenar `sentiment_desempeno`;
- ejecutar flujos de `score_docente`;
- usarse en Predicciones.

---

## 2) Verificar readiness de un dataset

El endpoint de readiness resume si el dataset tiene los artefactos mínimos para
entrenamiento.

### Ejemplo

```bash
curl -s "http://127.0.0.1:8000/modelos/readiness?dataset_id=2025-1"
```

### Qué devuelve

- existencia de labeled;
- existencia de `historico/unificado_labeled.parquet`;
- existencia de `feature_pack`;
- existencia de `pair_matrix`;
- `score_col` detectada;
- `pair_meta` y metadatos del labeled cuando existen;
- rutas lógicas relevantes.

### Interpretación práctica

- si falta labeled, no podrás avanzar normalmente en `sentiment_desempeno`;
- si falta `pair_matrix`, no podrás usar correctamente `score_docente`;
- si falta `feature_pack`, conviene ejecutar `feature-pack/prepare` antes de
  entrenar o predecir.

---

## 3) Preparar el feature-pack

Este endpoint crea o reconstruye el paquete de características del dataset.

### Request mínimo

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/feature-pack/prepare?dataset_id=2025-1"
```

### Parámetros útiles

- `dataset_id` (requerido)
- `input_uri` (opcional)
- `force`
- `text_feats_mode`
- `text_col`
- `text_n_components`
- `text_min_df`
- `text_max_features`

### Resolución de fuente cuando `input_uri` no se envía

El backend intenta resolver el origen en este orden:

1. labeled BETO del dataset;
2. `data/processed/<dataset_id>.parquet`;
3. `datasets/<dataset_id>.parquet`.

### Resultado esperado

El feature-pack deja listo, al menos:

- `train_matrix.parquet`
- `meta.json`

Y, cuando aplica a `score_docente`:

- `pair_matrix.parquet`
- `pair_meta.json`
- índices de docentes y materias.

---

## 4) Lanzar entrenamiento

El flujo recomendado de entrenamiento pasa por `POST /modelos/entrenar`.

### Ejemplo mínimo

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/entrenar" \
  -H "Content-Type: application/json" \
  -d '{
    "modelo": "rbm_general",
    "dataset_id": "2025-1",
    "family": "sentiment_desempeno",
    "epochs": 20
  }'
```

### Parámetros importantes

- `modelo`
  - `rbm_general`
  - `rbm_restringida`
  - `dbm_manual`
- `dataset_id`
- `family`
- `epochs`
- `hparams`
- `auto_prepare`
- `warm_start_from`
- `warm_start_run_id`
- `split_mode`
- `val_ratio`

### Qué hace el backend

- resuelve hparams efectivos;
- prepara/selecciona datos;
- crea estrategia de entrenamiento;
- ejecuta el job;
- persiste run en `artifacts/runs/<run_id>/`;
- intenta exportar bundle de inferencia;
- evalúa si debe promover champion.

### Respuesta inicial

Devuelve un `job_id` que luego se consulta en `/modelos/estado/{job_id}`.

---

## 5) Consultar estado del job

### Ejemplo

```bash
curl -s "http://127.0.0.1:8000/modelos/estado/<job_id>"
```

### Campos relevantes

- `status`
- `progress`
- `run_id`
- `artifact_path`
- `metrics`
- `history`
- `error`
- `champion_promoted`
- `warm_start_trace`

### Estados esperados

- `running`
- `completed`
- `failed`
- `unknown`

### Nota operativa

Si el entrenamiento falla después de persistir parcialmente el run, el endpoint
puede seguir devolviendo `run_id` y `artifact_path`. Esto es útil para
post-mortem y depuración.

---

## 6) Consultar runs persistidos

### Listado

```bash
curl -s "http://127.0.0.1:8000/modelos/runs?dataset_id=2025-1&family=sentiment_desempeno"
```

### Detalle

```bash
curl -s "http://127.0.0.1:8000/modelos/runs/<run_id>"
```

### Qué revisar en un run

- `metrics`
- `artifact_path`
- `bundle_status`
- `bundle_checklist`
- `bundle_artifacts`
- `context`

Esto permite validar si el run:

- terminó bien;
- quedó listo para inferencia;
- tiene predictor bundle completo;
- conserva trazabilidad suficiente para champion o predicciones.

---

## 7) Champion actual

### Consultar champion

```bash
curl -s "http://127.0.0.1:8000/modelos/champion?dataset_id=2025-1&family=sentiment_desempeno"
```

### Promover champion manualmente

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/champion/promote" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "2025-1",
    "family": "sentiment_desempeno",
    "run_id": "<run_id>"
  }'
```

### Validaciones importantes

- `run_id` vacío o inválido produce `422`;
- si falta `metrics.json`, la promoción falla con `404`;
- el champion se guarda bajo `artifacts/champions/<family>/<dataset_id>/`.

---

## 8) Sweep de modelos

El backend soporta dos formas de sweep:

- `POST /modelos/sweep`
  - ejecución síncrona y respuesta final estructurada;
- `POST /modelos/entrenar/sweep`
  - ejecución asíncrona con seguimiento posterior.

### Sweep síncrono

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/sweep" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "2025-1",
    "family": "score_docente",
    "models": ["rbm_general", "rbm_restringida", "dbm_manual"]
  }'
```

### Sweep asíncrono

```bash
curl -s -X POST "http://127.0.0.1:8000/modelos/entrenar/sweep" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "2025-1",
    "family": "score_docente",
    "modelos": ["rbm_general", "rbm_restringida", "dbm_manual"]
  }'
```

### Consultar resumen de sweep

```bash
curl -s "http://127.0.0.1:8000/modelos/sweeps/<sweep_id>"
```

### Qué revisar

- `best`
- `best_overall`
- `best_by_model`
- `primary_metric`
- `primary_metric_mode`
- `candidates`
- `champion_promoted`

---

## 9) Smoke test recomendado del módulo

Con el backend arriba:

```bash
curl -s "http://127.0.0.1:8000/modelos/datasets"
curl -s "http://127.0.0.1:8000/modelos/readiness?dataset_id=2025-1"
curl -s -X POST "http://127.0.0.1:8000/modelos/feature-pack/prepare?dataset_id=2025-1"
curl -s "http://127.0.0.1:8000/modelos/runs?dataset_id=2025-1"
curl -s "http://127.0.0.1:8000/modelos/champion?dataset_id=2025-1&family=score_docente"
```

Si además quieres probar entrenamiento end-to-end, lanza `POST /modelos/entrenar`
y luego monitorea con `/modelos/estado/{job_id}`.

---

## 10) Problemas comunes

### `404` en readiness o champion

Causa frecuente:
- no existe el dataset o champion esperado;
- falta `metrics.json`;
- falta labeled o feature-pack.

### `422` en promote o entrenamiento

Causa frecuente:
- request incompleto;
- `run_id` inválido;
- predictor bundle no listo;
- combinación inválida entre family, modelo y artefactos disponibles.

### `failed` en `/modelos/estado/{job_id}`

Revisar:
- `error`
- `artifact_path`
- `warm_start_trace`
- `artifacts/runs/<run_id>/metrics.json`

### Falta de `pair_matrix.parquet`

Impacta especialmente a `score_docente` y a la pestaña **Predicciones**.
En ese caso conviene regenerar feature-pack.

### Champion existe pero Predicciones no funciona

Revisar:
- `source_run_id`
- predictor bundle exportado;
- `pair_matrix.parquet`
- índices de docentes/materias;
- compatibilidad entre family del champion y el flujo de predicción.

---

## 11) Relación con el frontend actual

Aunque este runbook es backend-only, la UI actual de Modelos entra por:

- `frontend/src/pages/ModelosPage.tsx`

Y usa servicios sobre `/modelos` desde:

- `frontend/src/services/modelos.ts`

Por tanto, cuando el backend está sano, las subpestañas de Modelos pueden
consumir correctamente:

- datasets;
- readiness;
- entrenamiento;
- runs;
- champion;
- sweep;
- detalle de artefactos.
