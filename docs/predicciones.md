# Predicciones (Backend) — Runbook + Contratos vigentes

Este documento describe el estado actual del módulo **Predicciones** y reemplaza la lectura antigua que lo limitaba a un simple `resolve/validate` del bundle.

Hoy conviven dos capas funcionales:

- **Endpoints especializados de la pestaña Predicciones**: listados, predicción individual y batch para la family `score_docente`.
- **Endpoint unificado `POST /predicciones/predict`**: resuelve `run_id` o champion, valida el bundle y puede ejecutar inferencia real sobre el feature-pack cuando `do_inference=true`.

## Alcance actual

La pestaña **Predicciones** del frontend consume exclusivamente la family:

- `score_docente`

La selección del modelo productivo se hace mediante el **champion** activo por `dataset_id`.

## Conceptos clave

### Rutas lógicas vs rutas físicas
- **Ruta lógica**: `artifacts/...` (portable entre ambientes).
- **Ruta física**: carpeta real en disco, controlada por `NC_ARTIFACTS_DIR`.

Helpers relevantes:
- `neurocampus.utils.paths.abs_artifact_path(ref)`
- `neurocampus.utils.paths.rel_artifact_path(path)`

### Entidades
- **Feature-pack**: `artifacts/features/<dataset_id>/`
- **Run**: `artifacts/runs/<run_id>/`
- **Champion**: `artifacts/champions/<family>/<dataset_id>/champion.json`
- **Predictions run**: `artifacts/predictions/<dataset_id>/score_docente/<pred_run_id>/`

## Layout esperado de artifacts

### Feature-pack
Directorio: `artifacts/features/<dataset_id>/`

Archivos más relevantes:
- `train_matrix.parquet`
- `pair_matrix.parquet`
- `meta.json`
- `pair_meta.json`
- `teacher_index.json`
- `materia_index.json`

### Run
Directorio: `artifacts/runs/<run_id>/`

Archivos importantes para auditoría e inferencia:
- `metrics.json`
- `history.json`
- `job_meta.json`
- `predictor.json`
- `preprocess.json`
- `model/` o equivalente serializado del modelo

### Champion
Archivo preferido:
- `artifacts/champions/<family>/<dataset_id>/champion.json`

Campos clave:
- `source_run_id`
- `model_name`
- `metrics`
- `paths.run_dir`
- `score`

### Predictions run (batch)
Directorio típico:
- `artifacts/predictions/<dataset_id>/score_docente/<pred_run_id>/`

Archivos relevantes:
- `meta.json`
- `predictions.parquet`
- `schema.json` (si se generó)

## Endpoints vigentes

### Health
- `GET /predicciones/health`

Devuelve estado del módulo y la ruta efectiva de artifacts.

### Listados para la pestaña Predicciones
- `GET /predicciones/datasets`
- `GET /predicciones/teachers?dataset_id=...`
- `GET /predicciones/materias?dataset_id=...`
- `GET /predicciones/runs?dataset_id=...`

Estos endpoints soportan la navegación principal de la UI de Predicciones.

### Predicción individual
- `POST /predicciones/individual`

Request mínimo:
```json
{
  "dataset_id": "2025-1",
  "teacher_key": "doc_123",
  "materia_key": "mat_456"
}
```

Comportamiento:
- usa el **champion activo** de `score_docente` para el dataset;
- si el par docente–materia no existe, intenta inferencia en modo **cold_pair**;
- retorna score, riesgo, confianza, radar, comparación y timeline.

### Batch con polling
- `POST /predicciones/batch/run`
- `GET /predicciones/batch/{job_id}`

Request:
```json
{ "dataset_id": "2025-1" }
```

Comportamiento:
- valida que exista `pair_matrix.parquet`;
- valida champion listo para inferencia;
- ejecuta inferencia sobre todos los pares del dataset;
- persiste `predictions.parquet` y metadatos del run batch.

### Metadata del modelo
- `GET /predicciones/model-info`

Permite inspeccionar qué predictor se usaría por `run_id` o por champion, sin lanzar inferencia.

### Endpoint unificado: resolve/validate + inferencia opcional
- `POST /predicciones/predict`

Este endpoint mantiene compatibilidad con el flujo histórico de `resolve/validate`, pero ya soporta inferencia real bajo control explícito.

#### Modo 1 — Resolver por `run_id` (sin inferencia)
```json
{ "run_id": "2025-1__dbm_manual__20260308T120000Z__abcd1234" }
```

#### Modo 2 — Resolver por champion (sin inferencia)
```json
{
  "use_champion": true,
  "dataset_id": "2025-1",
  "family": "score_docente"
}
```

#### Modo 3 — Inferencia real sobre feature-pack
```json
{
  "use_champion": true,
  "dataset_id": "2025-1",
  "family": "score_docente",
  "do_inference": true,
  "limit": 50,
  "offset": 0,
  "persist": true
}
```

Notas:
- si `do_inference=false` (default), el endpoint **solo resuelve/valida** el bundle y retorna metadata estable para UI;
- si `do_inference=true`, retorna además `predictions`, `model_info`, `schema` y opcionalmente `predictions_uri` cuando `persist=true`;
- `persist=true` requiere `do_inference=true`.

### Outputs persistidos
- `GET /predicciones/outputs/preview?predictions_uri=...`
- `GET /predicciones/outputs/file?predictions_uri=...`

Permiten abrir vista previa o descargar un `predictions.parquet` ya persistido.

## Códigos de respuesta esperados

- `200`: resolución correcta; si hubo inferencia, la respuesta incluye predicciones.
- `202`: job batch aceptado para ejecución asíncrona.
- `404`: champion no existe, run no existe, faltan índices o faltan artifacts requeridos.
- `422`: predictor no listo, request inválido o `persist=true` sin `do_inference=true`.
- `500`: error inesperado del servidor.

## Variables de entorno

- `NC_ARTIFACTS_DIR`: ruta física base de artifacts.
- `NC_PROJECT_ROOT`: raíz del repo para ayudar a resolver paths relativos.

## Verificación manual

### 1) Levantar backend
```bash
uvicorn neurocampus.app.main:app --reload --app-dir backend/src
```

### 2) Health
```bash
curl -s "http://127.0.0.1:8000/predicciones/health"
```

### 3) Resolver bundle por champion
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/predict" \
  -H "Content-Type: application/json" \
  -d '{ "use_champion": true, "dataset_id": "2025-1", "family": "score_docente" }'
```

### 4) Ejecutar inferencia real y persistir salida
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "use_champion": true,
    "dataset_id": "2025-1",
    "family": "score_docente",
    "do_inference": true,
    "persist": true,
    "limit": 25
  }'
```

### 5) Predicción individual
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/individual" \
  -H "Content-Type: application/json" \
  -d '{ "dataset_id": "2025-1", "teacher_key": "doc_123", "materia_key": "mat_456" }'
```

### 6) Batch con polling
```bash
curl -s -X POST "http://127.0.0.1:8000/predicciones/batch/run" \
  -H "Content-Type: application/json" \
  -d '{ "dataset_id": "2025-1" }'

curl -s "http://127.0.0.1:8000/predicciones/batch/<job_id>"
```

### 7) Vista previa de salida persistida
```bash
curl -s "http://127.0.0.1:8000/predicciones/outputs/preview?predictions_uri=artifacts/predictions/2025-1/score_docente/<pred_run_id>/predictions.parquet"
```

## Observaciones operativas

- Si el champion existe pero no tiene `source_run_id`, el módulo responde con `422` y conviene re-promover un run reciente.
- Si faltan `teacher_index.json` o `materia_index.json`, la predicción individual no puede construir el contexto del par.
- Si el entorno de desarrollo no tiene `pyarrow` o motor equivalente, la persistencia/lectura de parquet fallará aunque el contrato HTTP sea correcto.
