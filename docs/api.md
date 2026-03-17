> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior del proyecto y puede no reflejar el comportamiento actual del software.
>
> **Documentación activa relacionada:**
> - `docs/source/api_backend/index.md`
> - `docs/source/api_backend/datos.md`
> - `docs/source/api_backend/jobs.md`
> - `docs/source/api_backend/admin.md`
> - `docs/source/api_backend/dashboard.md`
> - `docs/source/api_backend/prediccion.md`
> - `docs/source/api_backend/predicciones.md`
> - `docs/source/api_backend/modelos.md`
>
> ---
### v0.3.0 (resumen histórico)
- `POST /datos/validar` (multipart) y mejoras de lectura/normalización/coerción de tipos.
- Documentación de equivalencias de encabezados y JSON Schema.

---

# Apéndice A — Especificación completa v0.3.0 (sin cambios)

> Esta sección conserva íntegramente la versión anterior para evitar pérdida de información y facilitar comparaciones de contratos.

# NeuroCampus API — v0.3.0

---

## Convenciones
- **Base URL**: `http://127.0.0.1:8000`
- **Auth**: (TBD Día 3+)
- **Formato**: `application/json; charset=utf-8`
- **Fechas**: ISO-8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Errores**: cuerpo `{ "error": string, "code"?: string }`
- **Números**: `float64` (salvo que se indique lo contrario)
- **Nombres**: `snake_case` en claves de JSON

### Códigos de estado (uso común)
- `200 OK` → operación síncrona exitosa (devuelve resultado)
- `201 Created` → recurso creado (ej. upload)
- `202 Accepted` → operación encolada/asíncrona (devuelve `job_id`)
- `400 Bad Request` → validación/entrada inválida
- `404 Not Found` → recurso o `job_id` inexistente
- `409 Conflict` → conflicto lógico (p.ej. dataset existente con overwrite=false)
- `500 Internal Server Error` → error no controlado

---

## 1 /datos

### 1.1 GET `/datos/esquema`

Devuelve el esquema del dataset esperado para carga inicial.  
La respuesta se construye a partir de `schemas/plantilla_dataset.schema.json` (con fallback en memoria).

**Ejemplo de respuesta:**
```json
{
  "version": "v0.3.0",
  "columns": [
    { "name": "periodo", "dtype": "string", "required": true, "pattern": "^[0-9]{4}-(1|2)$" },
    { "name": "codigo_materia", "dtype": "string", "required": true },
    { "name": "grupo", "dtype": "integer", "required": true, "pattern": "^[A-Za-z0-9_-]{1,10}$" },
    { "name": "pregunta_1", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_2", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_3", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_4", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_5", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_6", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_7", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_8", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_9", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_10", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "Sugerencias:", "dtype": "string", "required": false, "max_len": 5000 }
  ]
}
```
**Atributos de columnas**
- `dtype`: tipo esperado (`string`, `integer`, `number`, `boolean`, `date`, etc.).  
- `domain` (opcional): `{ "allowed": [...]} | { "min": num, "max": num }`  
- `pattern` (opcional): expresión **regex** que el valor debe cumplir (JSON Schema: `pattern`).  
  Ejemplo: `"pattern": "^[0-9]{4}-(1|2)$"` para el campo `periodo`.

**Notas de normalización**
- Encabezados se normalizan (espacios↔`_`, acentos, “:”) y se soportan sinónimos (`codigo_materia ≡ código asignatura`).  
- Se aplica coerción de tipos previa para reducir falsos `BAD_TYPE`.

#### Patrones sugeridos
| Columna | Patrón (regex) | Descripción |
|----------|----------------|--------------|
| `periodo` | `^[0-9]{4}-(1|2)$` | Año y semestre (ej. 2024-1) |
| `grupo` | `^[A-Za-z0-9_-]{1,10}$` | Grupo académico (letras/números) |
| `pregunta_1..pregunta_10` | `^pregunta_[1-9][0-9]?$` | Campos de evaluación normalizados |

---

### 1.2 POST `/datos/upload`

Permite subir un archivo CSV o XLSX con los datos de evaluación docente.  
La carga se valida según `schemas/plantilla_dataset.schema.json` (nivel mínimo, mock hasta persistencia real).

**Body (multipart/form-data)**
- `file`: Archivo CSV/XLSX a subir.
- `periodo`: Cadena que indica el periodo académico (ej. `"2024-2"`).
- `overwrite`: Booleano, indica si se debe sobrescribir un dataset existente.

**Importante:**  
Los campos derivados de PLN — `comentario.sent_pos`, `comentario.sent_neg`, `comentario.sent_neu` — **no deben incluirse** en el archivo cargado.  
Estos valores se **calcularán** durante la etapa de análisis de sentimientos (Día 6).

**201 — Response**
```json
{
  "dataset_id": "2024-2",
  "rows_ingested": 1250,
  "stored_as": "s3://neurocampus/datasets/2024-2.parquet",
  "warnings": ["col 'grupo' vacío en 32 filas"]
}
```

**409 — Response** (overwrite=false y ya existe)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Dataset 2024-2 ya existe"
  }
}
```

---

### 1.3 POST `/datos/validar`

Valida un archivo de datos **sin** almacenarlo. Ejecuta cadena: **esquema → tipos → dominio → duplicados → calidad**.  
Soporta **CSV/XLSX/Parquet** y funciona con **Pandas** o **Polars** (configurable).

**Body (multipart/form-data)**
- `file`: Archivo `CSV | XLSX | Parquet`.
- `fmt` (opcional): fuerza el lector, uno de `"csv" | "xlsx" | "parquet"`.
```json
{
  "periodo": "2024-2",
  "inline_data_csv": "base64-CSV-o-URL-opcional",
  "rules": { "strict_types": true, "duplicate_keys": ["docente_id", "asignatura_id", "grupo"] }
}
```

**200 — Response**
```json
{
  "summary": { "rows": 1250, "errors": 5, "warnings": 18, "engine": "pandas" },
  "issues": [
    { "code": "MISSING_COLUMN", "severity": "error", "column": "pregunta_7", "row": null, "message": "Columna requerida ausente: pregunta_7" },
    { "code": "BAD_TYPE", "severity": "warning", "column": "codigo_materia", "row": null, "message": "Tipo esperado string vs observado int64" },
    { "code": "DOMAIN_VIOLATION", "severity": "error", "column": "periodo", "row": null, "message": "Valor fuera de dominio en periodo: 2024-13" },
    { "code": "PATTERN_MISMATCH", "severity": "error", "column": "periodo", "row": 42, "message": "Valor '2024-3' no cumple ^[0-9]{4}-(1|2)$" }
  ]
}
```

**Códigos**
- `200` validado con éxito
- `400` error al procesar archivo / formato inválido

**Issues — códigos posibles**
- `MISSING_COLUMN`, `BAD_TYPE`, `DOMAIN_VIOLATION`, `RANGE_VIOLATION`, `DUPLICATE_ROW`, `HIGH_NULL_RATIO`, **`PATTERN_MISMATCH`**.  
- `PATTERN_MISMATCH`: el valor no cumple la expresión regular definida en el esquema.

**Notas**
- El engine por defecto es **`pandas`**, configurable con `NC_DF_ENGINE=polars`.
- No persiste ni transforma el archivo; es solo validación para reporte en UI.
- El contrato de respuesta corresponde a `DatosValidarResponse` (Pydantic).
- Encabezados se normalizan (espacios/acentos).  
- Tipos y patrones se validan tras coerción inicial de datos.  
- La salida incluye `summary` (totales) y `issues[]` (detalle fila/columna).

#### 🆕 Normalización de encabezados y equivalencias
La validación **tolera nombres de columnas con espacios o con `_`**, acentos y signos como `:`.  
Internamente se normalizan (minúsculas, sin acentos, sin puntuación) y se aplican sinónimos básicos.

**Ejemplos de equivalencias admitidas:**
- `codigo_materia` ≡ `codigo materia` ≡ `Código Materia` ≡ `codigo_asignatura`
- `cedula_profesor` ≡ `cedula profesor` ≡ `cédula docente` ≡ `docente_id`
- `Sugerencias:` ≡ `sugerencias` ≡ `Sugerencias`  
*(Se ignoran columnas `Unnamed: N` y se mantienen los nombres canónicos en el reporte).*

#### 🆕 Coerción de tipos antes de validar
Si el esquema define el tipo de una columna, se intenta **coaccionar** el dato antes de reportar `BAD_TYPE`:
- `string`: convierte enteros/números a cadena (IDs como `codigo_materia`, `cedula_profesor`).
- `integer`: `to_numeric(...).astype("Int64")` (pandas) o `Int64` (polars).
- `number`: `float`.
- `boolean`: mapeo automático (`true/false/1/0`).
- `date/datetime`: `to_datetime(..., errors="coerce")`.
- **Nullables**: se respetan tipos del estilo `["string","null"]` (JSON Schema).

#### 🆕 Lectura de archivos (robusta)
- **CSV**: reintentos con `utf-8-sig` y `latin-1`; autodetección de separador (`; | tab | ,`) y manejo de BOM.
- **XLSX** con Polars: lectura vía **pandas** y conversión a **polars**.
- **Parquet**: lectura nativa.

#### 🆕 Esquema aceptado
- **JSON Schema** (`properties`, `required`, `enum`, `minimum/maximum`) **o**
- Formato nativo: `{"columns":[{"name","dtype","domain{allowed|min|max}"}]}`.

#### 🆕 Resolución del schema en runtime
- El backend intenta localizar `schemas/plantilla_dataset.schema.json` subiendo directorios desde el código.
- Se puede forzar la ruta con `NC_SCHEMA_PATH=/ruta/absoluta/plantilla_dataset.schema.json`.

---

## 2 /modelos

<!-- Entrenamiento, estado y publicación de modelos. -->

### 2.1 POST `/modelos/entrenar`

**Body**
```json
{
  "nombre": "rbm_r1_2024_2",
  "tipo": "rbm_restringida",
  "metodologia": "PeriodoActual",
  "dataset_id": "2024-2",
  "params": {
    "hidden_units": 128,
    "learning_rate": 0.01,
    "epochs": 30,
    "batch_size": 256,
    "regularization": "l2",
    "seed": 42
  }
}
```

**202 — Response**
```json
{ "job_id": "job_train_01H8ZK...", "status": "QUEUED" }
```

---

### 2.2 GET `/modelos/estado`

**Query**
- `limit`: int (default 20)

**200 — Response**
```json
{
  "items": [
    {
      "nombre": "rbm_r1_2024_2",
      "tipo": "rbm_restringida",
      "dataset_id": "2024-2",
      "created_at": "2025-09-09T10:00:00Z",
      "status": "COMPLETED",
      "metrics": { "f1_macro": 0.81, "accuracy": 0.86 },
      "artifact_uri": "s3://neurocampus/models/rbm_r1_2024_2/"
    },
    {
      "nombre": "rbm_g1_2024_1",
      "tipo": "rbm_general",
      "dataset_id": "2024-1",
      "status": "FAILED",
      "error": "Divergencia en entrenamiento"
    }
  ]
}
```

---

### 2.3 POST `/modelos/publicar`

**Body**
```json
{ "nombre": "rbm_r1_2024_2", "canal": "produccion" }
```

**200 — Response**
```json
{ "published": true, "canal": "produccion", "nombre": "rbm_r1_2024_2" }
```

---

## 3 /prediccion

### 3.1 POST `/prediccion/online`

**Body**
```json
{
  "modelo": "rbm_r1_2024_2",
  "payload": {
    "periodo": "2024-2",
    "docente_id": "DOC123",
    "asignatura_id": "QCH-201",
    "grupo": "A",
    "score_global": 4.3,
    "comentario": "Buena comunicación, carga alta."
  }
}
```

**200 — Response**
```json
{
  "modelo": "rbm_r1_2024_2",
  "pred": { "label": "alto_desempeno", "score": 0.82, "confianza": 0.77 },
  "explicacion": { "features_top": ["score_global", "comentario.sentimiento_pos"] },
  "metadata": { "latencia_ms": 42 }
}
```

---

### 3.2 POST `/prediccion/batch`

**Body (multipart/form-data)**
- `file`: CSV/XLSX (opcional si se pasa `dataset_id`)
- `dataset_id`: string (opcional)
- `modelo`: string (opcional; si no, usa el publicado en canal `produccion`)
- `download`: enum(`csv`,`parquet`) — default `csv`

**202 — Response**
```json
{ "job_id": "job_pred_01H8ZL...", "status": "QUEUED" }
```

---

## 4 /jobs

*(Reservado para próximos días de desarrollo)*

### 4.1 POST `/jobs/run`

**Body**
```json
{
  "command": "entrenamiento_completo",
  "args": { "dataset_id": "2024-2", "tipo": "rbm_restringida" }
}
```

**202 — Response**
```json
{ "job_id": "job_pipe_01H8ZM...", "status": "QUEUED" }
```

---

### 4.2 GET `/jobs/status/{id}`

**200 — Response**
```json
{
  "job_id": "job_pipe_01H8ZM...",
  "status": "RUNNING",
  "started_at": "2025-09-09T10:05:00Z",
  "steps": [
    { "name": "cargar_dataset", "status": "DONE", "duration_s": 5 },
    { "name": "unificar_historico", "status": "DONE", "duration_s": 11 },
    { "name": "entrenar", "status": "RUNNING", "progress": 0.6 }
  ],
  "logs_tail": [
    "epoch=18/30 loss=0.42 acc=0.85",
    "epoch=19/30 loss=0.41 acc=0.86"
  ]
}
```

---

### 4.3 GET `/jobs/list`

**Query**
- `kind`: enum(`train`,`predict`,`pipeline`) (opcional)
- `limit`: int (default 50)

**200 — Response**
```json
{
  "items": [
    { "job_id": "job_train_01H8ZK...", "status": "COMPLETED", "ended_at": "2025-09-09T10:18:12Z" },
    { "job_id": "job_pred_01H8ZL...", "status": "FAILED", "error": "Archivo inválido" }
  ]
}
```

---

## 5 Esquemas Pydantic (resumen)

- `DatosUploadResponse`: `dataset_id:string`, `rows_ingested:int`, `stored_as:string`, `warnings:string[]`
- `DatosValidarResponse`: `summary{rows:int,errors:int,warnings:int,engine:string}`, `issues[ValidIssue]`
- `ValidIssue`: `code,severity("error"|"warning"),column?,row?,message`
- `EntrenarRequest`: `nombre,tipo,metodologia,dataset_id,params{...}`
- `ModeloEstadoItem`: `nombre,tipo,dataset_id,status,metrics?,error?,artifact_uri?`
- `PublicarRequest`: `nombre,canal`
- `PredOnlineRequest`: `modelo?,payload{...}`
- `PredOnlineResponse`: `modelo,pred{label,score,confianza},explicacion?,metadata?`
- `JobRunRequest`: `command,args{...}`
- `JobStatus`: `job_id,status,steps[],logs_tail[]`

---

## 6 Ejemplos de uso (curl)

**Validar sin almacenar (CSV)**
```bash
curl -X POST http://127.0.0.1:8000/datos/validar   -F "file=@examples/dataset_ejemplo.csv"
```

**Validar forzando formato XLSX**
```bash
curl -X POST http://127.0.0.1:8000/datos/validar   -F "file=@examples/plantilla.xlsx"   -F "fmt=xlsx"
```

**Subir datos**
```bash
curl -X POST http://localhost:8000/datos/upload   -F "file=@./examples/dataset_ejemplo.csv"   -F periodo=2024-2
```

**Entrenar RBM**
```bash
curl -X POST http://localhost:8000/modelos/entrenar   -H "Content-Type: application/json"   -d '{
    "nombre":"rbm_r1_2024_2","tipo":"rbm_restringida","metodologia":"PeriodoActual","dataset_id":"2024-2",
    "params":{"hidden_units":128,"learning_rate":0.01,"epochs":30,"batch_size":256,"regularization":"l2","seed":42}
  }'
```

**Predicción online**
```bash
curl -X POST http://localhost:8000/prediccion/online   -H "Content-Type: application/json"   -d '{
    "modelo":"rbm_r1_2024_2",
    "payload":{"periodo":"2024-2","docente_id":"DOC123","asignatura_id":"QCH-201","grupo":"A","score_global":4.3,"comentario":"Buena comunicación"}
  }'
```

---

## 7 Notas de versión v0.3.0

- **Nuevo:** `POST /datos/validar` (multipart) para validar CSV/XLSX/Parquet sin almacenar.
- **Contrato:** respuesta con `summary{rows,errors,warnings,engine}` e `issues[]`.
- **Config:** soporte de engine `pandas`/`polars` (env `NC_DF_ENGINE`).
- **Docs:** se documenta **normalización de encabezados**, **coerción de tipos**, **lectura CSV robusta**, soporte de **JSON Schema** y `NC_SCHEMA_PATH`.
- **Mantiene**: endpoints de `/modelos`, `/prediccion` y `/jobs` documentados para MVP.

---

## 8 Referencias internas

- Estructura del repositorio y módulos de backend/frontend.
- Mockups/pestaña **Datos** para presentar KPIs y tabla de issues de validación.

# NeuroCampus API — v0.4.0 (con Apéndice v0.3.0)

Este documento contiene primero la **especificación v0.4.0** (vigente) y, como **Apéndice**, la **v0.3.0 completa** para referencia histórica y compatibilidad.

# NeuroCampus API — v0.4.0

> **Release focus (Día 4)**: Plantilla de entrenamiento + estrategias RBM (general/restringida) instrumentadas con eventos de observabilidad `training.*`, y contratos mínimos conectados en `/modelos`.

---

## Convenciones
- **Base URL**: `http://127.0.0.1:8000`
- **Auth**: (TBD)
- **Formato**: `application/json; charset=utf-8`
- **Fechas**: ISO-8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Errores**: cuerpo `{ "error": string, "code"?: string }`
- **Números**: `float64` (salvo que se indique lo contrario)
- **Nombres**: `snake_case` en claves de JSON

### Códigos de estado (uso común)
- `200 OK` → operación síncrona exitosa o **aceptada** con ejecución en background (caso `/modelos/entrenar`).
- `201 Created` → recurso creado
- `202 Accepted` → reservado para colas externas (futuro)
- `400 Bad Request` → validación/entrada inválida
- `404 Not Found` → recurso o `job_id` inexistente
- `409 Conflict` → conflicto lógico
- `500 Internal Server Error` → error no controlado

---

## 1 /datos

### 1.1 GET `/datos/esquema`

Devuelve el esquema del dataset esperado para carga inicial.  
La respuesta se construye a partir de `schemas/plantilla_dataset.schema.json` (con fallback en memoria).

**Ejemplo de respuesta:**
```json
{
  "version": "v0.3.0",
  "columns": [
    { "name": "periodo", "dtype": "string", "required": true, "pattern": "^[0-9]{4}-(1|2)$" },
    { "name": "codigo_materia", "dtype": "string", "required": true },
    { "name": "grupo", "dtype": "integer", "required": true, "pattern": "^[A-Za-z0-9_-]{1,10}$" },
    { "name": "pregunta_1", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_2", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_3", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_4", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_5", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_6", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_7", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_8", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_9", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "pregunta_10", "dtype": "number", "required": true, "range": [0, 50] },
    { "name": "Sugerencias:", "dtype": "string", "required": false, "max_len": 5000 }
  ]
}
```
**Atributos de columnas**
- `dtype`: tipo esperado (`string`, `integer`, `number`, `boolean`, `date`, etc.).  
- `domain` (opcional): `{ "allowed": [...]} | { "min": num, "max": num }`  
- `pattern` (opcional): expresión **regex** que el valor debe cumplir (JSON Schema: `pattern`).

**Notas de normalización**
- Encabezados se normalizan (espacios↔`_`, acentos, “:”) y se soportan sinónimos (`codigo_materia ≡ código asignatura`).  
- Se aplica coerción de tipos previa para reducir falsos `BAD_TYPE`.

#### Patrones sugeridos
| Columna | Patrón (regex) | Descripción |
|----------|----------------|--------------|
| `periodo` | `^[0-9]{4}-(1|2)$` | Año y semestre (ej. 2024-1) |
| `grupo` | `^[A-Za-z0-9_-]{1,10}$` | Grupo académico (letras/números) |
| `pregunta_1..pregunta_10` | `^pregunta_[1-9][0-9]?$` | Campos de evaluación normalizados |

---

### 1.2 POST `/datos/upload`

Permite subir un archivo CSV o XLSX con los datos de evaluación docente.  
La carga se valida según `schemas/plantilla_dataset.schema.json` (nivel mínimo, mock hasta persistencia real).

**Body (multipart/form-data)**
- `file`: Archivo CSV/XLSX a subir.
- `periodo`: Cadena que indica el periodo académico (ej. `"2024-2"`).
- `overwrite`: Booleano, indica si se debe sobrescribir un dataset existente.

**201 — Response**
```json
{
  "dataset_id": "2024-2",
  "rows_ingested": 1250,
  "stored_as": "s3://neurocampus/datasets/2024-2.parquet",
  "warnings": ["col 'grupo' vacío en 32 filas"]
}
```

**409 — Response** (overwrite=false y ya existe)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Dataset 2024-2 ya existe"
  }
}
```

---

### 1.3 POST `/datos/validar`

Valida un archivo de datos **sin** almacenarlo. Ejecuta cadena: **esquema → tipos → dominio → duplicados → calidad**.  
Soporta **CSV/XLSX/Parquet** y funciona con **Pandas** o **Polars** (configurable).

**Body (multipart/form-data)**
- `file`: Archivo `CSV | XLSX | Parquet`.
- `fmt` (opcional): fuerza el lector, uno de `"csv" | "xlsx" | "parquet"`.
```json
{
  "periodo": "2024-2",
  "inline_data_csv": "base64-CSV-o-URL-opcional",
  "rules": { "strict_types": true, "duplicate_keys": ["docente_id", "asignatura_id", "grupo"] }
}
```

**200 — Response**
```json
{
  "summary": { "rows": 1250, "errors": 5, "warnings": 18, "engine": "pandas" },
  "issues": [
    { "code": "MISSING_COLUMN", "severity": "error", "column": "pregunta_7", "row": null, "message": "Columna requerida ausente: pregunta_7" },
    { "code": "BAD_TYPE", "severity": "warning", "column": "codigo_materia", "row": null, "message": "Tipo esperado string vs observado int64" },
    { "code": "DOMAIN_VIOLATION", "severity": "error", "column": "periodo", "row": null, "message": "Valor fuera de dominio en periodo: 2024-13" },
    { "code": "PATTERN_MISMATCH", "severity": "error", "column": "periodo", "row": 42, "message": "Valor '2024-3' no cumple ^[0-9]{4}-(1|2)$" }
  ]
}
```

**Notas**
- El engine por defecto es **`pandas`**, configurable con `NC_DF_ENGINE=polars`.
- No persiste ni transforma el archivo; es solo validación para reporte en UI.
- Encabezados se normalizan (espacios/acentos) y se aplica **coerción de tipos** antes de reportar `BAD_TYPE`.
- La salida incluye `summary` (totales) y `issues[]` (detalle fila/columna).
- Resolución de esquema: `NC_SCHEMA_PATH` permite forzar la ruta.

---

## 2 /modelos  _(v0.4.0)_

> Esta versión introduce un **contrato mínimo** para lanzar entrenamientos asíncronos con **RBM general** o **RBM restringida**, instrumentados con eventos `training.*`.  
> Los contratos previos de v0.3.0 para `/modelos/entrenar` y listados se **reorganizan**; ver **Notas de versión** al final.

### 2.1 POST `/modelos/entrenar`  _(nuevo contrato v0.4.0)_

Lanza un entrenamiento en **background** a partir de una **plantilla de entrenamiento** y una **estrategia** RBM.

**Body (JSON)**
```json
{
  "modelo": "rbm_general | rbm_restringida",
  "data_ref": "localfs://datasets/ultimo.parquet",
  "epochs": 5,
  "hparams": { "lr": 0.01, "batch_size": 64 }
}
```

**200 — Response**
```json
{ "job_id": "4b25f9d3-3b2e-4a2f-9d7a-3a4b9b8f2f21", "status": "running", "message": "Entrenamiento lanzado" }
```

**Errores**
- `400` parámetros inválidos (p.ej. modelo no soportado)
- `500` error encolando/arrancando el job

**Observabilidad (emitida por el job)**
- `training.started` → `{ correlation_id, model, params }`
- `training.epoch_end` → `{ correlation_id, epoch, loss, metrics }`
- `training.completed` → `{ correlation_id, final_metrics }`
- `training.failed` → `{ correlation_id, error }`

> Los eventos se enrutan a **logging** por defecto. Futuras integraciones podrán publicar a Kafka/Rabbit u otro sink.

---

### 2.2 GET `/modelos/estado/{job_id}`  _(nuevo contrato v0.4.0)_

Devuelve el **estado** del entrenamiento y la última métrica conocida.

**200 — Response**
```json
{
  "job_id": "4b25f9d3-3b2e-4a2f-9d7a-3a4b9b8f2f21",
  "status": "running | completed | failed | unknown",
  "metrics": { "recon_error": 0.42 }
}
```

**404 — Response**
```json
{ "error": "Job no encontrado" }
```

---

### 2.3 (Opcional / futuro)
- `GET /modelos/estado` (listado/paginado) — **pendiente** de rediseño para Días 5–6.
- `POST /modelos/publicar` — mantendrá el espíritu de v0.3.0, pero se moverá tras consolidar el registro de artefactos.

---

## 3 Observabilidad de entrenamiento (D4)

- Bus de eventos **in-memory** (pub/sub) emite `training.*` desde la **plantilla de entrenamiento**.
- Destino por defecto: `log_handler` → `logging.INFO`.
- Se conecta al iniciar la app (`startup`) mediante `wire_logging_destination()`.
- No interrumpe el entrenamiento si un handler falla (best-effort).

**Esquema de eventos**
```json
{
  "training.started":   { "correlation_id": "uuid", "model": "rbm_general", "params": { "...": "..." } },
  "training.epoch_end": { "correlation_id": "uuid", "epoch": 1, "loss": 0.98, "metrics": { "recon_error": 0.98 } },
  "training.completed": { "correlation_id": "uuid", "final_metrics": { "recon_error": 0.11 } },
  "training.failed":    { "correlation_id": "uuid", "error": "mensaje" }
}
```

---

## 4 Ejemplos de uso (curl)

**Lanzar entrenamiento (RBM general)**
```bash
curl -X POST http://127.0.0.1:8000/modelos/entrenar   -H "Content-Type: application/json"   -d '{"modelo":"rbm_general","epochs":3,"hparams":{"lr":0.01}}'
```

**Consultar estado del job**
```bash
curl http://127.0.0.1:8000/modelos/estado/<JOB_ID>
```

**Validar sin almacenar (CSV)**
```bash
curl -X POST http://127.0.0.1:8000/datos/validar -F "file=@examples/dataset_ejemplo.csv"
```

**Subir datos**
```bash
curl -X POST http://127.0.0.1:8000/datos/upload -F "file=@./examples/dataset_ejemplo.csv" -F periodo=2024-2
```

---
## 5 /jobs  *(sin cambios vs v0.3.0)*

*(Reservado para próximos días de desarrollo)*

### 4.1 POST `/jobs/run`

**Body**
```json
{
  "command": "entrenamiento_completo",
  "args": { "dataset_id": "2024-2", "tipo": "rbm_restringida" }
}
```

**202 — Response**
```json
{ "job_id": "job_pipe_01H8ZM...", "status": "QUEUED" }
```

---

### 4.2 GET `/jobs/status/{id}`

**200 — Response**
```json
{
  "job_id": "job_pipe_01H8ZM...",
  "status": "RUNNING",
  "started_at": "2025-09-09T10:05:00Z",
  "steps": [
    { "name": "cargar_dataset", "status": "DONE", "duration_s": 5 },
    { "name": "unificar_historico", "status": "DONE", "duration_s": 11 },
    { "name": "entrenar", "status": "RUNNING", "progress": 0.6 }
  ],
  "logs_tail": [
    "epoch=18/30 loss=0.42 acc=0.85",
    "epoch=19/30 loss=0.41 acc=0.86"
  ]
}
```

---

### 4.3 GET `/jobs/list`

**Query**
- `kind`: enum(`train`,`predict`,`pipeline`) (opcional)
- `limit`: int (default 50)

**200 — Response**
```json
{
  "items": [
    { "job_id": "job_train_01H8ZK...", "status": "COMPLETED", "ended_at": "2025-09-09T10:18:12Z" },
    { "job_id": "job_pred_01H8ZL...", "status": "FAILED", "error": "Archivo inválido" }
  ]
}
```

---


## 5 Notas de versión

### v0.4.0
- **Nuevo (D4):** contratos mínimos `/modelos/entrenar` y `/modelos/estado/{job_id}` con **RBM general/restringida** y eventos `training.*`.
- **Nuevo (D4):** sección de **Observabilidad de entrenamiento** y esquema de eventos.
- **Ajuste:** `/modelos/entrenar` ahora acepta `{modelo,data_ref,epochs,hparams}`; se deja para futuro el manejo avanzado de `nombre`, `metodologia` y `dataset_id`.
- **Compat:** `/datos/*` se mantiene como en v0.3.0.
- **Pendiente:** rediseño de listado `/modelos/estado` y `POST /modelos/publicar` para incorporar registro de artefactos y canales.

## Anexo — Cambios acumulados Día 4 (v0.4.0)
> Fecha de actualización: 2025-10-10 13:58:52

Este anexo **no borra** especificaciones anteriores: agrega los cambios introducidos
en el **Día 4** para dejar trazabilidad incremental conforme a la metodología del proyecto.

## 1. Alcance del Día 4
- **Objetivo**: Establecer la **plantilla de entrenamiento** (Template) y **estrategias de modelo** (RBM general/restringida) con **eventos de observabilidad** `training.*`.
- **Listo cuando**: El **flujo de entrenamiento** y las **métricas/eventos** `training.*` están documentados y conectados en los **contratos de API**.

## 2. Convenciones nuevas o aclaradas
- **Nombres de hiperparámetros (hparams)** normalizados a *minúsculas* en backend.
- **Métricas por época** expuestas mediante `history[]` y snapshot en `metrics`.
- **Eventos de observabilidad** emitidos por la plantilla: `training.started`, `training.epoch_end`, `training.completed`, `training.failed`.

---

## 3. /modelos — contratos v0.4.0 (acumulativo)

### 3.1 POST `/modelos/entrenar`
Lanza un entrenamiento asíncrono con RBM (general o restringida).

**Body (JSON)**
```json
{
  "modelo": "rbm_general | rbm_restringida",
  "data_ref": "localfs://datasets/ultimo.parquet",
  "epochs": 5,
  "hparams": {
    "n_visible": null,
    "n_hidden": 32,
    "lr": 0.01,
    "batch_size": 64,
    "cd_k": 1,
    "momentum": 0.5,
    "weight_decay": 0.0,
    "seed": 42
  }
}
```

**200 — Response**
```json
{ "job_id": "uuid", "status": "running", "message": "Entrenamiento lanzado" }
```

**Notas**
- Si `n_visible` es `null`, se infiere del dataset.
- El backend **normaliza** las claves de `hparams` a *minúsculas*.
- La estrategia ejecuta **RBM con CD-k**.

**Eventos emitidos**
- `training.started` → `{ correlation_id, model, params }`
- `training.epoch_end` → `{ correlation_id, epoch, loss, metrics }`
- `training.completed` → `{ correlation_id, final_metrics }`
- `training.failed` → `{ correlation_id, error }`

---

### 3.2 GET `/modelos/estado/{job_id}`
Consulta el estado del entrenamiento y el **histórico por época**.

**200 — Response**
```json
{
  "job_id": "uuid",
  "status": "running | completed | failed | unknown",
  "metrics": { "recon_error_final": 0.081 },
  "history": [
    { "epoch": 1, "loss": 0.93, "recon_error": 0.93, "grad_norm": 0.12, "time_epoch_ms": 4.2 },
    { "epoch": 2, "loss": 0.51, "recon_error": 0.51, "grad_norm": 0.09, "time_epoch_ms": 3.8 }
  ]
}
```

**404 — Response**
```json
{ "error": "Job no encontrado" }
```

**Notas**
- `history[]` se puebla con cada `training.epoch_end`.
- `metrics` refleja el último *snapshot* o las `final_metrics` al completar.

---

## 4. Observabilidad (plantilla de entrenamiento)
- La **PlantillaEntrenamiento** orquesta el ciclo de épocas y emite `training.*`.
- Se enriquece `metrics` con `time_epoch_ms` y se asegura `loss`/`recon_error`.
- Se acumula `history[]` con: `epoch`, `loss`, `recon_error`, `grad_norm`, `time_epoch_ms`.

**Esquema de eventos**
```json
{
  "training.started":   { "correlation_id": "uuid", "model": "rbm_general", "params": { "...": "..." } },
  "training.epoch_end": { "correlation_id": "uuid", "epoch": 1, "loss": 0.98, "metrics": { "recon_error": 0.98, "grad_norm": 0.11, "time_epoch_ms": 4.2 } },
  "training.completed": { "correlation_id": "uuid", "final_metrics": { "recon_error_final": 0.08 } },
  "training.failed":    { "correlation_id": "uuid", "error": "mensaje" }
}
```

---

## 5. Ejemplos (curl)

**Lanzar entrenamiento**
```bash
curl -s -X POST http://127.0.0.1:8000/modelos/entrenar \\
  -H "Content-Type: application/json" \\
  -d '{"modelo":"rbm_general","epochs":5,"hparams":{"n_hidden":16,"lr":0.01,"batch_size":64,"cd_k":1,"momentum":0.5,"weight_decay":0.0,"seed":42}}'
```

**Consultar estado**
```bash
curl -s http://127.0.0.1:8000/modelos/estado/<JOB_ID> | jq
```

---

## 6. Compatibilidad y notas
- Este anexo **no elimina** contratos anteriores (v0.3.0). Mantener ambos durante el MVP.
- La UI de **Models** usa `/modelos/entrenar` y hace *polling* a `/modelos/estado/{job_id}` para graficar `recon_error` por época.
- Los campos y nombres aquí documentados **ya están implementados** en backend (router y plantilla).

## Anexo — Cambios acumulados Día 5 (v0.4.1)
> Fecha de actualización: 2025-10-12 16:46:29 -05

Este anexo **no borra** lo especificado en v0.4.0; agrega y aclara los cambios del **Día 5 — Miembro B** para la
selección de datos por **metodología** (PeriodoActual, Acumulado, Ventana) usada antes del entrenamiento.

### 1. Alcance
- **Objetivo**: incorporar en el backend la selección de datos por metodología y exponerla en el contrato de `/modelos/entrenar`.
- **Listo cuando**: `/modelos/entrenar` acepta `metodologia`, `periodo_actual`, `ventana_n`; la documentación incluye descripción, parámetros y ejemplos.

---

## 2. /modelos — contrato v0.4.1 (superset de v0.4.0)

### 2.1 POST `/modelos/entrenar` — *añadidos Día 5*
Lanza un entrenamiento en background de **RBM General** o **RBM Restringida**. Se agrega una **fase de selección de datos** previa al entrenamiento.

**Body (JSON)**
```json
{
  "modelo": "rbm_general | rbm_restringida",
  "data_ref": "localfs://datasets/ultimo.parquet",
  "epochs": 5,
  "hparams": {
    "n_visible": null,
    "n_hidden": 32,
    "lr": 0.01,
    "batch_size": 64,
    "cd_k": 1,
    "momentum": 0.5,
    "weight_decay": 0.0,
    "seed": 42
  },
  "metodologia": "periodo_actual | acumulado | ventana",
  "periodo_actual": "YYYY-SEM (p.ej. \"2024-2\")",
  "ventana_n": 4
}
```

**Notas**
- Si **no** se envía `data_ref`, el backend intentará usar `historico/unificado.parquet` (generado en Día 5 A).
- `metodologia` por defecto es `"periodo_actual"` si se omite.
- `periodo_actual` es opcional. Si se omite, el backend **infiere** el máximo `periodo` presente en el dataset.
- `ventana_n` aplica solo si `metodologia = "ventana"` (entero ≥ 1, default **4**).
- La columna `periodo` debe cumplir el patrón `^[0-9]{4}-(1|2)$` (ej.: `2024-1`, `2024-2`).

**200 — Response**
```json
{ "job_id": "uuid", "status": "running", "message": "Entrenamiento lanzado" }
```

**Errores**
- `400` selección vacía según la metodología/periodo o dataset inaccesible.
- `400` `metodologia` desconocida.
- `500` error al materializar el subconjunto previo al entrenamiento.

**Observabilidad**
- Se mantienen los eventos `training.*` de v0.4.0 (`started`, `epoch_end`, `completed`, `failed`).

---

### 2.2 GET `/modelos/estado/{job_id}` — *sin cambios funcionales*
Devuelve estado, `metrics` y `history[]` (siempre que el job esté corriendo o terminado).  
*La configuración de metodología se registra para trazabilidad interna pero no se expone en este endpoint.*

**200 — Response (ejemplo)**
```json
{
  "job_id": "uuid",
  "status": "running | completed | failed | unknown",
  "metrics": { "recon_error": 0.42 },
  "history": [
    { "epoch": 1, "loss": 0.93, "recon_error": 0.93, "grad_norm": 0.12, "time_epoch_ms": 4.2 },
    { "epoch": 2, "loss": 0.51, "recon_error": 0.51, "grad_norm": 0.09, "time_epoch_ms": 3.8 }
  ]
}
```

---

## 3. Selección de datos — definición de metodologías

- **periodo_actual**: usa **solo** las filas cuyo `periodo` coincide con `periodo_actual`.  
  Si no se provee `periodo_actual`, se toma el **máximo** `periodo` presente en el dataset.

- **acumulado**: usa **todas** las filas con `periodo` **≤** `periodo_actual`.  
  Si no se provee `periodo_actual`, se usa el máximo presente.

- **ventana**: usa los **últimos N** periodos **≤** `periodo_actual` (o ≤ máximo presente si se omite).  
  `N = ventana_n` (default 4).

---

## 4. Ejemplos (curl)

**1) Periodo actual (inferencia automática)**
```bash
curl -s -X POST http://127.0.0.1:8000/modelos/entrenar \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelo":"rbm_general",
    "epochs":3,
    "metodologia":"periodo_actual"
  }'
```

**2) Acumulado hasta 2024-2**
```bash
curl -s -X POST http://127.0.0.1:8000/modelos/entrenar \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelo":"rbm_restringida",
    "epochs":5,
    "metodologia":"acumulado",
    "periodo_actual":"2024-2"
  }'
```

**3) Ventana (últimos 6 periodos)** 
```bash
curl -s -X POST http://127.0.0.1:8000/modelos/entrenar \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelo":"rbm_general",
    "epochs":5,
    "metodologia":"ventana",
    "ventana_n":6
  }'
```

---

## 5. Compatibilidad
- **Backward-compatible** con v0.4.0: las llamadas existentes siguen funcionando (por defecto `metodologia="periodo_actual"`).
- El **fallback** de `data_ref` a `historico/unificado.parquet` permite usar el histórico unificado del Día 5 A sin cambiar clientes.

---

## 6. Notas de versión v0.4.1
- **Nuevo (D5-B):** parámetros `metodologia`, `periodo_actual`, `ventana_n` en `POST /modelos/entrenar`.
- **Nuevo (D5-B):** definición de metodologías y ejemplos.
- **Sin cambios:** `GET /modelos/estado/{job_id}`. Observabilidad `training.*` se mantiene.

# API v0.5.0 (draft) — Predicción

> **Estado:** Borrador aprobado por Miembro A en *Día 6* para implementación por Miembro B.  
> **Propósito:** Definir contratos de predicción sin imponer detalles internos de la cadena/modelo.  
> **Compatibilidad:** No rompe endpoints existentes; añade `/prediccion/online` y `/prediccion/batch`.

---

## Convenciones generales
- **Formato:** JSON; para cargas masivas también `multipart/form-data` (archivo `csv` o `parquet`).
- **Codificación:** UTF-8.
- **Headers:** `Content-Type: application/json` (o `multipart/form-data` para archivo).
- **Tiempo de respuesta objetivo (no contractual):** \< 200 ms en *online* para payloads típicos.
- **Selección de modelo:** por defecto usa el **campeón** de la familia indicada (`opciones.use_champion = true`). Se puede forzar un `job_id` explícito.
- **Campos de sentimiento (`sentiment_prob`)** se calculan en Día 6 (PLN) y **no** provienen de origen histórico.
- **Versionado del contrato:** `v0.5.0 (draft)` hasta que Miembro B publique implementación; luego subirá a `v0.6.0` con detalles finales.

---

## POST /prediccion/online

### Descripción
Predicción **en línea** para **un único registro** (UI y casos interactivos).

### Request (JSON)
```json
{
  "features_numericas": {
    "pregunta_1": 45,
    "pregunta_2": 50
  },
  "comentario": "Me gustó la clase, pero el ritmo fue rápido",
  "opciones": {
    "family": "sentiment_desempeno",
    "job_id": null,
    "use_champion": true
  }
}
```

#### Campos
- `features_numericas` (objeto numérico): Diccionario *feature_name → valor numérico*. Requerido.
- `comentario` (string): Texto libre opcional para análisis semántico / sentimiento.
- `opciones.family` (string): Familia de modelo/ensamble. Por defecto `"sentiment_desempeno"` (definida en docs metodológicos).
- `opciones.job_id` (string|null): ID de entrenamiento específico. Si se define, ignora `use_champion`.
- `opciones.use_champion` (bool): `true` por defecto; usa el modelo campeón de la familia.

### Response 200 (JSON)
```json
{
  "label": "Álgebra",
  "confianza": 0.72,
  "scores": { "Álgebra": 0.72, "Cálculo": 0.18, "Geometría": 0.10 },
  "sentiment_prob": { "pos": 0.66, "neu": 0.24, "neg": 0.10 },
  "metadata": {
    "family": "sentiment_desempeno",
    "champion_job_id": "2025-10-06_17-22-10_rbfn_v3",
    "latencia_ms": 18
  }
}
```

#### Códigos de estado
- `200 OK` — Predicción exitosa.
- `400 Bad Request` — Payload inválido (tipos, faltantes mínimos).
- `503 Service Unavailable` — No hay modelo publicado para la familia / job_id dado.

---

## POST /prediccion/batch

### Descripción
Predicción **por lotes** para **varios registros**. Soporta:
1) **JSON** con arreglo `registros`, ó  
2) **Archivo** `csv`/`parquet` vía `multipart/form-data`.

### Request A (JSON)
```json
{
  "registros": [
    {
      "features_numericas": { "pregunta_1": 45, "pregunta_2": 50 },
      "comentario": "Buen ritmo, algunos temas difíciles"
    },
    {
      "features_numericas": { "pregunta_1": 12, "pregunta_2": 30 },
      "comentario": ""
    }
  ],
  "opciones": { "family": "sentiment_desempeno", "use_champion": true }
}
```

### Request B (multipart/form-data)
```
file: dataset.csv | dataset.parquet
opciones: {"family":"sentiment_desempeno","use_champion":true}
```

#### Requisitos de archivos
- **CSV:** encabezados con nombres de features; una columna opcional `comentario`. Ejemplo:
  ```csv
  pregunta_1,pregunta_2,comentario
  45,50,"Buen ritmo, algunos temas difíciles"
  12,30,""
  ```
- **Parquet:** columnas *feature_name* (numéricas) y opcional `comentario` (string).

### Response 200 (JSON)
```json
{
  "items": [
    {
      "index": 0,
      "label": "Álgebra",
      "confianza": 0.72,
      "scores": { "Álgebra": 0.72, "Cálculo": 0.18, "Geometría": 0.10 },
      "sentiment_prob": { "pos": 0.66, "neu": 0.24, "neg": 0.10 }
    },
    {
      "index": 1,
      "label": "Geometría",
      "confianza": 0.61,
      "scores": { "Álgebra": 0.28, "Cálculo": 0.11, "Geometría": 0.61 },
      "sentiment_prob": { "pos": 0.22, "neu": 0.58, "neg": 0.20 }
    }
  ],
  "resumen": {
    "n": 2,
    "latencia_prom_ms": 22,
    "distribucion_labels": { "Álgebra": 1, "Geometría": 1 }
  }
}
```

#### Códigos de estado
- `200 OK` — Lote procesado.
- `400 Bad Request` — Formato inválido (JSON/archivo) o columnas inconsistentes.
- `422 Unprocessable Entity` — Datos bien formados pero no consumibles (p.ej., valores no numéricos en features).
- `503 Service Unavailable` — No hay modelo publicado.

---

## Reglas y observaciones adicionales

- **Compatibilidad hacia adelante:** Nuevos campos en `metadata` podrán añadirse sin romper clientes; evite depender estrictamente de su presencia.
- **Límites razonables:** `online` procesa un registro; `batch` recomienda ≤ 50k filas por solicitud (límites exactos los define despliegue).
- **Selección de modelo:**
  - Si `job_id != null` → se usa ese artefacto.
  - En otro caso → se usa el **campeón** de `family` (`use_champion: true` por defecto).
- **Sentimiento:** `sentiment_prob` ∈ [0,1] y suma ≈ 1. Puede omitirse si la familia no lo calcula.
- **Trazabilidad:** el sistema publicará eventos `prediction.requested|completed|failed` (ver `docs/arquitectura.md`).

---

## Ejemplos de integración (cURL)

**Online**
```bash
curl -X POST https://{host}/prediccion/online   -H "Content-Type: application/json"   -d '{
    "features_numericas": {"pregunta_1":45,"pregunta_2":50},
    "comentario":"Me gustó la clase, pero el ritmo fue rápido",
    "opciones":{"family":"sentiment_desempeno","use_champion":true}
  }'
```

**Batch (JSON)**
```bash
curl -X POST https://{host}/prediccion/batch   -H "Content-Type: application/json"   -d '{
    "registros":[
      {"features_numericas":{"pregunta_1":45,"pregunta_2":50},"comentario":"Buen ritmo"},
      {"features_numericas":{"pregunta_1":12,"pregunta_2":30},"comentario":""}
    ],
    "opciones":{"family":"sentiment_desempeno","use_champion":true}
  }'
```

**Batch (archivo CSV)**
```bash
curl -X POST https://{host}/prediccion/batch   -H "Content-Type: multipart/form-data"   -F "file=@dataset.csv"   -F 'opciones={"family":"sentiment_desempeno","use_champion":true}'
```