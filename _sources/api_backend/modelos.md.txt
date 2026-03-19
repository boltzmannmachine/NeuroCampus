# Endpoints de modelos

La API de **modelos** agrupa los endpoints que soportan la pestaña **Modelos**
de NeuroCampus. Este router cubre el ciclo completo de trabajo sobre un
`dataset_id`:

- detección de datasets disponibles;
- verificación de insumos mínimos para entrenar;
- preparación del **feature-pack**;
- entrenamiento de runs individuales;
- ejecución de sweeps;
- consulta de estado de jobs;
- inspección de runs persistidos;
- consulta y promoción del **champion**.

Todos los endpoints aquí descritos cuelgan del prefijo base:

- `/modelos`

---

## Resumen de endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/modelos/datasets` | Lista datasets detectados para la pestaña Modelos |
| GET | `/modelos/readiness` | Verifica si existen los insumos mínimos para entrenar |
| POST | `/modelos/feature-pack/prepare` | Construye o reconstruye el feature-pack de un dataset |
| POST | `/modelos/entrenar` | Lanza un entrenamiento individual en background |
| POST | `/modelos/sweep` | Ejecuta un sweep determinístico y devuelve el resultado al terminar |
| POST | `/modelos/entrenar/sweep` | Lanza un sweep asíncrono en background |
| GET | `/modelos/estado/{job_id}` | Consulta el estado de un job de entrenamiento o sweep |
| POST | `/modelos/champion/promote` | Promueve manualmente un run a champion |
| GET | `/modelos/runs` | Lista runs persistidos de entrenamiento/auditoría |
| GET | `/modelos/runs/{run_id}` | Devuelve el detalle completo de un run |
| GET | `/modelos/sweeps/{sweep_id}` | Devuelve el resumen persistido de un sweep |
| GET | `/modelos/champion` | Devuelve la información del champion actual |

---

## `GET /modelos/datasets`

### Descripción

Retorna los datasets detectados por la pestaña **Modelos** a partir del estado
actual del filesystem.

La detección se hace revisando varias ubicaciones del proyecto, entre ellas:

- `artifacts/features/`
- `data/labeled/`
- `data/processed/`
- `datasets/`

Este endpoint **no crea artefactos**. Solo inspecciona qué datasets están
presentes y qué piezas del pipeline existen para cada uno.

### Respuesta

- Código `200 OK`.
- Cuerpo JSON: lista de objetos `DatasetInfo`.

Campos observables en la respuesta:

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

### Utilidad en frontend

Este endpoint sirve para poblar el selector principal de dataset en la pestaña
**Modelos** y para mostrar rápidamente si un dataset ya tiene:

- feature-pack de entrenamiento,
- pair-matrix,
- labeled BETO,
- dataset procesado,
- champion por familia.

---

## `GET /modelos/readiness`

### Descripción

Verifica si existen los insumos mínimos necesarios para entrenar un dataset.

Según el código actual, este endpoint reporta el estado de:

- dataset etiquetado (`labeled`),
- histórico etiquetado unificado,
- feature-pack,
- pair-matrix,
- metadatos de score/target.

### Entrada

Parámetros de query:

- `dataset_id`: identificador del dataset a inspeccionar.

### Respuesta

- Código `200 OK`.
- Cuerpo JSON tipo `ReadinessResponse`.

Campos relevantes:

- `dataset_id`
- `labeled_exists`
- `unified_labeled_exists`
- `feature_pack_exists`
- `pair_matrix_exists`
- `score_col`
- `pair_meta`
- `labeled_score_meta`
- `paths`

### Observaciones

- El endpoint intenta resolver primero el labeled con los helpers del dominio.
- También expone rutas lógicas a los artefactos clave para que la UI pueda
  mostrar qué parte del pipeline está lista y qué falta construir.

---

## `POST /modelos/feature-pack/prepare`

### Descripción

Construye o reconstruye el **feature-pack** de un dataset.

Este endpoint habilita el modo automático desde la pestaña **Datos** y también
sirve como herramienta operativa/manual para dejar listo el conjunto de
artefactos de entrenamiento bajo:

- `artifacts/features/<dataset_id>/`

### Entrada

Parámetros esperados:

- `dataset_id`: identificador del dataset.
- `input_uri` (opcional): ruta o URI del dataset fuente.
- `force` (opcional): si es `true`, recalcula aunque el feature-pack exista.
- `text_feats_mode` (opcional): `none` o `tfidf_lsa`.
- `text_col` (opcional): columna de texto a utilizar.
- `text_n_components` (opcional): dimensión máxima de LSA.
- `text_min_df` (opcional): frecuencia mínima de documento en TF-IDF.
- `text_max_features` (opcional): tamaño máximo del vocabulario TF-IDF.

### Resolución automática de origen

Si `input_uri` no se envía, el endpoint intenta resolver la fuente en este orden:

1. `data/labeled/<dataset_id>_beto.parquet`
2. `data/processed/<dataset_id>.parquet`
3. `datasets/<dataset_id>.parquet`

Si no encuentra una fuente válida, responde con conflicto porque no puede
construir el pack.

### Respuesta

- Código `200 OK` si el feature-pack se construye correctamente.
- En caso de errores:
  - `400` si falta `dataset_id`.
  - `404` si se especifica `input_uri` pero no existe.
  - `409` si no se encuentra ninguna fuente válida para construir el pack.

### Artefactos esperados

Este flujo deja listos, entre otros, artefactos como:

- `artifacts/features/<dataset_id>/train_matrix.parquet`
- `artifacts/features/<dataset_id>/meta.json`
- `artifacts/features/<dataset_id>/pair_matrix.parquet`
- `artifacts/features/<dataset_id>/pair_meta.json`

---

## `POST /modelos/entrenar`

### Descripción

Lanza un entrenamiento individual en background y retorna un `job_id` para
consulta posterior.

La ejecución real:

- construye el plan de entrenamiento,
- prepara la selección de datos,
- crea la estrategia de modelo,
- ejecuta `PlantillaEntrenamiento`,
- persiste un run en `artifacts/runs/<run_id>`,
- intenta exportar el predictor bundle,
- evalúa si corresponde promover champion.

### Entrada

El endpoint recibe un cuerpo `EntrenarRequest`. Según el código visible, el
payload puede incluir campos como:

- `modelo`
- `dataset_id`
- `family`
- `task_type`
- `input_level`
- `data_source`
- `epochs`
- `data_plan`
- `window_k`
- `replay_size`
- `replay_strategy`
- `warm_start_from`
- `warm_start_run_id`
- `hparams`
- `auto_prepare`
- parámetros opcionales de texto para auto-prepare del feature-pack

### Respuesta

- Código `200 OK`.
- Respuesta tipo `EntrenarResponse` con:
  - `job_id`
  - `status`
  - `message`

### Persistencia y trazabilidad

Durante el flujo se reserva y luego persiste un run bajo:

- `artifacts/runs/<run_id>`

El estado interno del job registra, entre otros:

- `run_id`
- `artifact_path`
- `metrics`
- `history`
- `champion_promoted`
- `time_total_ms`
- `warm_start_trace`

### Errores

Si el entrenamiento falla, el job queda en estado `failed` y la consulta de
estado posterior expone el detalle mediante `/modelos/estado/{job_id}`.

---

## `POST /modelos/sweep`

### Descripción

Ejecuta un **sweep determinístico** de modelos y devuelve el resultado cuando
termina.

Este endpoint:

- valida la lista de modelos solicitados,
- construye una selección de datos comparable para todos los candidatos,
- entrena cada candidato en las mismas condiciones,
- calcula la métrica primaria por familia,
- elige el mejor de forma determinística,
- opcionalmente promueve champion,
- persiste un `summary.json` del sweep.

### Entrada

El cuerpo es `ModelSweepRequest`. Según el código visible, incluye al menos:

- `dataset_id`
- `family`
- `models`
- `base_hparams`
- `hparams_overrides`
- `max_candidates`
- `auto_promote_champion`
- `seed`
- y otros parámetros compartidos con el entrenamiento individual.

### Respuesta

- Código `200 OK`.
- Respuesta `ModelSweepResponse` con campos como:
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

### Validaciones y errores

- `422` si se solicita un modelo no soportado.
- `422` si falta `dataset_id`.
- `422` si falta `family`.

### Persistencia

El resultado del sweep se persiste en un `summary.json` bajo el directorio de
sweeps para su consulta posterior.

---

## `POST /modelos/entrenar/sweep`

### Descripción

Lanza un **sweep asíncrono** en background.

A diferencia de `/modelos/sweep`, este endpoint no espera a que terminen todos
los candidatos, sino que responde de inmediato con un `sweep_id`.

### Entrada

Recibe un `SweepEntrenarRequest` con el contexto compartido del sweep.

### Respuesta

- Código `200 OK`.
- Respuesta tipo `SweepEntrenarResponse` con:
  - `sweep_id`
  - `status`
  - `message`

### Consulta posterior

El estado y resultado del sweep se consultan mediante:

- `GET /modelos/estado/{job_id}`
- `GET /modelos/sweeps/{sweep_id}`

---

## `GET /modelos/estado/{job_id}`

### Descripción

Devuelve el estado de un job de entrenamiento o sweep.

Este endpoint consulta primero el estado en memoria. Si no lo encuentra y existe
un `summary.json` persistido para el sweep, usa ese archivo como fuente de
verdad.

### Entrada

- `job_id` en la ruta.

### Respuesta

- Código `200 OK` si el job existe o si puede reconstruirse desde el summary.
- Cuerpo tipo `EstadoResponse`.

Campos visibles en el código:

- `job_id`
- `status`
- `progress`
- `model`
- `params`
- `metrics`
- `history`
- `run_id`
- `artifact_path`
- `champion_promoted`
- `job_type`
- `sweep_summary_path`
- `sweep_best_overall`
- `sweep_best_by_model`
- `warm_start_trace`
- `time_total_ms`
- `error`

### Estados posibles

Según el flujo actual, pueden aparecer estados como:

- `running`
- `completed`
- `failed`
- `unknown`

---

## `POST /modelos/champion/promote`

### Descripción

Promueve manualmente un run existente a **champion**.

El endpoint implementa validaciones defensivas para preservar una semántica
estable de errores y también intenta inferir información faltante desde el run
si el payload es mínimo.

### Entrada

Recibe `PromoteChampionRequest`.

Campos relevantes:

- `run_id`
- `dataset_id` (opcional si puede inferirse)
- `model_name` (opcional)
- `family` (opcional)

### Comportamiento relevante

- Si falta `dataset_id`, intenta inferirlo desde `metrics.json` o desde el
  formato del `run_id`.
- Si falta `model_name`, delega la inferencia al flujo de promoción.
- Si el run no tiene `metrics.json`, responde con error explícito.

### Respuesta

- Código `200 OK` con `ChampionInfo` si la promoción fue exitosa.

### Errores esperados

- `422` si `run_id` es inválido.
- `404` si no existe el run o falta `metrics.json`.
- `409` si no se pudo promover champion por conflicto operativo.

---

## `GET /modelos/runs`

### Descripción

Lista runs persistidos de entrenamiento o auditoría encontrados en
`artifacts/runs`.

La implementación actual soporta filtros y además hace **backfill** de contexto a
partir de `metrics.json` y `predictor.json` para que la respuesta sea más útil a
la UI.

### Entrada

Parámetros de query soportados:

- `model_name` (opcional)
- `dataset` (opcional)
- `dataset_id` (opcional)
- `periodo` (opcional)
- `family` (opcional)

### Respuesta

- Código `200 OK`.
- Lista de objetos `RunSummary`.

### Campos relevantes

Aunque el shape exacto depende del schema, el código visible rellena o expone:

- `run_id`
- `artifact_path`
- `family`
- `dataset_id`
- `model_name`
- `task_type`
- `input_level`
- `target_col`
- `data_plan`
- `data_source`
- `context`
- `metrics`

También intenta completar métricas resumidas como:

- `primary_metric`
- `primary_metric_mode`
- `primary_metric_value`
- `val_accuracy`
- `val_f1_macro`
- `accuracy`
- `f1_macro`
- `n_train`
- `n_val`

### Utilidad

Este endpoint alimenta listados como el historial de runs y tablas de resumen en
la pestaña **Modelos**.

---

## `GET /modelos/runs/{run_id}`

### Descripción

Devuelve los detalles completos de un run leyendo sus artefactos del filesystem.

Además del detalle bruto, el endpoint enriquece la respuesta con contexto
reconstruido para que la UI pueda renderizar metadatos y estado del bundle de
inferencia sin depender de mocks.

### Entrada

- `run_id` en la ruta.

### Respuesta

- Código `200 OK` con `RunDetails`.
- `404` si el run no existe.

### Campos enriquecidos

Según el código, el endpoint intenta completar o normalizar:

- `context`
- `family`
- `dataset_id`
- `model_name`
- `task_type`
- `input_level`
- `target_col`
- `data_plan`
- `data_source`
- `metrics`

---

## `GET /modelos/sweeps/{sweep_id}`

### Descripción

Devuelve el resumen persistido de un sweep.

Si el `summary.json` todavía no existe, intenta responder con la información en
memoria del sweep en ejecución.

Cuando el summary existe, el endpoint además normaliza y completa varios campos
para que la UI pueda consumir sweeps nuevos y legados con el mismo contrato.

### Entrada

- `sweep_id` en la ruta.

### Respuesta

- Código `200 OK` con `SweepSummary`.
- Si el summary aún no existe, puede devolver una versión parcial con:
  - `sweep_id`
  - `dataset_id`
  - `family`
  - `status`
  - `summary_path`

### Normalizaciones observables

El código visible hace, entre otras cosas:

- asegurar `primary_metric` y `primary_metric_mode`;
- compatibilizar `best_overall` y `best_by_model` con llaves legacy;
- hidratar candidatos desde métricas persistidas;
- recalcular `best_overall` si falta o viene incompleto.

---

## `GET /modelos/champion`

### Descripción

Devuelve la información del **modelo campeón actual** para un dataset.

El endpoint soporta tanto la carga del champion actual como ciertos fallbacks
legados por dataset, y realiza backfill de contexto para evitar respuestas
incompletas.

### Entrada

Parámetros de query soportados:

- `dataset_id` (opcional)
- `dataset` (opcional)
- `periodo` (opcional)
- `model_name` (opcional)
- `family` (opcional)

### Reglas importantes

- Debe existir al menos uno entre `dataset_id`, `dataset` o `periodo`.
- `model_name` solo se usa como filtro cuando el usuario lo pasa explícitamente.
- Si no se pasa `model_name`, se devuelve el champion global del dataset para la
  familia solicitada o detectada.

### Respuesta

- Código `200 OK` con `ChampionInfo`.

Campos relevantes reforzados por el código:

- `family`
- `source_run_id`
- `path`
- `dataset_id`
- `model_name`
- `task_type`
- `input_level`
- `target_col`
- `data_plan`
- `data_source`
- `metrics`

### Errores esperados

- `400` si no se envía `dataset_id`, `dataset` ni `periodo`.
- `404` si no existe champion para el dataset/familia solicitados.
- `500` si el champion cargado es inválido para el schema `ChampionInfo` o si
  falla la resolución del champion.

---

## Relación con la pestaña «Modelos»

En la implementación actual del proyecto, este router es la base operativa de la
pestaña **Modelos** y de sus subflujos principales:

- **Resumen**: datasets disponibles, readiness y champion.
- **Entrenamiento**: `feature-pack/prepare`, `entrenar`.
- **Ejecuciones**: `runs`, `runs/{run_id}`, `estado/{job_id}`.
- **Campeón**: `champion`, `champion/promote`.
- **Sweep**: `sweep`, `entrenar/sweep`, `sweeps/{sweep_id}`.
- **Artefactos / Diagnóstico**: inspección indirecta de paths, bundles y
  métricas persistidas.

Por ello, esta documentación debe considerarse la referencia principal de la API
para la operación del ciclo de modelado en NeuroCampus.
