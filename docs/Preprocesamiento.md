# Preprocesamiento (NeuroCampus)

Este documento describe el flujo actual de **preprocesamiento de datos** en
NeuroCampus, desde la carga de un archivo fuente hasta la generación de
artefactos reutilizables para análisis, dashboard, entrenamiento y predicción.

En la versión vigente del sistema, el preprocesamiento ya no debe entenderse
solo como un script aislado de NLP, sino como una **cadena operativa completa**
que integra:

- carga y validación de datasets;
- normalización a formato interno;
- construcción de dataset procesado;
- análisis de sentimientos con BETO;
- unificación histórica;
- preparación del feature-pack para modelado.

La entrada natural a este flujo es la pestaña **Datos** del frontend o, de forma
programática, los routers `/datos` y `/jobs` del backend.

---

## Objetivo del preprocesamiento

El preprocesamiento busca convertir archivos de evaluaciones docentes en
artefactos consistentes y reutilizables para el resto del sistema.

Sus objetivos principales son:

1. **Validar** que el archivo fuente tenga un formato aceptable.
2. **Normalizar** la estructura del dataset al formato interno del proyecto.
3. **Persistir** una versión canónica del dataset por periodo.
4. **Enriquecer** los comentarios con análisis de sentimientos usando BETO.
5. **Consolidar** históricos cuando se requiere una vista agregada.
6. **Construir** matrices de características para entrenamiento e inferencia.

---

## Vista general del pipeline actual

En términos prácticos, el flujo vigente puede verse así:

```text
Archivo fuente (.csv/.xlsx/.parquet)
        │
        ├── /datos/validar
        │
        ├── /datos/upload
        │      └── datasets/<periodo>.parquet|csv
        │
        ├── /jobs/preproc/beto/run
        │      ├── data/processed/<dataset_id>.parquet
        │      └── data/labeled/<dataset_id>_beto.parquet
        │
        ├── /jobs/data/unify/run
        │      ├── historico/unificado.parquet
        │      └── historico/unificado_labeled.parquet
        │
        └── /jobs/features/prepare
               └── artifacts/features/<dataset_id>/...
```

Este pipeline no siempre ejecuta todos los pasos en una sola operación. Depende
 del objetivo del usuario:

- si solo se quiere cargar un dataset, basta con validación + upload;
- si se quiere análisis de sentimientos, se ejecuta BETO;
- si se quiere alimentar el Dashboard, se requiere unificación histórica;
- si se quiere entrenar o predecir, se requiere feature-pack.

---

## Entradas aceptadas

### Formatos soportados por el backend

En el flujo actual de `/datos/validar` y `/datos/upload`, el backend acepta:

- `csv`
- `xlsx`
- `parquet`

La interfaz de usuario de la pestaña **Datos** expone principalmente:

- `CSV`
- `XLSX`

pero el backend conserva compatibilidad operativa con `parquet`.

### Identificador lógico del dataset

En la implementación actual, el identificador real del dataset está asociado al
**periodo/semestre** seleccionado por el usuario.

Ejemplos:

- `2024-2`
- `2025-1`

Ese identificador se usa luego para resolver rutas y artefactos a lo largo del
pipeline.

---

## Fase 1 — Validación del archivo

### Endpoint principal

- `POST /datos/validar`

### Qué hace

Este endpoint:

- verifica que el formato sea válido;
- intenta leer el archivo;
- construye una muestra de filas para vista previa;
- delega la validación estructural al validador unificado del sistema;
- devuelve un reporte con errores, advertencias y sample.

### Importante

La validación **no persiste** el dataset. Sirve para:

- comprobar compatibilidad antes de cargar;
- mostrar una vista previa en la UI;
- evitar subir archivos erróneos al pipeline.

### Parámetros relevantes

- `file`
- `dataset_id`
- `fmt` (opcional, para forzar lector)

### Respuesta útil para frontend

Normalmente el frontend usa:

- `dataset_id`
- `sample`
- `errors`
- `warnings`
- banderas de éxito o falla

---

## Fase 2 — Ingesta y persistencia del dataset

### Endpoint principal

- `POST /datos/upload`

### Qué hace

Este endpoint toma el archivo validado y lo persiste como dataset base del
sistema.

### Comportamiento actual

- el backend usa `periodo` como identificador efectivo del dataset;
- el campo `dataset_id` se recibe por compatibilidad, pero en la práctica se
  prioriza `periodo`;
- la persistencia primaria se hace en:

```text
 datasets/<periodo>.parquet
```

- si el motor parquet no está disponible, se usa fallback a:

```text
 datasets/<periodo>.csv
```

### Control de reemplazo

Si ya existe un dataset con el mismo periodo:

- con `overwrite=false` se responde conflicto;
- con `overwrite=true` se reemplaza el dataset existente.

### Resultado del paso

Al finalizar esta fase ya existe un **dataset base persistido** y el frontend
puede asociarlo al contexto de trabajo de la pestaña **Datos**.

---

## Fase 3 — Construcción del dataset procesado

Esta etapa aparece parcialmente implícita en el sistema.

### Qué representa el dataset procesado

La versión **processed** es la forma interna normalizada del dataset, utilizada
por varias piezas del backend para:

- vistas previas enriquecidas;
- resúmenes estructurales;
- dashboard histórico;
- feature engineering posterior.

### Rutas asociadas

Normalmente se espera una ruta como:

```text
 data/processed/<dataset_id>.parquet
```

### Cómo se genera

En el sistema actual puede generarse de dos maneras:

1. a través del flujo interno que acompaña a jobs posteriores;
2. mediante la herramienta operacional que normaliza desde `datasets/` hacia
   `data/processed/` cuando hace falta.

### Observación importante

La generación de `processed` no siempre se presenta como una acción visible e
independiente para el usuario final. En varios casos se produce como parte del
flujo que antecede a BETO o a otros jobs.

---

## Fase 4 — Análisis de sentimientos con BETO

### Endpoint principal

- `POST /jobs/preproc/beto/run`

### Objetivo

Enriquecer el dataset con señales de texto que permitan:

- análisis de polaridad en la pestaña **Datos**;
- cálculo de sentimiento en Dashboard;
- generación de features textuales para entrenamiento;
- construcción del dataset etiquetado reutilizable.

### Lógica operativa actual

Cuando se lanza el job BETO:

- si ya existe `data/processed/<dataset>.parquet`, se usa como entrada;
- si no existe, el backend intenta reconstruirlo desde:
  - `datasets/<dataset>.parquet`, o
  - `datasets/<dataset>.csv`;
- si tampoco existe una fuente cruda, el job falla con error de entrada faltante.

### Parámetros importantes del job

Entre los parámetros del request pueden aparecer:

- `dataset`
- `text_col`
- `keep_empty_text`
- `text_feats`
- `text_feats_out_dir`
- `empty_text_policy`
- `force_cargar_dataset`
- configuraciones derivadas para embeddings/text features

### Salida esperada

La salida etiquetada principal queda en:

```text
 data/labeled/<dataset_id>_beto.parquet
```

### Estado y seguimiento

El router expone:

- `GET /jobs/preproc/beto/{job_id}`
- `GET /jobs/preproc/beto`

para consultar estado detallado o jobs recientes.

### Qué aporta BETO al sistema

Esta etapa habilita:

- distribución de polaridad del dataset;
- agregados por docente y asignatura;
- histórico labeled para dashboard;
- rutas posteriores de feature-pack con soporte textual.

---

## Fase 5 — Dataset etiquetado (labeled)

La salida labeled es una de las piezas centrales del pipeline actual.

### Qué contiene conceptualmente

Aunque el contenido concreto puede variar según el job y la configuración, esta
capa suele incluir:

- texto procesado o normalizado;
- sentimiento o buckets de polaridad;
- información compatible con agregación por docente/asignatura;
- en algunos casos señales auxiliares para texto y features derivadas.

### Ruta típica

```text
 data/labeled/<dataset_id>_beto.parquet
```

### Usos directos de esta capa

- `GET /datos/sentimientos`
- `GET /dashboard/wordcloud`
- `GET /dashboard/sentimiento`
- construcción del histórico unificado labeled
- feature-pack cuando el origen óptimo es la versión enriquecida por BETO

---

## Fase 6 — Unificación histórica

### Endpoint principal

- `POST /jobs/data/unify/run`

### Objetivo

Consolidar datasets ya procesados o etiquetados en vistas históricas persistidas
para consumo institucional.

### Modos soportados

Según el router actual, existen modos como:

- `acumulado`
- `acumulado_labeled`
- `periodo_actual`
- `ventana`

### Salidas típicas

```text
 historico/unificado.parquet
 historico/unificado_labeled.parquet
```

### Para qué sirve esta fase

- alimentar el **Dashboard** con una vista histórica completa;
- permitir filtros por periodo, docente, asignatura y programa;
- desacoplar la analítica global de datasets individuales.

### Consulta de estado

También existen endpoints para el job de unificación:

- `GET /jobs/data/unify/{job_id}`
- `GET /jobs/data/unify`

---

## Fase 7 — Preparación del feature-pack

### Endpoint principal

- `POST /jobs/features/prepare`
- y, desde el router de modelos, también existe la preparación mediante
  `/modelos/feature-pack/prepare`

### Objetivo

Construir los artefactos tabulares que necesita el pipeline de modelado y parte
 de la predicción estructurada.

### Resolución de la fuente de entrada

Cuando no se especifica `input_uri`, el sistema intenta resolver la fuente en un
orden similar a este:

1. `data/processed/<dataset_id>.parquet`
2. `data/labeled/<dataset_id>_beto.parquet`
3. `historico/unificado_labeled.parquet`
4. `datasets/<dataset_id>.parquet` o `.csv`

En algunos flujos específicos de `modelos`, se prioriza la versión labeled antes
que la processed cuando conviene preservar señales de sentimiento.

### Salidas esperadas

El feature-pack se guarda bajo:

```text
 artifacts/features/<dataset_id>/
```

con artefactos como:

- `train_matrix.parquet`
- `pair_matrix.parquet`
- `meta.json`
- `pair_meta.json`
- índices auxiliares de entidades

### Relevancia del feature-pack

Esta etapa habilita:

- entrenamiento de modelos;
- predicción individual o batch sobre pares docente–materia;
- listados de docentes y materias para la pestaña **Predicciones**;
- readiness checks de la pestaña **Modelos**.

---

## Cómo se ejecuta hoy desde la interfaz

En la práctica, el usuario recorre el preprocesamiento desde la pestaña
**Datos**.

### Flujo habitual

1. seleccionar el **semestre**;
2. cargar el archivo fuente;
3. ejecutar **Load and Process**;
4. revisar el resumen y la vista previa del dataset;
5. lanzar BETO si se requiere análisis de sentimientos;
6. ejecutar unificación histórica si se necesita consolidación institucional;
7. preparar feature-pack si el siguiente paso será entrenar o predecir.

### Secciones de la UI relacionadas

- **Carga del Dataset**
- **Artefactos de datos**
- **Resumen del Dataset**
- **Análisis de Sentimientos con BETO**

---

## Cómo se usa desde backend y API

### Router `/datos`

Gestiona:

- validación;
- upload;
- preview;
- resumen;
- sentimientos.

### Router `/jobs`

Gestiona:

- ejecución asíncrona de BETO;
- unificación histórica;
- preparación de features persistentes.

### Router `/modelos`

Consume el resultado del preprocesamiento para:

- readiness;
- feature-pack;
- entrenamiento;
- sweep;
- champion.

### Router `/dashboard`

Consume principalmente:

- `historico/unificado.parquet`
- `historico/unificado_labeled.parquet`

### Router `/predicciones`

Consume principalmente:

- `artifacts/features/<dataset_id>/...`
- champions activos;
- outputs persistidos de predicción.

---

## Artefactos principales del pipeline

### Capa raw

```text
 datasets/<dataset_id>.parquet
 datasets/<dataset_id>.csv
```

### Capa processed

```text
 data/processed/<dataset_id>.parquet
```

### Capa labeled

```text
 data/labeled/<dataset_id>_beto.parquet
```

### Capa histórica

```text
 historico/unificado.parquet
 historico/unificado_labeled.parquet
```

### Capa de features

```text
 artifacts/features/<dataset_id>/
```

---

## Consideraciones operativas importantes

### 1. El periodo gobierna el contexto del dataset

Aunque la interfaz muestre un campo “Nombre del Dataset”, el identificador lógico
real de trabajo es el **periodo**.

### 2. BETO no siempre es obligatorio

El sistema puede cargar y resumir datasets sin ejecutar BETO, pero:

- se perderán agregados de sentimiento;
- no habrá histórico labeled útil para ciertas vistas;
- algunas rutas de features y dashboard quedarán incompletas.

### 3. La unificación histórica es una etapa explícita

Cargar datasets no actualiza automáticamente todos los artefactos históricos.
Cuando se requiere una vista institucional consolidada, hay que ejecutar la
unificación correspondiente.

### 4. El feature-pack tampoco es implícito en todos los casos

Para pasar de Datos a Modelos o Predicciones de forma robusta, conviene preparar
explícitamente el feature-pack del dataset activo.

---

## Errores comunes

### Formato no soportado

Ocurre cuando el archivo no coincide con `csv`, `xlsx` o `parquet`.

### Dataset ya existente

Ocurre en upload cuando ya existe un archivo para el mismo periodo y no se activa
`overwrite`.

### Dataset procesado o labeled no encontrado

Puede ocurrir cuando se consulta resumen, sentimientos o dashboard sin haber
completado los pasos previos del pipeline.

### Fallo en job BETO

Puede ocurrir si falta el dataset base o si el backend no puede construir el
processed de entrada.

### Feature-pack inexistente

Afecta entrenamientos, listados de entidades y predicciones estructuradas.

---

## Recomendación de uso actual

Para operar correctamente el preprocesamiento en la versión vigente de
NeuroCampus, la ruta recomendada es:

1. cargar dataset en **Datos**;
2. validar que exista resumen correcto;
3. ejecutar BETO cuando haya comentarios y se requiera análisis cualitativo;
4. ejecutar unificación cuando se quiera reflejar el histórico institucional;
5. preparar feature-pack antes de pasar a **Modelos** o **Predicciones**.

Esa secuencia es la que mejor refleja el flujo real del software actual.
