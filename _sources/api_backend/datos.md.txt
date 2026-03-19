# Endpoints de datos

La API de datos agrupa los endpoints relacionados con la **validación**,
**ingesta**, **consulta** y **visualización preliminar** de datasets usados por
NeuroCampus.

Todos los endpoints documentados en esta página cuelgan del prefijo base:

- `/datos`

---

## Resumen de endpoints vigentes

| Método | Ruta                  | Descripción |
| ------ | --------------------- | ----------- |
| GET    | `/datos/ping`         | Verificación rápida del router de datos |
| GET    | `/datos/esquema`      | Devuelve el esquema esperado de la plantilla |
| POST   | `/datos/validar`      | Valida un archivo sin persistirlo |
| POST   | `/datos/upload`       | Sube y registra el dataset del periodo indicado |
| GET    | `/datos/preview`      | Devuelve una vista tabular del dataset |
| GET    | `/datos/resumen`      | Devuelve KPIs y resumen estructural del dataset |
| GET    | `/datos/sentimientos` | Devuelve agregados de sentimientos del dataset etiquetado |

---

## `GET /datos/ping`

### Descripción

Endpoint de salud mínimo del contexto **datos**.

Permite verificar rápidamente que:

- el router está registrado correctamente en la API;
- el prefijo `/datos` responde;
- la comunicación frontend-backend está disponible para este dominio.

### Respuesta

Código `200 OK` con una estructura simple como:

```json
{
  "datos": "pong"
}
```

---

## `GET /datos/esquema`

### Descripción

Devuelve el esquema esperado para la plantilla de evaluaciones docentes.

Este endpoint intenta primero leer el archivo:

```text
schemas/plantilla_dataset.schema.json
```

Si ese archivo no existe o no puede parsearse, el backend utiliza un
**esquema de respaldo** incorporado en el router.

### Parámetros

- `version` (opcional)
  - reservado para futuras extensiones;
  - en la implementación actual no cambia el resultado efectivo.

### Respuesta

Código `200 OK` con un objeto tipado (`EsquemaResponse`) que contiene, al menos:

- `version`
- `columns`

Cada columna puede incluir información como:

- `name`
- `dtype`
- `required`
- `range`
- `max_len`
- `domain`

### Observaciones de implementación

El esquema fallback actual incluye campos como:

- `periodo`
- `codigo_materia`
- `grupo`
- `pregunta_1` a `pregunta_10`
- `Sugerencias:`

Esto permite que la UI siga funcionando incluso si no está disponible el JSON
formal del esquema.

---

## `POST /datos/validar`

### Descripción

Valida un archivo de datos **sin persistirlo en disco**.

Este endpoint está diseñado para el flujo previo a la carga definitiva desde la
pestaña **Datos**.

### Entrada

Se espera `multipart/form-data` con estos campos:

- `file`
  - archivo de entrada;
  - formatos soportados: `csv`, `xlsx`, `parquet`.
- `dataset_id`
  - identificador lógico del dataset.
- `fmt` (opcional)
  - fuerza el lector a uno de estos valores:
    - `csv`
    - `xlsx`
    - `parquet`

### Comportamiento real

La implementación actual realiza este flujo:

1. lee el archivo en memoria;
2. rechaza archivos vacíos;
3. valida que el formato sea soportado;
4. construye un `sample` auxiliar con las primeras filas;
5. delega la validación al wrapper unificado `validar_archivo(...)`;
6. enriquece la respuesta con `dataset_id` y `sample`.

### Respuestas posibles

#### `200 OK`

Cuando el archivo es legible y la validación se ejecuta correctamente.

La respuesta puede incluir campos como:

- `ok`
- `errors`
- `warnings`
- `dataset_id`
- `sample`

#### `400 Bad Request`

Casos típicos:

- archivo vacío;
- formato no soportado;
- error de decodificación del CSV.

Ejemplo de detalle posible:

```text
Formato no soportado. Use csv/xlsx/parquet o especifique 'fmt'.
```

#### `500 Internal Server Error`

Si ocurre un error inesperado durante la validación.

### Notas importantes

- Este endpoint **no persiste** el archivo.
- El `sample` es una vista previa auxiliar para frontend y compatibilidad con
  tests.
- El nombre del parámetro es `dataset_id`, aunque en el flujo funcional del
  sistema el identificador operativo final suele alinearse con el periodo.

---

## `POST /datos/upload`

### Descripción

Realiza la ingesta real del dataset en el sistema.

En la implementación actual, este endpoint escribe el dataset en:

```text
<repo_root>/datasets/{periodo}.parquet
```

Si no hay soporte disponible para parquet, el backend hace fallback a:

```text
<repo_root>/datasets/{periodo}.csv
```

### Entrada

Se espera `multipart/form-data` con estos campos:

- `file`
  - archivo `csv`, `xlsx` o `parquet`.
- `periodo`
  - identificador del periodo, por ejemplo `2024-2`.
- `dataset_id`
  - alias mantenido por compatibilidad;
  - actualmente **se ignora** y se usa `periodo` como identificador efectivo.
- `overwrite`
  - booleano opcional;
  - controla si puede reemplazarse un dataset ya existente.

### Comportamiento real

1. valida que `periodo` exista;
2. valida el formato por extensión;
3. resuelve el directorio de salida `datasets/`;
4. verifica si ya existe `{periodo}.parquet` o `{periodo}.csv`;
5. si existe y `overwrite=false`, responde `409 Conflict`;
6. lee el archivo con `read_file(...)`;
7. intenta persistirlo como parquet;
8. si falla el motor parquet, persiste como CSV;
9. devuelve un `DatosUploadResponse`.

### Respuesta exitosa

Código `201 Created`.

Campos relevantes de salida:

- `dataset_id`
- `rows_ingested`
- `stored_as`
- `warnings`

Ejemplo conceptual:

```json
{
  "dataset_id": "2024-2",
  "rows_ingested": 530,
  "stored_as": "localfs://neurocampus/datasets/2024-2.parquet",
  "warnings": []
}
```

### Respuestas de error

#### `400 Bad Request`

- falta `periodo`;
- archivo vacío;
- formato no soportado.

#### `409 Conflict`

Se devuelve si el dataset ya existe y no se activó `overwrite`.

Detalle típico:

```text
El dataset '2024-2' ya existe. Activa 'overwrite' para reemplazarlo.
```

#### `500 Internal Server Error`

Error inesperado durante lectura o escritura.

### Observación funcional importante

Este endpoint confirma lo que ya se observa en la UI actual: el identificador
real de persistencia está gobernado por **`periodo`**, no por el texto libre de
`dataset_id`.

---

## `GET /datos/preview`

### Descripción

Devuelve una vista tabular del dataset para poblar la tabla de la pestaña
**Datos**.

### Parámetros de query

- `dataset` (requerido)
  - alias del parámetro `dataset_id` en el backend.
- `variant`
  - valores admitidos:
    - `processed`
    - `labeled`
  - por defecto: `processed`.
- `mode`
  - valores admitidos:
    - `ui`
    - `raw`
  - por defecto: `ui`.
- `limit`
  - mínimo `1`, máximo `200`;
  - por defecto `25`.
- `offset`
  - mínimo `0`.

### Comportamiento real

- Si `variant=labeled`, el endpoint intenta cargar el dataset etiquetado.
- Si `variant=processed`, intenta cargar el dataset procesado.
- Luego construye una respuesta tipada mediante `build_dataset_preview(...)`.

### Respuesta

Código `200 OK` con un objeto `DatasetPreviewResponse`.

Su contenido está pensado para renderizar:

- columnas de la tabla;
- filas paginadas;
- metadatos de fuente;
- modo y variante seleccionados.

### Errores

- `404 Not Found`
  - si el archivo fuente no existe.
- `500 Internal Server Error`
  - si falla la construcción del preview.

### Observación importante

Este endpoint no estaba reflejado en la documentación anterior y hoy es parte
real del soporte a la tabla de vista previa del frontend.

---

## `GET /datos/resumen`

### Descripción

Devuelve KPIs generales y un resumen estructural del dataset para la pestaña
**Datos**.

### Parámetros de query

- `dataset` (requerido)
  - alias del parámetro lógico `dataset_id`.

### Fuente de datos

El backend intenta leer el dataset procesado asociado al identificador indicado.

Según la configuración y helpers de dominio, la fuente puede resolverse desde
rutas equivalentes a:

- `data/processed/{dataset_id}.parquet`
- o variantes de resolución equivalentes definidas por helpers internos.

### Respuesta

Código `200 OK` con un `DatasetResumenResponse`.

Incluye información como:

- `n_rows`
- `n_cols`
- `periodos`
- número de docentes
- número de asignaturas
- resumen de columnas

### Errores

- `404 Not Found`
  - si no existe dataset procesado para el identificador dado.
- `500 Internal Server Error`
  - si ocurre un error al leer el dataset.

### Uso en la UI

Este endpoint soporta los KPIs visibles del resumen del dataset y parte de la
información que se presenta en la tabla y tarjetas de la pestaña **Datos**.

---

## `GET /datos/sentimientos`

### Descripción

Devuelve la distribución de sentimientos del dataset etiquetado con BETO.

### Parámetros de query

- `dataset` (requerido)
  - alias del identificador lógico del dataset.

### Fuente de datos

El endpoint intenta leer el dataset etiquetado desde helpers de dominio,
normalmente asociado a salidas como:

- `data/labeled/{dataset_id}_beto.parquet`
- o variantes compatibles como datasets `teacher`.

### Respuesta

Código `200 OK` con un `DatasetSentimientosResponse`.

La respuesta está pensada para alimentar visualizaciones como:

- distribución global de polaridad;
- agregados por docente;
- agregados por asignatura.

Campos conceptualmente esperados:

- `total_comentarios`
- `global_counts`
- `por_docente`
- `por_asignatura`

### Errores

- `404 Not Found`
  - si no existe dataset etiquetado para ese identificador.
- `422 Unprocessable Entity`
  - si falta una columna esperada en el dataset etiquetado.
- `500 Internal Server Error`
  - si ocurre un error no controlado en la construcción del resumen.

### Uso funcional

Este endpoint soporta directamente las visualizaciones de sentimiento de la
pestaña **Datos** y también puede servir de insumo a otras vistas analíticas.

---

## Observaciones de diseño de la API de datos

La implementación actual revela dos convenciones importantes:

1. **`periodo` gobierna la persistencia real en upload**
   - aunque `dataset_id` siga existiendo por compatibilidad.
2. **`dataset` se usa como alias en varios `GET`**
   - para `preview`, `resumen` y `sentimientos`.

Esto significa que, al documentar o consumir esta API, conviene distinguir entre:

- el nombre formal del parámetro en cada endpoint,
- y el identificador lógico efectivo que usa el pipeline.