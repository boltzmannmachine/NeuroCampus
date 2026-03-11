# Inferencia vía API (NeuroCampus)

Este documento describe la **inferencia vigente** en NeuroCampus desde el
backend HTTP. En la versión actual del sistema existen **dos superficies de
predicción** con propósitos distintos:

1. **`/prediccion`**
   - orientada a predicción directa y simple;
   - expone un endpoint online y uno batch mínimo.

2. **`/predicciones`**
   - orientada al flujo operativo de la pestaña **Predicciones**;
   - permite listar datasets, explorar docentes y materias, ejecutar
     predicciones individuales, lanzar jobs batch, consultar resultados
     persistidos y resolver información del modelo campeón.

Este documento se centra en cómo consumir esa API de inferencia de forma
correcta según el caso de uso.

---

## 1. Qué ruta usar en cada caso

### Usar `/prediccion` cuando

- se necesita una predicción directa sobre payload online;
- se quiere enviar un archivo sencillo para predicción batch mínima;
- se trabaja con un flujo más cercano a inferencia “rápida” o integración
  puntual.

### Usar `/predicciones` cuando

- se trabaja desde la pestaña **Predicciones** del frontend;
- se necesita inferencia sobre datasets preparados mediante feature-pack;
- se quiere predecir un par **docente–materia**;
- se requiere lanzar un batch asíncrono sobre todos los pares de un dataset;
- se necesitan resultados persistidos (`predictions.parquet`) y su vista previa;
- se requiere conocer el modelo campeón o el bundle de inferencia resuelto.

---

## 2. Requisitos previos

Para que la inferencia funcione correctamente, normalmente deben existir estos
artefactos en disco:

- `artifacts/features/<dataset_id>/pair_matrix.parquet`
- `artifacts/features/<dataset_id>/teacher_index.json`
- `artifacts/features/<dataset_id>/materia_index.json`
- `artifacts/champions/<family>/<dataset_id>/champion.json`
- el run promovido correspondiente en `artifacts/runs/<run_id>/`

Dependiendo del endpoint, también pueden intervenir:

- `predictor.json`
- `preprocess.json`
- `metrics.json`
- `predictions.parquet`
- `meta.json` de runs batch de predicción

En la práctica, el flujo previo recomendado es:

1. cargar y preparar datos;
2. construir el feature-pack;
3. entrenar modelos;
4. promover un champion;
5. consumir inferencia.

---

## 3. Health checks

### 3.1 Predicción directa

#### `POST /prediccion/online`

No existe un health dedicado dentro de este router. La validación típica se hace
mediante el health global del backend o probando un payload mínimo válido.

### 3.2 Predicciones operativas

#### `GET /predicciones/health`

Devuelve el estado del módulo de predicciones y la ruta de artifacts activa.

### Respuesta típica

```json
{
  "status": "ok",
  "artifacts_dir": ".../artifacts"
}
```

Este endpoint es útil para verificar:

- que el router está montado;
- que el backend ve correctamente el directorio de artifacts;
- que la pestaña **Predicciones** puede arrancar su flujo.

---

## 4. Predicción directa: router `/prediccion`

Este router expone dos endpoints:

- `POST /prediccion/online`
- `POST /prediccion/batch`

Su prefijo base es:

- `/prediccion`

---

## 4.1 `POST /prediccion/online`

### Objetivo

Ejecuta una predicción online sobre un payload estructurado.

Internamente el endpoint delega en el facade:

- `predict_online(...)`

Además:

- captura errores como JSON estructurado;
- hace la salida JSON-safe para tipos `numpy` y, cuando aplica, `torch`.

### Entrada

Cuerpo JSON compatible con `PrediccionOnlineRequest`.

Aunque el esquema exacto depende del contrato Pydantic, conceptualmente el
payload contiene la información de entrada necesaria para resolver la inferencia
online sobre una observación.

### Comportamiento relevante

- si el pipeline de predicción falla, responde error HTTP con detalle JSON;
- si la inferencia retorna tensores o arrays, el endpoint los serializa a listas;
- utiliza `correlation_id` del request si el middleware lo ha inyectado.

### Respuestas esperadas

- `200 OK` si la predicción se resuelve correctamente;
- `500` si falla la ejecución del pipeline.

### Ejemplo conceptual

```bash
curl -X POST "http://127.0.0.1:8000/prediccion/online" \
  -H "Content-Type: application/json" \
  -d '{
    "...": "payload de PrediccionOnlineRequest"
  }'
```

---

## 4.2 `POST /prediccion/batch`

### Objetivo

Ejecuta una predicción batch mínima sobre un archivo subido.

### Entrada

- `multipart/form-data`
- campo `file`

El ejemplo esperado por el código actual es un CSV con columnas como:

- `id`
- `comentario`
- `pregunta_1` … `pregunta_10`

### Comportamiento

El endpoint:

1. lee el CSV;
2. construye una lista de items con:
   - `id`
   - `comentario`
   - `calificaciones`
3. delega en:
   - `predict_batch(items, correlation_id=...)`

### Respuesta

- `201 Created`
- cuerpo compatible con `PrediccionBatchResponse`

### Observación importante

Este endpoint representa una variante mínima de batch. No es el flujo principal
consumido por la pestaña **Predicciones** para predicción masiva operacional.
Para ese flujo debe usarse el router **`/predicciones`**.

---

## 5. Predicciones operativas: router `/predicciones`

Este router soporta el flujo principal de inferencia del sistema actual.

Su prefijo base efectivo es:

- `/predicciones`

### Capacidades principales

- listar datasets aptos para predicción de score docente;
- listar docentes y materias de un dataset;
- obtener metadata del modelo resuelto;
- ejecutar predicción individual por par docente–materia;
- lanzar predicción batch sobre todos los pares del dataset;
- consultar el estado de jobs batch;
- listar runs persistidos de predicción;
- abrir vista previa y descargar outputs persistidos.

---

## 5.1 Descubrimiento de datasets

### `GET /predicciones/datasets`

Lista datasets disponibles para la pestaña **Predicciones**.

### Qué devuelve

Por cada dataset, el backend retorna información como:

- `dataset_id`
- `n_pairs`
- `n_docentes`
- `n_materias`
- `has_champion`
- `created_at`

### Uso típico

Este endpoint alimenta el selector inicial de dataset en la UI.

### Errores

En condiciones normales devuelve `200 OK`. Si un dataset tiene metadata parcial,
puede aparecer con contadores en cero en lugar de fallar completamente.

---

## 5.2 Listado de docentes

### `GET /predicciones/teachers?dataset_id=<id>`

Lista docentes únicos de un dataset.

### Requisitos

Debe existir:

- `artifacts/features/<dataset_id>/teacher_index.json`

### Respuesta típica

Cada elemento incluye campos como:

- `teacher_key`
- `teacher_name`
- `teacher_id`
- `n_encuestas`

### Errores

- `404` si no existe `teacher_index.json`

### Observación

El endpoint intenta enriquecer los nombres humanos a partir del dataset de
origen (`input_uri`) cuando esa metadata está disponible.

---

## 5.3 Listado de materias

### `GET /predicciones/materias?dataset_id=<id>`

Lista materias únicas de un dataset.

### Requisitos

Debe existir:

- `artifacts/features/<dataset_id>/materia_index.json`

### Respuesta típica

Cada elemento incluye campos como:

- `materia_key`
- `materia_name`
- `materia_id`
- `n_encuestas`

### Errores

- `404` si no existe `materia_index.json`

---

## 5.4 Información del modelo resuelto

### `GET /predicciones/model-info`

Devuelve metadata del modelo que se usaría para inferencia, sin necesidad de
producir todavía una salida batch persistida.

### Modos de resolución

#### Por champion

Parámetros típicos:

- `use_champion=true`
- `dataset_id=<id>`
- `family=<family>` (opcional según contexto)

#### Por run_id

Parámetros típicos:

- `run_id=<run_id>`

### Respuesta típica

Puede incluir:

- `resolved_run_id`
- `resolved_from`
- `run_dir`
- `predictor`
- `preprocess`
- `metrics`
- `note`

### Errores esperados

- `404` si no existe el champion o el run solicitado;
- `422` si el predictor no está listo o el request es inválido;
- `500` ante fallo interno inesperado.

### Uso típico

Este endpoint es útil para:

- diagnóstico del bundle cargado;
- validación previa en frontend;
- depuración del champion activo.

---

## 5.5 Predicción individual por par docente–materia

### `POST /predicciones/individual`

Realiza una predicción individual de score para un par:

- `teacher_key`
- `materia_key`

sobre un `dataset_id` concreto.

### Entrada

Cuerpo JSON compatible con `IndividualPredictionRequest`.

Conceptualmente incluye:

- `dataset_id`
- `teacher_key`
- `materia_key`

### Fuente de datos

El endpoint lee:

- `artifacts/features/<dataset_id>/pair_matrix.parquet`

### Comportamiento

#### Caso normal

Si el par docente–materia existe en `pair_matrix.parquet`, el backend toma esa
fila como base para inferencia.

#### Caso cold pair

Si el par no existe:

- valida que `teacher_key` y `materia_key` existan en sus índices;
- construye una fila sintética;
- imputa features numéricas usando medias de docente, materia y globales.

### Respuesta típica

La respuesta incluye información rica para la UI, por ejemplo:

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

### Errores esperados

- `404` si falta `pair_matrix.parquet`, índices o champion;
- `422` si el predictor no está listo para inferencia;
- `500` si ocurre un error interno al cargar o inferir.

### Interpretación funcional

Este endpoint es la base principal del panel de predicción individual en la
pestaña **Predicciones**.

---

## 5.6 Predicción batch por dataset

### `POST /predicciones/batch/run`

Lanza un job asíncrono para predecir **todos los pares** del dataset.

### Entrada

Cuerpo JSON compatible con `BatchRunRequest`.

Conceptualmente incluye:

- `dataset_id`

### Requisitos

- debe existir `pair_matrix.parquet` del dataset;
- debe existir un champion cargable para la familia correspondiente.

### Respuesta

- `202 Accepted`
- cuerpo compatible con `BatchJobResponse`

Campos típicos:

- `job_id`
- `status`
- `progress`
- `dataset_id`

### Errores esperados

- `404` si no existe `pair_matrix.parquet` o el champion;
- `422` si el predictor no está listo.

---

## 5.7 Estado del job batch

### `GET /predicciones/batch/{job_id}`

Consulta el estado de un job batch previamente lanzado.

### Respuesta típica

- `job_id`
- `status`
- `progress`
- `dataset_id`
- `pred_run_id`
- `n_pairs`
- `predictions_uri`
- `champion_run_id`
- `error`

### Estados esperables

- `queued`
- `running`
- `completed`
- `failed`

### Errores

- `404` si el `job_id` no existe

---

## 5.8 Historial de runs de predicción

### `GET /predicciones/runs?dataset_id=<id>`

Lista runs batch persistidos de predicción para un dataset.

### Qué devuelve

Cada elemento puede incluir:

- `pred_run_id`
- `dataset_id`
- `family`
- `created_at`
- `n_pairs`
- `champion_run_id`
- `model_name`
- `predictions_uri`

### Uso típico

Este endpoint alimenta el bloque **Historial** de la pestaña Predicciones y
sirve como puente hacia:

- `/predicciones/outputs/preview`
- `/predicciones/outputs/file`

### Validación

- `422` si `dataset_id` no viene informado

---

## 5.9 Vista previa de outputs persistidos

### `GET /predicciones/outputs/preview`

Retorna una vista previa JSON de un archivo `predictions.parquet` persistido.

### Parámetros

- `predictions_uri`
- `limit`
- `offset`

### Respuesta típica

- `predictions_uri`
- `rows`
- `columns`
- `output_schema`
- `note`

### Errores

- `404` si el archivo no existe;
- `422` si la URI es inválida.

---

## 5.10 Descarga del archivo de salida

### `GET /predicciones/outputs/file`

Permite descargar el parquet persistido de predicciones.

### Parámetro

- `predictions_uri`

### Respuesta

- archivo binario (`application/octet-stream`)

### Errores

- `404` si el archivo no existe;
- `422` si la URI es inválida.

---

## 5.11 `POST /predicciones/predict`

Este endpoint sigue existiendo como superficie de resolución y validación del
predictor bundle, con soporte adicional para inferencia opt-in desde
feature-pack y persistencia opcional.

### Capacidades

Según el payload, puede:

- resolver bundle por `run_id` o por champion;
- devolver metadata del predictor y preprocesamiento;
- ejecutar inferencia si `do_inference=true`;
- persistir outputs si `persist=true`.

### Casos típicos

#### Solo resolve/validate

```json
{
  "use_champion": true,
  "dataset_id": "2025-1",
  "family": "score_docente"
}
```

#### Inference opt-in desde feature-pack

```json
{
  "use_champion": true,
  "dataset_id": "2025-1",
  "family": "score_docente",
  "do_inference": true,
  "input_uri": "feature_pack",
  "input_level": "pair"
}
```

#### Inference + persistencia

```json
{
  "use_champion": true,
  "dataset_id": "2025-1",
  "family": "score_docente",
  "do_inference": true,
  "persist": true,
  "input_uri": "feature_pack",
  "input_level": "pair"
}
```

### Respuesta típica

Puede incluir:

- `resolved_run_id`
- `resolved_from`
- `run_dir`
- `predictor`
- `preprocess`
- `predictions`
- `predictions_uri`
- `model_info`
- `output_schema`
- `warnings`
- `note`

### Errores esperados

- `404` si no existe champion, run o feature-pack necesario;
- `422` si el bundle no está listo o el request es inconsistente;
- `500` ante error interno no controlado.

### Observación importante

Aunque este endpoint sigue siendo válido, para la UX principal del frontend
actual el flujo más visible se apoya sobre:

- `/predicciones/individual`
- `/predicciones/batch/run`
- `/predicciones/batch/{job_id}`
- `/predicciones/outputs/preview`

---

## 6. Ejemplos de uso

## 6.1 Consultar datasets disponibles

```bash
curl -s "http://127.0.0.1:8000/predicciones/datasets"
```

## 6.2 Consultar docentes de un dataset

```bash
curl -s "http://127.0.0.1:8000/predicciones/teachers?dataset_id=2025-1"
```

## 6.3 Consultar materias de un dataset

```bash
curl -s "http://127.0.0.1:8000/predicciones/materias?dataset_id=2025-1"
```

## 6.4 Predicción individual

```bash
curl -X POST "http://127.0.0.1:8000/predicciones/individual" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "2025-1",
    "teacher_key": "DOC_001",
    "materia_key": "MAT_101"
  }'
```

## 6.5 Lanzar batch por dataset

```bash
curl -X POST "http://127.0.0.1:8000/predicciones/batch/run" \
  -H "Content-Type: application/json" \
  -d '{"dataset_id": "2025-1"}'
```

## 6.6 Consultar estado del batch

```bash
curl -s "http://127.0.0.1:8000/predicciones/batch/<job_id>"
```

## 6.7 Ver preview de outputs persistidos

```bash
curl -s "http://127.0.0.1:8000/predicciones/outputs/preview?predictions_uri=artifacts/predictions/2025-1/score_docente/<pred_run_id>/predictions.parquet&limit=20&offset=0"
```

---

## 7. Errores comunes

### `404 pair_matrix.parquet no existe`

Causa típica:

- no se ha ejecutado el feature-pack del dataset.

Acción recomendada:

- construir o reconstruir `artifacts/features/<dataset_id>/pair_matrix.parquet`.

### `404 champion no encontrado`

Causa típica:

- no existe `champion.json` para el dataset/family;
- o el run promovido ya no está completo.

Acción recomendada:

- revisar `artifacts/champions/<family>/<dataset_id>/champion.json`;
- validar `source_run_id` y el contenido de `artifacts/runs/<run_id>/`.

### `422 predictor no listo`

Causa típica:

- el bundle del modelo existe, pero no está listo para inferencia real.

Acción recomendada:

- revisar `predictor.json`, `preprocess.json`, `model.bin` o el formato de
  export del run correspondiente.

### `404 teacher_index.json` o `materia_index.json`

Causa típica:

- feature-pack incompleto.

Acción recomendada:

- reconstruir el feature-pack del dataset.

### `422 predictions_uri inválida`

Causa típica:

- la URI enviada no corresponde a una ruta válida de artifact persistido.

Acción recomendada:

- usar la `predictions_uri` retornada por `/predicciones/runs` o por el job
  batch completado.

---

## 8. Recomendación operativa

Para el sistema actual, el flujo recomendado de inferencia es:

1. verificar `GET /predicciones/health`;
2. listar datasets con `GET /predicciones/datasets`;
3. listar docentes y materias si se hará predicción individual;
4. usar `GET /predicciones/model-info` para validar champion/bundle si hace
   falta diagnóstico;
5. ejecutar:
   - `POST /predicciones/individual`, o
   - `POST /predicciones/batch/run`;
6. si hubo batch, consultar `GET /predicciones/batch/{job_id}`;
7. consumir el resultado con:
   - `GET /predicciones/outputs/preview`
   - `GET /predicciones/outputs/file`

El router `/prediccion` debe verse como una superficie auxiliar de predicción
rápida, mientras que `/predicciones` representa el flujo operativo principal del
producto actual.
