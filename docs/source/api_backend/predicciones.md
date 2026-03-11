# Endpoints de predicciones

La API de **predicciones** agrupa los endpoints orientados a la explotación de
modelos ya entrenados y promovidos, especialmente para el flujo de la pestaña
**Predicciones** del frontend.

A diferencia del router `prediccion`, que expone una inferencia más directa y
acotada, este módulo trabaja sobre los artefactos persistidos del sistema:

- feature-packs bajo `artifacts/features/<dataset_id>/`
- runs de entrenamiento y bundles de inferencia
- campeones promovidos por dataset/familia
- salidas persistidas de predicción en `artifacts/predictions/`

Todos los endpoints aquí descritos cuelgan del prefijo base:

- `/predicciones`

---

## Alcance funcional del router

Este router cubre cinco bloques principales:

1. **Salud y disponibilidad del módulo**
2. **Exploración del dataset para predicción**
3. **Predicción individual**
4. **Predicción por lote (job asíncrono)**
5. **Resolución de modelo y consumo de outputs persistidos**

En conjunto, estos endpoints permiten que el frontend:

- liste datasets listos para predicción;
- consulte docentes y materias disponibles;
- ejecute predicción individual sobre un par docente–materia;
- lance una corrida batch sobre todos los pares del dataset;
- consulte el estado del job;
- abra vista previa o descargue el archivo de resultados;
- inspeccione el bundle del modelo campeón o de un run concreto.

---

## Resumen de endpoints principales

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/predicciones/health` | Health-check del módulo de predicciones |
| GET | `/predicciones/datasets` | Lista datasets disponibles para predicción |
| GET | `/predicciones/runs` | Lista runs batch persistidos de un dataset |
| GET | `/predicciones/teachers` | Lista docentes únicos de un dataset |
| GET | `/predicciones/materias` | Lista materias únicas de un dataset |
| POST | `/predicciones/individual` | Predicción individual para un par docente–materia |
| POST | `/predicciones/batch/run` | Lanza un job batch de predicción |
| GET | `/predicciones/batch/{job_id}` | Consulta el estado del job batch |
| GET | `/predicciones/model-info` | Devuelve metadata del modelo resuelto |
| POST | `/predicciones/predict` | Resuelve bundle y, opcionalmente, ejecuta inferencia |
| GET | `/predicciones/outputs/preview` | Vista previa JSON de outputs persistidos |
| GET | `/predicciones/outputs/file` | Descarga el archivo parquet persistido |

---

## `GET /predicciones/health`

### Descripción

Health-check del módulo de predicciones.

Se usa para confirmar que el router está activo y que el backend puede resolver
la carpeta de artefactos donde viven los feature-packs, runs y outputs.

### Respuesta

- Código `200 OK`
- JSON con campos como:

  - `status`: normalmente `"ok"`
  - `artifacts_dir`: ruta efectiva de trabajo

### Uso típico

- comprobación rápida desde frontend;
- smoke tests;
- diagnóstico de despliegue o rutas de artefactos.

---

## `GET /predicciones/datasets`

### Descripción

Lista los datasets disponibles para predicción del caso de uso principal del
router, centrado en **score_docente** y pares docente–materia.

### Fuente de datos

Este endpoint inspecciona los artefactos asociados a cada dataset, en especial:

- `artifacts/features/<dataset_id>/pair_meta.json`
- estado del campeón para ese dataset

### Respuesta

- Código `200 OK`
- Lista de objetos con información tipo:

  - `dataset_id`
  - `n_pairs`
  - `n_docentes`
  - `n_materias`
  - `has_champion`
  - `created_at`

### Uso en frontend

Este endpoint alimenta el selector principal de dataset en la pestaña
**Predicciones**.

---

## `GET /predicciones/runs`

### Descripción

Lista los runs batch de predicción persistidos para un dataset.

Está orientado al bloque **Historial** del frontend, donde el usuario puede:

- revisar ejecuciones anteriores;
- abrir una vista previa de resultados;
- descargar el parquet de predicciones.

### Entrada

Parámetros de query:

- `dataset_id` **requerido**

Si no se envía `dataset_id`, el endpoint responde con error de validación.

### Respuesta

- Código `200 OK`
- Lista de runs con campos como:

  - `pred_run_id`
  - `dataset_id`
  - `family`
  - `created_at`
  - `n_pairs`
  - `champion_run_id`
  - `model_name`
  - `predictions_uri`

### Notas de compatibilidad

Para runs antiguos cuyo `meta.json` no contiene `predictions_uri`, el backend
intenta inferirlo a partir de rutas estándar como:

- `predictions.parquet`
- `predicciones.parquet`

---

## `GET /predicciones/teachers`

### Descripción

Devuelve la lista de docentes únicos disponibles en un dataset ya preparado para
predicción.

### Entrada

Parámetros de query:

- `dataset_id` **requerido**

### Dependencias

Este endpoint requiere la existencia de:

- `artifacts/features/<dataset_id>/teacher_index.json`

Opcionalmente usa:

- `pair_matrix.parquet` para contar encuestas por docente;
- `meta.json` e `input_uri` para intentar resolver nombres legibles.

### Respuesta

- Código `200 OK`
- Lista de objetos con campos como:

  - `teacher_key`
  - `teacher_name`
  - `teacher_id`
  - `n_encuestas`

### Errores típicos

- `404 Not Found` si no existe `teacher_index.json`

### Uso en frontend

Alimenta el selector de docente dentro de la pestaña **Predicciones**.

---

## `GET /predicciones/materias`

### Descripción

Devuelve la lista de materias únicas disponibles para un dataset ya preparado
para predicción.

### Entrada

Parámetros de query:

- `dataset_id` **requerido**

### Dependencias

Este endpoint requiere la existencia de:

- `artifacts/features/<dataset_id>/materia_index.json`

Opcionalmente usa:

- `pair_matrix.parquet` para conteos por materia;
- `meta.json` e `input_uri` para intentar reconstruir nombres legibles.

### Respuesta

- Código `200 OK`
- Lista de objetos con campos como:

  - `materia_key`
  - `materia_name`
  - `materia_id`
  - `n_encuestas`

### Errores típicos

- `404 Not Found` si no existe `materia_index.json`

### Uso en frontend

Alimenta el selector de asignatura o materia en la pestaña **Predicciones**.

---

## `POST /predicciones/individual`

### Descripción

Ejecuta una predicción individual de score para un par **docente–materia**.

Este es el endpoint principal de inferencia interactiva de la pestaña
**Predicciones**.

### Entrada

Cuerpo JSON con campos requeridos como:

- `dataset_id`
- `teacher_key`
- `materia_key`

### Flujo funcional

El endpoint realiza, en esencia, este proceso:

1. valida que exista `pair_matrix.parquet` para el dataset;
2. busca el par `(teacher_key, materia_key)` en la matriz;
3. si el par existe, usa sus features directamente;
4. si el par no existe, entra en modo **cold_pair**;
5. en modo `cold_pair`, valida que existan `teacher_index.json` y
   `materia_index.json`;
6. imputa variables numéricas usando promedios por docente, materia o globales;
7. resuelve el modelo campeón del dataset;
8. carga el bundle de inferencia;
9. ejecuta la predicción sobre el registro preparado;
10. construye evidencias, radar, comparación y línea temporal.

### Respuesta

- Código `200 OK`
- Cuerpo JSON con información tipo:

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

### Errores típicos

- `404 Not Found`
  - si no existe `pair_matrix.parquet`
  - si no existe `teacher_index.json` o `materia_index.json` cuando hace falta
  - si `teacher_key` o `materia_key` no existen en el dataset
  - si no existe campeón para ese dataset/familia
- `422 Unprocessable Entity`
  - si el bundle del predictor existe pero no está listo para inferencia
- `500 Internal Server Error`
  - si falla la carga del parquet o la inferencia de forma inesperada

### Observación importante

Este endpoint no devuelve solo el score predicho. También genera insumos para la
UI analítica de la pestaña, como radar, comparación y timeline.

---

## `POST /predicciones/batch/run`

### Descripción

Lanza un job asíncrono de predicción por lote sobre todos los pares disponibles
en el dataset.

### Entrada

Cuerpo JSON con campos como:

- `dataset_id` **requerido**

### Flujo funcional

Antes de crear el job, el backend valida:

- que exista `pair_matrix.parquet` para el dataset;
- que haya un campeón resoluble para la familia esperada;
- que el predictor esté listo para inferencia.

Si todo está correcto:

1. crea un `job_id`;
2. registra estado inicial `queued`;
3. programa la ejecución en background;
4. devuelve respuesta inmediata al cliente.

### Respuesta

- Código `202 Accepted`
- JSON con campos como:

  - `job_id`
  - `status` = `queued`
  - `progress`
  - `dataset_id`

### Errores típicos

- `404 Not Found` si falta `pair_matrix.parquet` o no existe champion
- `422 Unprocessable Entity` si el predictor no está listo

---

## `GET /predicciones/batch/{job_id}`

### Descripción

Consulta el estado de un job batch de predicción previamente lanzado.

### Entrada

- `job_id` en la ruta

### Respuesta

- Código `200 OK` si el job existe
- JSON con campos como:

  - `job_id`
  - `status` (`queued`, `running`, `completed`, `failed`)
  - `progress`
  - `dataset_id`
  - `pred_run_id`
  - `n_pairs`
  - `predictions_uri`
  - `champion_run_id`
  - `error`

### Errores típicos

- `404 Not Found` si el `job_id` no existe en memoria

### Resultado del job

Cuando el job termina correctamente, el backend persiste un parquet de
predicciones bajo `artifacts/predictions/...` y deja la referencia en
`predictions_uri`.

---

## `GET /predicciones/model-info`

### Descripción

Retorna metadata del modelo que sería usado por el sistema, sin ejecutar
inferencia real.

Sirve como endpoint de **resolución y validación de bundle**.

### Entrada

Parámetros de query posibles:

- `run_id`
- `dataset_id`
- `family`
- `use_champion` (`true`/`false`)

### Reglas de resolución

- Si `use_champion=true`, el cliente debe enviar `dataset_id`.
- Si `use_champion=false`, el cliente debe enviar `run_id`.

### Respuesta

- Código `200 OK`
- JSON con campos como:

  - `resolved_run_id`
  - `resolved_from` (`champion` o `run_id`)
  - `run_dir`
  - `predictor`
  - `preprocess`
  - `metrics`
  - `note`

### Errores típicos

- `404 Not Found` si no existe champion o predictor bundle
- `422 Unprocessable Entity` si faltan parámetros o el predictor no está listo
- `500 Internal Server Error` ante errores internos de resolución

### Uso típico

- diagnóstico del bundle;
- inspección desde frontend;
- validación previa a inferencia.

---

## `POST /predicciones/predict`

### Descripción

Resuelve y valida el bundle del predictor y, opcionalmente, ejecuta inferencia
sobre un feature-pack.

### Entrada

Cuerpo JSON con parámetros como:

- `use_champion`
- `dataset_id`
- `run_id`
- `family`
- `input_level`
- `limit`
- `offset`
- `ids`
- `return_proba`
- `do_inference`
- `persist`

### Comportamiento por defecto

Si `do_inference=false`, el endpoint actúa principalmente como resolución y
validación del bundle, sin ejecutar inferencia.

### Inferencia opt-in

Si `do_inference=true` o si `input_uri="feature_pack"`, el endpoint:

1. resuelve el bundle del predictor;
2. determina el `dataset_id` efectivo;
3. ejecuta inferencia desde el feature-pack;
4. retorna predicciones, esquema de salida y advertencias.

### Persistencia opt-in

Si además `persist=true`, el endpoint guarda un `predictions.parquet` bajo
`artifacts/predictions/` y retorna su `predictions_uri`.

### Respuesta

- Código `200 OK`
- JSON con campos como:

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

### Errores típicos

- `404 Not Found` si no existe champion o predictor bundle
- `422 Unprocessable Entity`
  - si faltan parámetros requeridos;
  - si el bundle existe pero no está listo;
  - si `persist=true` sin `do_inference=true`
- `500 Internal Server Error` ante errores internos no esperados

### Diferencia respecto a `/predicciones/individual`

- `/predicciones/individual` trabaja sobre un par docente–materia y devuelve una
  respuesta analítica enriquecida.
- `/predicciones/predict` trabaja como endpoint de resolución/inferencia más
  genérico sobre el feature-pack y puede persistir outputs.

---

## `GET /predicciones/outputs/preview`

### Descripción

Devuelve una vista previa JSON de un archivo de predicciones persistido.

### Entrada

Parámetros de query:

- `predictions_uri` **requerido**
- `limit` opcional
- `offset` opcional

### Respuesta

- Código `200 OK`
- JSON con campos como:

  - `predictions_uri`
  - `rows`
  - `columns`
  - `output_schema`
  - `note`

### Errores típicos

- `404 Not Found` si el archivo no existe
- `422 Unprocessable Entity` si la URI o los parámetros no son válidos

### Uso en frontend

Este endpoint alimenta la vista previa tabular del historial de ejecuciones.

---

## `GET /predicciones/outputs/file`

### Descripción

Permite descargar el archivo parquet de predicciones persistido.

### Entrada

Parámetros de query:

- `predictions_uri` **requerido**

### Respuesta

- Respuesta de archivo con `application/octet-stream`
- nombre de archivo tomado desde la ruta resuelta

### Errores típicos

- `404 Not Found` si el archivo no existe
- `422 Unprocessable Entity` si la URI es inválida

---

## Dependencias de artefactos

Este router depende fuertemente de la existencia de artefactos generados en
etapas previas del pipeline.

Los más importantes son:

- `artifacts/features/<dataset_id>/pair_matrix.parquet`
- `artifacts/features/<dataset_id>/teacher_index.json`
- `artifacts/features/<dataset_id>/materia_index.json`
- `artifacts/features/<dataset_id>/meta.json`
- bundles de inferencia asociados al champion o al run seleccionado
- outputs bajo `artifacts/predictions/`

Si estos artefactos no existen, varios endpoints responderán con `404` o `422`.

---

## Relación con otras áreas del sistema

La API de `predicciones` depende de procesos previos de otras áreas:

- **Datos**
  - para disponer del dataset y, en muchos casos, del histórico etiquetado;
- **Jobs**
  - para la construcción del feature-pack y otros artefactos intermedios;
- **Modelos**
  - para entrenar, evaluar y promover un champion utilizable.

Por tanto, este router opera en la parte final del pipeline: consume artefactos
ya preparados y los convierte en resultados de predicción utilizables por la UI.
