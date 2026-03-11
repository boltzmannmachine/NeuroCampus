# Endpoints de jobs

La API de **jobs** agrupa procesos asíncronos o de larga duración del sistema.
En la implementación actual del backend, el router `/jobs` concentra sobre todo
operaciones del dominio **Datos** y una búsqueda específica de hiperparámetros
para RBM.

Todos los endpoints aquí descritos cuelgan del prefijo base:

- `/jobs`

---

## Alcance real del router en la versión actual

En la versión vigente, este router expone cuatro grupos funcionales:

1. **Ping de salud del router**
2. **Jobs de preprocesamiento BETO**
3. **Jobs de unificación histórica**
4. **Jobs de preparación de feature-pack**
5. **Jobs de búsqueda de hiperparámetros RBM**

### Importante

Aunque históricamente el proyecto asoció el concepto de “jobs” con más procesos
batch del sistema, en la implementación actual varios flujos de entrenamiento y
seguimiento de modelos viven en el router **`/modelos`**, no en `/jobs`.

Por tanto, este documento describe únicamente lo que el archivo
`backend/src/neurocampus/app/routers/jobs.py` expone hoy de forma efectiva.

---

## Resumen de endpoints principales

| Método | Ruta                                | Descripción |
| ------ | ----------------------------------- | ----------- |
| GET    | `/jobs/ping`                        | Verificación rápida de vida del router |
| POST   | `/jobs/preproc/beto/run`            | Lanza un job de preprocesamiento BETO |
| GET    | `/jobs/preproc/beto/{job_id}`       | Consulta el estado de un job BETO |
| GET    | `/jobs/preproc/beto`                | Lista jobs BETO recientes |
| POST   | `/jobs/data/unify/run`              | Lanza un job de unificación histórica |
| GET    | `/jobs/data/unify/{job_id}`         | Consulta el estado de un job de unificación |
| GET    | `/jobs/data/unify`                  | Lista jobs de unificación recientes |
| POST   | `/jobs/data/features/prepare/run`   | Lanza un job de preparación de feature-pack |
| GET    | `/jobs/data/features/prepare/{job_id}` | Consulta el estado de un job de feature-pack |
| GET    | `/jobs/data/features/prepare`       | Lista jobs de feature-pack recientes |
| POST   | `/jobs/training/rbm-search`         | Lanza una búsqueda de hiperparámetros RBM |
| GET    | `/jobs/training/rbm-search/{job_id}`| Consulta el estado de un job de búsqueda RBM |
| GET    | `/jobs/training/rbm-search`         | Lista jobs RBM search recientes |

---

## `GET /jobs/ping`

### Descripción

Endpoint mínimo para comprobar que el router `/jobs` está registrado
correctamente en la API.

### Respuesta

- Código `200 OK`
- Cuerpo típico:

```json
{
  "jobs": "pong"
}
```

---

# Jobs de preprocesamiento BETO

## `POST /jobs/preproc/beto/run`

### Descripción

Crea y lanza un job de análisis/preprocesamiento textual con BETO para un
`dataset` concreto.

Este endpoint está pensado para integrarse con la pestaña **Datos**, donde el
usuario activa el análisis de sentimientos o fuerza la reconstrucción del
procesado previo.

### Lógica real del backend

El flujo actual implementa esta secuencia:

1. Busca como entrada normalizada `data/processed/<dataset>.parquet`.
2. Si no existe, intenta encontrar el dataset crudo en:
   - `datasets/<dataset>.parquet`
   - `datasets/<dataset>.csv`
3. Si solo existe el dataset crudo, el job se marca con
   `needs_cargar_dataset=true` para normalizar antes de correr BETO.
4. Si existe el procesado pero está incompleto respecto a columnas docentes, el
   sistema puede reconstruirlo a partir del dataset crudo.
5. La salida esperada del job queda en:
   - `data/labeled/<dataset>_beto.parquet`

### Entrada

- Cuerpo JSON modelado por `BetoPreprocRequest`.
- La salida observada del código muestra como campos funcionales al menos:

  - `dataset`: identificador lógico del dataset.
  - `text_col`: columna de texto a procesar.
  - `keep_empty_text`: si se conservan filas sin texto útil.
  - `min_tokens`: umbral mínimo de tokens.
  - `text_feats`: modo de features de texto.
  - `text_feats_out_dir`: directorio de salida para artefactos de texto.
  - `empty_text_policy`: política de manejo de comentarios vacíos.
  - `force_cargar_dataset`: fuerza la reconstrucción del procesado si existe
    dataset crudo disponible.

### Comportamiento especial

- Si no existe ni el dataset procesado ni el dataset crudo, el endpoint responde
  `400 Bad Request`.
- Si `text_feats == "tfidf_lsa"` y no se define `text_feats_out_dir`, el backend
  genera una salida por defecto en `artifacts/textfeats/<dataset>`.
- Si no se define `empty_text_policy`, el backend usa:
  - `neutral` cuando `keep_empty_text=true`
  - `zero` cuando `keep_empty_text=false`

### Respuesta

- Código `200 OK`
- Cuerpo con estructura tipo `BetoPreprocJob`, incluyendo campos como:

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
  - `text_col`
  - `keep_empty_text`
  - `min_tokens`
  - `text_feats`
  - `text_feats_out_dir`
  - `empty_text_policy`
  - `raw_src`
  - `needs_cargar_dataset`

### Errores esperables

- `400` si no existe dataset procesado ni dataset crudo.
- `500` si falla la ejecución interna del job o su persistencia.

---

## `GET /jobs/preproc/beto/{job_id}`

### Descripción

Devuelve el estado de un job BETO específico.

### Entrada

- `job_id` en la ruta.

### Respuesta

- Código `200 OK` si el job existe.
- `404` si el identificador no corresponde a un job persistido.

El cuerpo devuelve el mismo modelo estructural del job BETO.

---

## `GET /jobs/preproc/beto`

### Descripción

Lista los jobs BETO recientes, en orden descendente de recencia.

### Entrada

- Query param opcional:
  - `limit` con valor por defecto `20`.

### Respuesta

- Código `200 OK`
- Lista JSON de objetos `BetoPreprocJob`.

### Uso en frontend

Este endpoint es útil para:

- mostrar el último estado de procesamiento BETO;
- recuperar jobs recientes de un dataset;
- rehidratar la UI tras recargar la página.

---

# Jobs de unificación histórica

## `POST /jobs/data/unify/run`

### Descripción

Lanza un job de unificación histórica sobre artefactos del dominio de datos.

Este endpoint alimenta las acciones de consolidación histórica que luego usa el
Dashboard y otros flujos de análisis transversal.

### Entrada

- Cuerpo JSON definido por `DataUnifyRequest`.
- Campos soportados:

  - `mode`: uno de:
    - `acumulado`
    - `acumulado_labeled`
    - `periodo_actual`
    - `ventana`
  - `ultimos`: número de periodos recientes, usado especialmente en modo
    `ventana`.
  - `desde`
  - `hasta`

### Modos reales soportados

#### `acumulado`
Genera unificado histórico general, típicamente orientado a:

- `historico/unificado.parquet`

#### `acumulado_labeled`
Genera unificado histórico etiquetado, típicamente orientado a:

- `historico/unificado_labeled.parquet`

#### `periodo_actual`
Genera unificado centrado en el periodo actual, típicamente bajo:

- `historico/periodo_actual/<periodo>.parquet`

#### `ventana`
Genera unificado en ventana temporal, típicamente bajo:

- `historico/ventanas/unificado_<tag>.parquet`

### Respuesta

- Código `200 OK`
- Cuerpo con estructura `DataUnifyJob`, incluyendo:

  - `id`
  - `status`
  - `created_at`
  - `started_at`
  - `finished_at`
  - `mode`
  - `out_uri`
  - `meta`
  - `error`

### Estados observables

El job se persiste en disco y pasa por estados como:

- `created`
- `running`
- `done`
- `failed`

---

## `GET /jobs/data/unify/{job_id}`

### Descripción

Consulta el estado de un job de unificación histórica específico.

### Entrada

- `job_id` en la ruta.

### Respuesta

- Código `200 OK` si existe.
- `404` si el job no fue encontrado.

---

## `GET /jobs/data/unify`

### Descripción

Lista jobs de unificación histórica recientes.

### Entrada

- Query param opcional:
  - `limit` con valor por defecto `20`.

### Respuesta

- Código `200 OK`
- Lista JSON de `DataUnifyJob`.

---

# Jobs de preparación de feature-pack

## `POST /jobs/data/features/prepare/run`

### Descripción

Lanza un job para construir el paquete persistente de características usado en
etapas posteriores de entrenamiento y modelado.

La salida se orienta a la carpeta:

- `artifacts/features/<dataset_id>/`

con artefactos como:

- `train_matrix.parquet`

### Entrada

- Cuerpo JSON definido por `FeaturesPrepareRequest`.
- Campos soportados:

  - `dataset_id`
  - `input_uri` opcional
  - `output_dir` opcional
  - `force`
  - `text_feats_mode`
  - `text_col`
  - `text_n_components`
  - `text_min_df`
  - `text_max_features`

### Resolución de entrada

Si `input_uri` no se especifica, el backend intenta resolver la fuente del
feature-pack en este orden:

1. `data/processed/<dataset_id>.parquet`
2. `data/labeled/<dataset_id>_beto.parquet`
3. `historico/unificado_labeled.parquet`
4. `datasets/<dataset_id>.parquet`
5. `datasets/<dataset_id>.csv`

### Comportamiento importante

- Si los artefactos esperados ya existen y `force=false`, el job puede cerrarse
  como `done` sin recalcularlos.
- El job guarda la configuración de texto para trazabilidad del proceso.
- La construcción real delega en `neurocampus.data.features_prepare.prepare_feature_pack`.

### Respuesta

- Código `200 OK`
- Cuerpo con estructura `FeaturesPrepareJob`, con campos como:

  - `id`
  - `status`
  - `created_at`
  - `started_at`
  - `finished_at`
  - `dataset_id`
  - `input_uri`
  - `output_dir`
  - `force`
  - `text_feats_mode`
  - `text_col`
  - `text_n_components`
  - `text_min_df`
  - `text_max_features`
  - `artifacts`
  - `error`

---

## `GET /jobs/data/features/prepare/{job_id}`

### Descripción

Devuelve el estado de un job de preparación de feature-pack.

### Entrada

- `job_id` en la ruta.

### Respuesta

- Código `200 OK` si existe.
- `404` si no existe el job.

---

## `GET /jobs/data/features/prepare`

### Descripción

Lista jobs recientes de preparación de feature-pack.

### Entrada

- Query param opcional:
  - `limit` con valor por defecto `20`.

### Respuesta

- Código `200 OK`
- Lista JSON de `FeaturesPrepareJob`.

---

# Jobs de búsqueda de hiperparámetros RBM

## `POST /jobs/training/rbm-search`

### Descripción

Lanza un job de búsqueda de hiperparámetros para RBM.

### Entrada

- Query param opcional:
  - `config`: ruta del archivo de configuración.

### Comportamiento real

- Si no se envía `config`, el backend intenta usar por defecto:
  - `configs/rbm_search.yaml`
- Si la ruta configurada no existe, responde `400`.
- El job persiste metadatos como:
  - `id`
  - `status`
  - `created_at`
  - `started_at`
  - `finished_at`
  - `error`
  - `config_path`
  - `last_run_id`

### Respuesta

- Código `200 OK`
- Cuerpo con estructura `RbmSearchJob`.

### Observación funcional

Aunque este endpoint vive en `/jobs`, la operación está conceptualmente ligada
al dominio de entrenamiento/modelado y complementa flujos más amplios que hoy se
encuentran también en `/modelos`.

---

## `GET /jobs/training/rbm-search/{job_id}`

### Descripción

Devuelve el estado de un job específico de búsqueda RBM.

### Entrada

- `job_id` en la ruta.

### Respuesta

- Código `200 OK` si existe.
- `404` si el job no existe.

---

## `GET /jobs/training/rbm-search`

### Descripción

Lista jobs recientes de búsqueda de hiperparámetros RBM.

### Entrada

- Query param opcional:
  - `limit` con valor por defecto `20`.

### Respuesta

- Código `200 OK`
- Lista JSON de `RbmSearchJob`.

---

## Consideraciones de uso

En la implementación actual, el router `/jobs` se usa principalmente como capa
operativa de ejecución asíncrona. Esto implica que:

- no todos los resultados finales se obtienen directamente en la respuesta
  inicial del `POST`;
- lo normal es lanzar el job y luego consultar su estado por `job_id`;
- muchos artefactos generados quedan persistidos en disco y se referencian por
  rutas o URIs en los metadatos del job.

Por eso, al integrar frontend o automatizaciones, el patrón recomendado es:

1. lanzar el job;
2. capturar `job_id`;
3. consultar el endpoint de estado correspondiente;
4. leer `out_uri`, `artifacts`, `meta` o `error` según el resultado.
