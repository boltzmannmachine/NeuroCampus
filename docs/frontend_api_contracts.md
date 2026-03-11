# Contratos frontend–backend de NeuroCampus

Este documento describe los **contratos HTTP que el frontend consume realmente**
en la implementación actual de NeuroCampus.

Su propósito es dejar trazable, en un solo lugar, qué rutas usa cada pestaña,
qué parámetros envía, qué respuestas espera y qué referencias del código son
activas, legacy o auxiliares.

A diferencia de versiones anteriores de este archivo, este documento **no define
una API idealizada o futura**, sino la **API efectivamente integrada hoy** entre:

- `frontend/src/services/*`
- `frontend/src/features/*/api.ts`
- los routers activos del backend FastAPI

---

## Alcance y criterios

Este documento cubre los contratos usados por:

- **Datos**
- **Jobs**
- **Modelos**
- **Predicción directa** (`/prediccion`)
- **Predicciones** (`/predicciones`)
- **Dashboard**
- **Administración / cleanup**

No documenta componentes visuales ni mappers de UI salvo cuando afectan el
contrato de red.

---

## Convenciones generales

### Base URL

El frontend usa como base:

- `VITE_API_BASE`, o
- `VITE_API_URL`

Si ninguna está definida, el cliente por defecto usa:

- `http://127.0.0.1:8000`

### Cliente HTTP principal

El cliente común está en:

- `frontend/src/services/apiClient.ts`

Características relevantes:

- wrapper sobre `fetch` con interfaz tipo axios;
- serialización automática de JSON;
- envío de `FormData` sin forzar `Content-Type`;
- timeout por defecto;
- enriquecimiento de errores con `status`, cuerpo y JSON parseado;
- soporte de `X-Correlation-Id` para trazabilidad.

### Formato de errores

El frontend tolera principalmente estos formatos:

- `{ "detail": "..." }`
- `{ "message": "..." }`
- errores con cuerpo JSON más estructurado

### Identificadores de contexto

En la implementación actual conviven varios identificadores lógicos:

- `dataset_id`
- `periodo`
- `dataset` (como alias de query en algunos endpoints)

En general:

- **Datos** usa mucho `dataset` como alias en query;
- **upload** usa `periodo` como identificador efectivo del dataset;
- **Modelos** y **Predicciones** trabajan principalmente con `dataset_id`.

---

## Mapa rápido por servicio frontend

### Servicios base activos

- `frontend/src/services/datos.ts`
- `frontend/src/services/jobs.ts`
- `frontend/src/services/modelos.ts`
- `frontend/src/services/prediccion.ts`
- `frontend/src/services/predicciones.ts`
- `frontend/src/services/dashboard.ts`
- `frontend/src/services/adminCleanup.ts`

### Adaptadores por feature

- `frontend/src/features/datos/api.ts`
- `frontend/src/features/modelos/api.ts`

Estos adaptadores no cambian el contrato HTTP; solo encapsulan y normalizan
llamadas para la UI.

---

# 1. Datos

Servicio frontend:

- `frontend/src/services/datos.ts`

Feature adapter:

- `frontend/src/features/datos/api.ts`

## 1.1 `GET /datos/esquema`

### Uso en frontend

- carga del esquema esperado del dataset;
- apoyo visual para la pestaña **Datos**.

### Request

Sin parámetros obligatorios.

### Respuesta esperada

Objeto con:

- `version`
- `columns`

Cada columna incluye, típicamente:

- `name`
- `dtype`
- `required`
- `range`, `max_len` o `domain` cuando aplique

### Observaciones

- el backend puede leer `schemas/plantilla_dataset.schema.json`;
- si falla esa lectura, responde con un esquema fallback.

---

## 1.2 `POST /datos/validar`

### Uso en frontend

Validación previa del archivo antes de persistirlo.

### Request

`multipart/form-data` con:

- `file`
- `dataset_id`
- `fmt` opcional: `csv | xlsx | parquet`

### Respuesta esperada

El frontend espera un objeto que incluya al menos:

- `dataset_id`
- `sample`
- resultado de validación del backend

Según el flujo actual, la respuesta puede incluir además:

- `ok`
- `missing`
- `extra`
- `issues`
- `errors`
- `warnings`
- `n_rows`
- `n_cols`

### Errores relevantes

- `400` por formato no soportado o archivo vacío
- `500` por error interno de validación

### Observaciones

- el backend hace gating explícito de formato;
- `sample` se construye con las primeras filas del archivo para la UI.

---

## 1.3 `POST /datos/upload`

### Uso en frontend

Carga y persistencia del dataset.

### Request

`multipart/form-data` con:

- `file`
- `periodo`
- `dataset_id`
- `overwrite`

### Regla importante

En la implementación actual:

- el backend **ignora funcionalmente `dataset_id`**,
- y usa **`periodo` como identificador efectivo** del dataset.

El frontend envía ambos por compatibilidad.

### Respuesta esperada

El frontend consume principalmente:

- `dataset_id`
- `rows_ingested`
- `stored_as`
- `warnings`

### Errores relevantes

- `400` por archivo vacío o formato no soportado
- `409` si el dataset ya existe y `overwrite=false`
- `500` por fallo de ingesta

### Observaciones

- el backend intenta persistir en parquet;
- si no hay motor parquet, cae a CSV.

---

## 1.4 `GET /datos/resumen?dataset=<id>`

### Uso en frontend

Alimenta la tarjeta **Resumen del Dataset** en la pestaña **Datos**.

### Query params

- `dataset` (alias del backend para `dataset_id`)

### Respuesta esperada

El frontend espera un resumen con campos como:

- `dataset_id`
- `n_rows`
- `n_cols`
- `periodos`
- `n_docentes`
- `n_asignaturas`
- `columns`

### Errores relevantes

- `404` si no existe dataset procesado
- `500` por error al leer dataset

---

## 1.5 `GET /datos/sentimientos?dataset=<id>`

### Uso en frontend

Alimenta los gráficos de sentimiento en la pestaña **Datos**.

### Query params

- `dataset` (alias del backend para `dataset_id`)

### Respuesta esperada

Objeto con campos como:

- `dataset_id`
- `total_comentarios`
- `global_counts`
- `por_docente`
- `por_asignatura`

### Errores relevantes

- `404` si no existe dataset etiquetado
- `422` si faltan columnas requeridas
- `500` por error interno

---

## 1.6 `GET /datos/preview`

### Uso en frontend

Este endpoint existe en backend y forma parte del contrato real de datos,
aunque no estaba reflejado correctamente en la documentación anterior.

### Query params

- `dataset` (obligatorio; alias para dataset_id)
- `variant`: `processed | labeled`
- `mode`: `ui | raw`
- `limit`
- `offset`

### Respuesta esperada

Preview tabular del dataset para vistas de tabla o diagnóstico.

### Observaciones

- `variant=processed` apunta al dataset procesado;
- `variant=labeled` apunta al dataset etiquetado BETO.

---

## 1.7 Referencias legacy detectadas

En `frontend/src/services/endpoints.ts` aún aparece:

- `GET /datos/list`

Actualmente **no es un contrato activo principal** del frontend nuevo. Debe
tratarse como referencia legacy o pendiente de depuración.

---

# 2. Jobs

Servicio frontend:

- `frontend/src/services/jobs.ts`

Feature adapter:

- `frontend/src/features/datos/api.ts`

## 2.1 `POST /jobs/preproc/beto/run`

### Uso en frontend

Lanza el job BETO desde la pestaña **Datos**.

### Body JSON

- `dataset`
- `text_col`
- `keep_empty_text`
- `min_tokens`
- `text_feats`
- `text_feats_out_dir`
- `empty_text_policy`
- `force_cargar_dataset`

### Respuesta esperada

Objeto tipo job con:

- `id`
- `dataset`
- `src`
- `dst`
- `status`
- `created_at`
- `started_at`
- `finished_at`
- `meta`
- `error`

### Observaciones

- puede marcar `needs_cargar_dataset` si necesita normalizar desde `datasets/`;
- el frontend usa este contrato para polling y visualización de estado.

---

## 2.2 `GET /jobs/preproc/beto/{job_id}`

### Uso en frontend

Consulta estado de un job BETO concreto.

### Respuesta esperada

Mismo shape general del job BETO.

---

## 2.3 `GET /jobs/preproc/beto?limit=<n>`

### Uso en frontend

Lista jobs BETO recientes.

---

## 2.4 `POST /jobs/data/unify/run`

### Uso en frontend

Lanza un job de unificación histórica desde **Datos**.

### Body JSON

- `mode`: `acumulado | acumulado_labeled | periodo_actual | ventana`
- `ultimos`
- `desde`
- `hasta`

### Respuesta esperada

- `id`
- `status`
- `created_at`
- `mode`
- `out_uri`
- `meta`
- `error`

---

## 2.5 `GET /jobs/data/unify/{job_id}`

Consulta estado del job de unificación.

---

## 2.6 `GET /jobs/data/unify?limit=<n>`

Lista jobs recientes de unificación.

---

## 2.7 `POST /jobs/data/features/prepare/run`

### Uso en frontend

Lanza un job asíncrono para construir el feature-pack.

### Body JSON

- `dataset_id`
- `input_uri`
- `output_dir`

### Respuesta esperada

- `id`
- `status`
- `dataset_id`
- `input_uri`
- `output_dir`
- `artifacts`
- `error`

---

## 2.8 `GET /jobs/data/features/prepare/{job_id}`

Consulta estado del feature-pack.

---

## 2.9 `GET /jobs/data/features/prepare?limit=<n>`

Lista jobs recientes de feature-pack.

---

## 2.10 Referencias legacy detectadas

El frontend conserva wrappers para:

- `POST /jobs/training/rbm-search`
- `GET /jobs/training/rbm-search/{job_id}`
- `GET /jobs/training/rbm-search?limit=<n>`

Estas rutas aparecen en `frontend/src/services/jobs.ts` y `endpoints.ts`, pero no
forman parte del flujo principal de la UI actual documentada. Deben tratarse
como contratos legacy o auxiliares.

---

# 3. Modelos

Servicio frontend:

- `frontend/src/services/modelos.ts`

Feature adapter:

- `frontend/src/features/modelos/api.ts`

## 3.1 `GET /modelos/datasets`

### Uso en frontend

Puebla el selector principal de datasets en la pestaña **Modelos**.

### Respuesta esperada

Lista de objetos con:

- `dataset_id`
- `has_train_matrix`
- `has_pair_matrix`
- `has_labeled`
- `has_processed`
- `has_raw_dataset`
- `n_rows`
- `n_pairs`
- `created_at`
- `has_champion_sentiment`
- `has_champion_score`

---

## 3.2 `GET /modelos/readiness?dataset_id=<id>`

### Uso en frontend

Verifica si existen los insumos mínimos para entrenar.

### Respuesta esperada

Objeto con:

- `dataset_id`
- `labeled_exists`
- `unified_labeled_exists`
- `feature_pack_exists`
- `pair_matrix_exists`
- `score_col`
- `pair_meta`
- `labeled_score_meta`
- `paths`

---

## 3.3 `POST /modelos/feature-pack/prepare`

### Uso en frontend

Construcción manual del feature-pack desde la pestaña **Modelos**.

### Request

El servicio frontend envía parámetros por query-string, no por body JSON:

- `dataset_id`
- `input_uri`
- `force`
- `text_feats_mode`
- `text_col`
- `text_n_components`
- `text_min_df`
- `text_max_features`

### Respuesta esperada

Diccionario con rutas de artefactos generados, por ejemplo:

- `train_matrix`
- `pair_matrix`
- `meta`
- `pair_meta`
- `teacher_index`
- `materia_index`

---

## 3.4 `POST /modelos/entrenar`

### Uso en frontend

Lanza entrenamiento de modelo en background.

### Body JSON

El frontend puede enviar:

- `modelo`
- `data_ref`
- `dataset_id`
- `periodo_actual`
- `family`
- `epochs`
- `hparams`
- `seed`
- `metodologia`
- `ventana_n`
- `warm_start_from`
- `warm_start_run_id`
- `auto_prepare`
- `split_mode`
- `val_ratio`

### Respuesta esperada

- `job_id`
- `status`

---

## 3.5 `GET /modelos/estado/{job_id}`

### Uso en frontend

Polling del entrenamiento o del sweep async legacy.

### Respuesta esperada

Objeto con campos como:

- `job_id`
- `status`
- `progress`
- `run_id`
- `artifact_path`
- `champion_promoted`
- `metrics`
- `history`
- `job_type`
- `sweep_summary_path`
- `error`

---

## 3.6 `GET /modelos/runs`

### Uso en frontend

Lista runs para las subpestañas de ejecuciones, resumen y diagnóstico.

### Query params posibles

- `model_name`
- `dataset_id`
- `periodo`
- `family`

### Respuesta esperada

Lista de runs con:

- `run_id`
- `model_name`
- `dataset_id`
- `family`
- `task_type`
- `input_level`
- `target_col`
- `data_source`
- `created_at`
- `metrics`

---

## 3.7 `GET /modelos/runs/{run_id}`

### Uso en frontend

Obtención de detalle completo del run.

### Respuesta esperada

Objeto con:

- `run_id`
- `dataset_id`
- `model_name`
- `family`
- `task_type`
- `input_level`
- `target_col`
- `data_source`
- `metrics`
- `config`
- `artifact_path`
- `bundle_status`
- `bundle_checklist`
- `bundle_artifacts`

---

## 3.8 `GET /modelos/champion`

### Uso en frontend

Carga del champion actual para la pestaña **Campeón**.

### Query params posibles

- `dataset_id`
- `dataset`
- `periodo`
- `model_name`
- `family`

### Respuesta esperada

- `model_name`
- `dataset_id`
- `family`
- `task_type`
- `input_level`
- `target_col`
- `data_source`
- `source_run_id`
- `metrics`
- `path`

---

## 3.9 `POST /modelos/champion/promote`

### Uso en frontend

Promoción manual de un run a champion.

### Body JSON

El frontend puede enviar payload mínimo, típicamente:

- `run_id`
- `family`
- opcionalmente `dataset_id`
- opcionalmente `model_name`

### Observación

El backend hace backfill de contexto cuando faltan campos y trata de inferirlos
desde `metrics.json` y el `run_id`.

---

## 3.10 `POST /modelos/sweep`

### Uso en frontend

Sweep determinístico síncrono.

### Respuesta esperada

Resumen completo del sweep con:

- `sweep_id`
- `status`
- `dataset_id`
- `family`
- `primary_metric`
- `primary_metric_mode`
- `candidates`
- `best`
- `champion_promoted`
- `champion_run_id`
- `n_completed`
- `n_failed`
- `summary_path`
- `elapsed_s`

---

## 3.11 `POST /modelos/entrenar/sweep`

### Uso en frontend

Sweep asíncrono legacy mantenido por compatibilidad.

### Respuesta esperada

- `sweep_id`
- `status`
- `message`

---

## 3.12 `GET /modelos/sweeps/{sweep_id}`

### Uso en frontend

Lectura de resumen persistido del sweep.

---

# 4. Predicción directa (`/prediccion`)

Servicio frontend:

- `frontend/src/services/prediccion.ts`

Este módulo corresponde al flujo directo y legacy de predicción fila a fila, no
al flujo docente–materia de la pestaña moderna **Predicciones**.

## 4.1 `POST /prediccion/online`

### Uso en frontend

Predicción online con payload directo.

### Body JSON

- `job_id` opcional
- `family` opcional
- `input`:
  - `calificaciones`
  - `comentario`

### Respuesta esperada

- `label_top`
- `scores`
- `sentiment` opcional
- `confidence` opcional
- `decision_rule` opcional
- `latency_ms`
- `correlation_id`

---

## 4.2 `POST /prediccion/batch`

### Uso en frontend

Batch directo por archivo.

### Request

`multipart/form-data` con:

- `file`
- query opcional `dataset_id`

### Respuesta esperada

- `batch_id`
- `summary`
- `sample`
- `artifact`
- `correlation_id`

---

# 5. Predicciones (`/predicciones`)

Servicio frontend:

- `frontend/src/services/predicciones.ts`

Este es el flujo moderno de la pestaña **Predicciones** basado en pares
docente–materia y artifacts persistidos.

## 5.1 `GET /predicciones/datasets`

Lista datasets disponibles para predicción docente–materia.

### Respuesta esperada

- `dataset_id`
- `n_pairs`
- `n_docentes`
- `n_materias`
- `has_champion`
- `created_at`

---

## 5.2 `GET /predicciones/teachers?dataset_id=<id>`

Lista docentes únicos del dataset.

### Respuesta esperada

- `teacher_key`
- `teacher_name`
- `teacher_id`
- `n_encuestas`

---

## 5.3 `GET /predicciones/materias?dataset_id=<id>`

Lista materias únicas del dataset.

### Respuesta esperada

- `materia_key`
- `materia_name`
- `materia_id`
- `n_encuestas`

---

## 5.4 `GET /predicciones/runs?dataset_id=<id>`

Lista runs batch persistidos de predicción.

### Respuesta esperada

- `pred_run_id`
- `dataset_id`
- `family`
- `created_at`
- `n_pairs`
- `champion_run_id`
- `model_name`
- `predictions_uri`

---

## 5.5 `POST /predicciones/individual`

### Uso en frontend

Predicción individual para un par docente–materia.

### Body JSON

- `dataset_id`
- `teacher_key`
- `materia_key`

### Respuesta esperada

- `dataset_id`
- `teacher_key`
- `materia_key`
- `score_total_pred`
- `risk`
- `confidence`
- `cold_pair`
- `evidence`
- `historical`
- `radar`
- `comparison`
- `timeline`
- `champion_run_id`
- `model_name`

---

## 5.6 `POST /predicciones/batch/run`

Lanza un job de predicción por lote para todos los pares del dataset.

### Body JSON

- `dataset_id`

### Respuesta esperada

- `job_id`
- `status`
- `progress`
- `dataset_id`

---

## 5.7 `GET /predicciones/batch/{job_id}`

Consulta el estado del job batch.

### Respuesta esperada

- `job_id`
- `status`
- `progress`
- `pred_run_id`
- `dataset_id`
- `n_pairs`
- `predictions_uri`
- `champion_run_id`
- `error`

---

## 5.8 `GET /predicciones/outputs/preview`

### Query params

- `predictions_uri`
- `limit`
- `offset`

### Respuesta esperada

- `predictions_uri`
- `rows`
- `columns`
- `output_schema` o `schema`
- `note`

---

## 5.9 `GET /predicciones/outputs/file`

### Uso en frontend

No se consume como JSON, sino como URL de descarga directa.

### Query params

- `predictions_uri`

---

## 5.10 Endpoints de soporte no integrados plenamente en la pestaña

El router `/predicciones` también expone:

- `GET /predicciones/health`
- `GET /predicciones/model-info`
- `POST /predicciones/predict`

Son contratos válidos del backend, pero el servicio principal de la pestaña
`frontend/src/services/predicciones.ts` no depende directamente de ellos hoy.

---

# 6. Dashboard

Servicio frontend:

- `frontend/src/services/dashboard.ts`

## 6.1 `GET /dashboard/status`

Estado liviano del histórico institucional.

### Respuesta esperada

- `manifest_exists`
- `manifest_updated_at`
- `manifest_corrupt`
- `periodos_disponibles`
- `processed`
- `labeled`
- `ready_processed`
- `ready_labeled`

---

## 6.2 `GET /dashboard/periodos`

Lista periodos disponibles para filtros.

---

## 6.3 `GET /dashboard/catalogos`

### Query params posibles

- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Respuesta esperada

- `docentes`
- `asignaturas`
- `programas`

---

## 6.4 `GET /dashboard/kpis`

### Query params posibles

Mismos filtros del dashboard.

### Respuesta esperada

- `predicciones`
- `evaluaciones`
- `docentes`
- `asignaturas`
- `score_promedio`

---

## 6.5 `GET /dashboard/series`

### Query params

- `metric`
- filtros globales del dashboard

### Respuesta esperada

- `metric`
- `points[]` con:
  - `periodo`
  - `value`

---

## 6.6 `GET /dashboard/sentimiento`

Distribución neg/neu/pos desde histórico labeled.

### Respuesta esperada

- `buckets[]` con:
  - `label`
  - `value`

### Observación

- si el histórico labeled no existe, el backend puede responder `404`;
- el frontend debe tratarlo como estado no disponible, no como ruptura fatal.

---

## 6.7 `GET /dashboard/rankings`

### Query params

- `by`: `docente | asignatura`
- `metric`
- `order`
- `limit`
- filtros globales

### Respuesta esperada

- `by`
- `metric`
- `order`
- `items[]` con:
  - `name`
  - `value`

---

## 6.8 `GET /dashboard/radar`

### Respuesta esperada

- `items[]` con:
  - `key`
  - `value`

---

## 6.9 `GET /dashboard/wordcloud`

### Query params

- `limit`
- filtros globales

### Respuesta esperada

- `items[]` con:
  - `text`
  - `value`
  - `sentiment`

---

# 7. Administración

Servicio frontend:

- `frontend/src/services/adminCleanup.ts`

Este servicio **no usa `apiClient.ts`**, sino `fetch` directo contra
`VITE_API_BASE`.

## 7.1 `GET /admin/cleanup/inventory`

### Query params

- `retention_days`
- `keep_last`
- `exclude_globs`

### Headers

- `Authorization: Bearer <token>` si existe `NC_ADMIN_TOKEN` en `localStorage`

### Respuesta esperada

Objeto de cleanup con:

- `summary`
- `candidates`
- `dry_run`
- `force`
- `moved_bytes`
- `actions`
- `log_file`
- `trash_dir`

---

## 7.2 `POST /admin/cleanup`

### Body JSON

- `retention_days`
- `keep_last`
- `exclude_globs`
- `dry_run`
- `force`
- `trash_dir`
- `trash_retention_days`

### Headers

- `Authorization: Bearer <token>` cuando esté presente

### Respuesta esperada

Mismo shape general del inventario/resultado de cleanup.

---

## 7.3 `GET /admin/cleanup/logs?limit=<n>`

### Respuesta esperada

- `lines: string[]`

---

# 8. Rutas activas, auxiliares y legacy

## Activas en el frontend actual

- `/datos/esquema`
- `/datos/validar`
- `/datos/upload`
- `/datos/resumen`
- `/datos/sentimientos`
- `/jobs/preproc/beto/run`
- `/jobs/preproc/beto/{job_id}`
- `/jobs/preproc/beto`
- `/jobs/data/unify/run`
- `/jobs/data/unify/{job_id}`
- `/jobs/data/unify`
- `/jobs/data/features/prepare/run`
- `/jobs/data/features/prepare/{job_id}`
- `/jobs/data/features/prepare`
- `/modelos/datasets`
- `/modelos/readiness`
- `/modelos/feature-pack/prepare`
- `/modelos/entrenar`
- `/modelos/estado/{job_id}`
- `/modelos/runs`
- `/modelos/runs/{run_id}`
- `/modelos/champion`
- `/modelos/champion/promote`
- `/modelos/sweep`
- `/modelos/entrenar/sweep`
- `/modelos/sweeps/{sweep_id}`
- `/prediccion/online`
- `/prediccion/batch`
- `/predicciones/datasets`
- `/predicciones/teachers`
- `/predicciones/materias`
- `/predicciones/runs`
- `/predicciones/individual`
- `/predicciones/batch/run`
- `/predicciones/batch/{job_id}`
- `/predicciones/outputs/preview`
- `/predicciones/outputs/file`
- `/dashboard/status`
- `/dashboard/periodos`
- `/dashboard/catalogos`
- `/dashboard/kpis`
- `/dashboard/series`
- `/dashboard/sentimiento`
- `/dashboard/rankings`
- `/dashboard/radar`
- `/dashboard/wordcloud`
- `/admin/cleanup/inventory`
- `/admin/cleanup`
- `/admin/cleanup/logs`

## Auxiliares / expuestas en backend pero no centrales en la UI actual

- `/datos/preview`
- `/predicciones/health`
- `/predicciones/model-info`
- `/predicciones/predict`
- `/modelos/champion` con filtros legacy `dataset` o `periodo`

## Legacy o pendientes de depuración

- `/datos/list`
- `/jobs/training/rbm-search`
- `/jobs/training/rbm-search/{job_id}`
- `/jobs/training/rbm-search?limit=<n>`
- `/modelos/promote` como fallback legacy desde el servicio frontend

---

# 9. Conclusión operativa

El frontend actual ya no depende de un contrato mínimo limitado a Datos, Jobs y
Modelos. Su integración real con backend abarca también:

- Dashboard
- Predicción directa
- Predicciones persistidas
- Limpieza administrativa

Por eso, este documento debe considerarse la referencia activa para mantener la
coherencia entre:

- servicios frontend,
- routers FastAPI,
- documentación Sphinx de API,
- y futuras correcciones de compatibilidad.
