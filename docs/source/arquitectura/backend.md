# Arquitectura del backend

## Visión general

El backend de NeuroCampus está implementado como una **API monolítica modular en
FastAPI**. Su función principal es exponer servicios HTTP para cuatro flujos
centrales del sistema:

- **Datos**: validación, carga, resumen y enriquecimiento de datasets.
- **Modelos**: preparación de artefactos, entrenamiento, búsqueda de
  hiperparámetros, promoción de campeón y consulta de ejecuciones.
- **Predicciones**: resolución de insumos, predicción individual y por lote,
  consulta de salidas y runs asociados.
- **Dashboard**: lectura agregada del histórico institucional para visualización
  en la interfaz.

Además, el backend incorpora:

- orquestación de **jobs** de larga duración;
- componentes de **observabilidad y trazabilidad**;
- lectura y escritura de **artefactos locales** en disco;
- validación de contratos mediante **Pydantic**;
- una separación razonable por dominios, aunque algunos routers concentran una
  cantidad importante de lógica de orquestación.

---

## Ubicación en el repositorio

La base del backend se encuentra en:

```text
backend/
  requirements.txt
  requirements-dev.txt
  src/
    neurocampus/
      app/
      data/
      dashboard/
      features/
      historico/
      integration/
      jobs/
      models/
      observability/
      prediction/
      predictions/
      services/
      shared/
      trainers/
      utils/
      validation/
```

La carpeta `backend/src/neurocampus/app/` concentra la capa HTTP de la API:

- `main.py`: inicialización de FastAPI y registro de routers.
- `routers/`: endpoints agrupados por dominio.
- `schemas/`: contratos de entrada y salida para los endpoints.
- `jobs/`: comandos ejecutables y utilidades para procesos prolongados.

---

## Punto de entrada: `app/main.py`

El archivo `backend/src/neurocampus/app/main.py` define la aplicación FastAPI y
sus capacidades transversales.

### Responsabilidades principales

1. **Instanciar la aplicación** FastAPI.
2. **Registrar routers** por dominio.
3. **Configurar CORS** para el frontend local.
4. **Inyectar observabilidad** de forma segura en el ciclo de vida.
5. **Instalar middleware de Correlation-Id** para trazabilidad.
6. **Aplicar límite de tamaño de carga** para endpoints de datasets.
7. Exponer el endpoint de salud global `GET /health`.

### Middlewares y aspectos transversales

#### CORS

El backend permite acceso desde orígenes configurados por variables de entorno,
con prioridad para:

- `NC_ALLOWED_ORIGINS`
- `CORS_ALLOW_ORIGINS` como compatibilidad retro

Si no hay configuración explícita, se usan por defecto los orígenes locales de
Vite (`localhost:5173` y `127.0.0.1:5173`).

#### Correlation-Id

Se instala el middleware:

- `neurocampus.observability.middleware_correlation.CorrelationIdMiddleware`

Esto permite asociar una misma petición a logs y eventos de entrenamiento o
predicción mediante el encabezado `X-Correlation-Id`.

#### Límite de subida

`main.py` implementa un middleware específico para restringir el tamaño de carga
solo en:

- `/datos/upload`
- `/datos/validar`

El límite depende de la variable de entorno `NC_MAX_UPLOAD_MB` y por defecto es
**10 MB**.

#### Logging y observabilidad

Durante el `lifespan` de la aplicación se ejecuta:

- `setup_logging()`
- `install_logrecord_factory()`
- `_wire_observability_safe()`

Esto prepara logging estructurado y conecta los eventos `training.*` y
`prediction.*` cuando los módulos de observabilidad están disponibles.

---

## Routers registrados

En la implementación actual, la aplicación registra estos routers:

- `/datos` → `app/routers/datos.py`
- `/jobs` → `app/routers/jobs.py`
- `/modelos` → `app/routers/modelos.py`
- `/prediccion` → `app/routers/prediccion.py`
- `/dashboard` → `app/routers/dashboard.py`
- `/predicciones` → `app/routers/predicciones.py`
- `/admin/cleanup` → `app/routers/admin_cleanup.py`

Esta combinación es importante porque en el backend conviven **dos superficies
relacionadas con inferencia**:

- `prediccion.py`: endpoints más directos de predicción online y batch.
- `predicciones.py`: router más amplio y alineado con la pestaña moderna de
  Predicciones del frontend.

---

## Router `datos`

**Archivo:** `backend/src/neurocampus/app/routers/datos.py`

Este router implementa el flujo de ingreso y consulta básica de datasets.

### Endpoints principales

- `GET /datos/ping`
- `GET /datos/esquema`
- `POST /datos/validar`
- `POST /datos/upload`
- `GET /datos/preview`
- `GET /datos/resumen`
- `GET /datos/sentimientos`

### Responsabilidades

- exponer el esquema esperado de columnas;
- validar archivos antes de cargarlos;
- persistir datasets con posibilidad de overwrite;
- devolver una vista previa tabular;
- construir un resumen operativo del dataset activo;
- exponer salidas asociadas al análisis de sentimientos.

### Papel dentro del sistema

Este router alimenta directamente la pestaña **Datos** del frontend y constituye
el punto de entrada del pipeline documental y analítico. También sirve como base
para la unificación histórica y la preparación de artefactos posteriores.

---

## Router `jobs`

**Archivo:** `backend/src/neurocampus/app/routers/jobs.py`

Este router agrupa procesos de larga duración o ejecución diferida.

### Endpoints principales

- `GET /jobs/ping`
- `POST /jobs/preproc/beto/run`
- `GET /jobs/preproc/beto/{job_id}`
- `GET /jobs/preproc/beto`
- `POST /jobs/data/unify/run`
- `GET /jobs/data/unify/{job_id}`
- `GET /jobs/data/unify`
- `POST /jobs/data/features/prepare/run`
- `GET /jobs/data/features/prepare/{job_id}`
- `GET /jobs/data/features/prepare`
- `POST /jobs/training/rbm-search`
- `GET /jobs/training/rbm-search/{job_id}`
- `GET /jobs/training/rbm-search`

### Responsabilidades

- lanzar el preprocesamiento con **BETO**;
- unificar históricos procesados o etiquetados;
- preparar el **feature-pack** de datos;
- disparar búsquedas de entrenamiento de tipo RBM search;
- exponer estado e historial de los jobs.

### Característica arquitectónica

El router usa `BackgroundTasks` y persistencia de metadatos de jobs en disco.
Por eso actúa como capa de orquestación entre la API y los comandos de
`app/jobs/`.

---

## Router `modelos`

**Archivo:** `backend/src/neurocampus/app/routers/modelos.py`

Este es uno de los routers más grandes del backend y concentra buena parte de la
orquestación del ciclo de modelado.

### Endpoints principales

- `GET /modelos/datasets`
- `GET /modelos/readiness`
- `POST /modelos/feature-pack/prepare`
- `POST /modelos/entrenar`
- `POST /modelos/sweep`
- `POST /modelos/entrenar/sweep`
- `GET /modelos/estado/{job_id}`
- `POST /modelos/champion/promote`
- `GET /modelos/runs`
- `GET /modelos/runs/{run_id}`
- `GET /modelos/sweeps/{sweep_id}`
- `GET /modelos/champion`

### Responsabilidades

- verificar si un dataset está listo para modelado;
- preparar artefactos previos al entrenamiento;
- lanzar entrenamientos manuales;
- ejecutar sweeps o búsquedas de configuraciones;
- consultar estado y detalle de runs;
- promover un run como **modelo campeón**;
- exponer el campeón vigente y sus metadatos.

### Observación arquitectónica importante

Aunque el proyecto sigue la idea de separar routers, schemas y lógica de
negocio, este archivo concentra una cantidad considerable de coordinación de
flujo, lectura de artefactos y compatibilidad entre diferentes variantes del
pipeline. Por eso debe entenderse como un router de **orquestación avanzada** y
no solo como una capa HTTP delgada.

---

## Router `prediccion`

**Archivo:** `backend/src/neurocampus/app/routers/prediccion.py`

Este router conserva una interfaz más compacta para predicción.

### Endpoints principales

- `POST /prediccion/online`
- `POST /prediccion/batch`

### Responsabilidades

- recibir una solicitud directa de inferencia online;
- procesar un lote de entradas para scoring;
- devolver respuestas simples de predicción.

### Papel actual

Este router representa una superficie de inferencia más minimalista y convive
con `predicciones.py`, que cubre el flujo más moderno del producto.

---

## Router `predicciones`

**Archivo:** `backend/src/neurocampus/app/routers/predicciones.py`

Este router está alineado con la pestaña **Predicciones** actual del frontend.

### Endpoints principales

- `GET /predicciones/health`
- `GET /predicciones/datasets`
- `GET /predicciones/runs`
- `GET /predicciones/teachers`
- `GET /predicciones/materias`
- `POST /predicciones/individual`
- `POST /predicciones/batch/run`
- `GET /predicciones/batch/{job_id}`
- `GET /predicciones/model-info`
- `POST /predicciones/predict`
- `GET /predicciones/outputs/preview`
- `GET /predicciones/outputs/file`

### Responsabilidades

- listar datasets disponibles para inferencia;
- resolver docentes y asignaturas para un dataset;
- consultar runs de predicción;
- obtener información del modelo activo;
- ejecutar predicción individual o batch;
- consultar estado y salidas persistidas;
- servir vistas previas y archivos exportables.

### Papel funcional

Este router conecta el backend con el flujo moderno de predicciones del
frontend, incluyendo la selección de dataset, docente, asignatura y revisión de
resultados persistidos.

---

## Router `dashboard`

**Archivo:** `backend/src/neurocampus/app/routers/dashboard.py`

Este router centraliza la lectura agregada del histórico institucional.

### Endpoints principales

- `GET /dashboard/status`
- `GET /dashboard/periodos`
- `GET /dashboard/catalogos`
- `GET /dashboard/kpis`
- `GET /dashboard/series`
- `GET /dashboard/radar`
- `GET /dashboard/wordcloud`
- `GET /dashboard/sentimiento`
- `GET /dashboard/rankings`

### Responsabilidades

- informar si el histórico procesado y etiquetado está listo;
- devolver periodos y catálogos disponibles;
- construir KPIs agregados;
- exponer series temporales e indicadores comparativos;
- construir rankings institucionales;
- devolver datos para radar, sentimiento y nube de palabras.

### Papel funcional

Es el backend analítico que alimenta la pestaña **Dashboard**. Su información no
se limita a un dataset puntual, sino al histórico consolidado del sistema.

---

## Router `admin_cleanup`

**Archivo:** `backend/src/neurocampus/app/routers/admin_cleanup.py`

Este router expone operaciones administrativas relacionadas con limpieza e
inventario de artefactos.

### Endpoints principales

- `GET /admin/cleanup/inventory`
- `POST /admin/cleanup`
- `GET /admin/cleanup/logs`

### Responsabilidades

- listar inventario de artefactos disponibles;
- ejecutar procesos de limpieza;
- consultar registros asociados a la limpieza.

### Papel funcional

Se trata de un router de soporte operativo y mantenimiento, más orientado a
administración técnica que a uso cotidiano del usuario final.

---

## Esquemas Pydantic

La carpeta `backend/src/neurocampus/app/schemas/` contiene los contratos usados
por los routers.

Archivos principales:

- `dashboard.py`
- `datos.py`
- `jobs.py`
- `modelos.py`
- `prediccion.py`
- `predicciones.py`

### Función arquitectónica

Estos esquemas permiten:

- validar payloads de entrada;
- estructurar respuestas tipadas;
- sostener la documentación automática de OpenAPI;
- reducir ambigüedades entre frontend y backend.

---

## Jobs ejecutables y comandos

La carpeta `backend/src/neurocampus/app/jobs/` reúne scripts y comandos que el
backend puede reutilizar desde endpoints o procesos manuales.

### Archivos relevantes

- `cmd_autoretrain.py`
- `cmd_cargar_dataset.py`
- `cmd_eval_confusion.py`
- `cmd_preprocesar_batch.py`
- `cmd_preprocesar_beto.py`
- `cmd_score_docente.py`
- `cmd_train_dbm_manual.py`
- `cmd_train_rbm_manual.py`
- `validate_prep_dir.py`

### Uso dentro de la arquitectura

Estos comandos respaldan procesos como:

- preprocesamiento de texto;
- carga de datasets;
- entrenamiento de modelos;
- evaluación;
- scoring;
- reentrenamiento.

No todos están necesariamente expuestos 1:1 como endpoints públicos, pero sí
forman parte del ecosistema operativo que los routers reutilizan.

---

## Capas de dominio del backend

Más allá de `app/`, el backend distribuye su lógica en varios módulos de
negocio.

### 1. `neurocampus/data/`

Agrupa lógica relacionada con datasets, validación, adaptación de formatos y
facades de datos.

Subáreas relevantes:

- `adapters/`
- `chain/`
- `facades/`
- `strategies/`
- `utils/`

### 2. `neurocampus/models/`

Contiene implementaciones y utilidades del ciclo de modelado basado en máquinas
de Boltzmann y variantes relacionadas.

Subáreas relevantes:

- `facades/`
- `observer/`
- `strategies/`
- `templates/`
- `utils/`
- `data/`

### 3. `neurocampus/prediction/` y `neurocampus/predictions/`

Separan piezas del flujo de inferencia y del manejo de predicciones persistidas,
según el nivel de abstracción o el caso de uso cubierto.

### 4. `neurocampus/dashboard/`

Agrupa lógica específica para construir agregados e insumos del dashboard.

### 5. `neurocampus/historico/`

Da soporte a flujos basados en consolidación y lectura del histórico.

### 6. `neurocampus/validation/`

Aporta validación estructural y de calidad sobre datasets y entradas.

### 7. `neurocampus/observability/`

Contiene middleware, contexto de logging y destinos de observabilidad.

---

## Relación con el frontend

El frontend consume el backend principalmente a través de:

- `frontend/src/services/datos.ts`
- `frontend/src/services/jobs.ts`
- `frontend/src/services/modelos.ts`
- `frontend/src/services/prediccion.ts`
- `frontend/src/services/predicciones.ts`
- `frontend/src/services/dashboard.ts`
- `frontend/src/services/adminCleanup.ts`

Esto refleja una correspondencia bastante directa entre:

- routers FastAPI;
- servicios TypeScript del frontend;
- pestañas principales de la interfaz.

La relación más importante es:

- **Datos** ↔ `/datos` y `/jobs`
- **Modelos** ↔ `/modelos`
- **Predicciones** ↔ `/predicciones` y parte de `/prediccion`
- **Dashboard** ↔ `/dashboard`

---

## Persistencia y artefactos

La arquitectura actual se apoya fuertemente en archivos locales y artefactos en
disco, no únicamente en base de datos transaccional.

En el repositorio y en las rutas operativas aparecen patrones como:

- `data/labeled/*`
- `historico/*`
- `artifacts/features/*`
- `predictions/*`
- `.jobs/*`

### Implicación arquitectónica

El backend no solo expone endpoints, sino que también gestiona un ciclo de vida
de artefactos:

- datasets cargados;
- históricos unificados;
- feature-packs;
- runs de entrenamiento;
- campeón activo;
- salidas de predicción;
- metadatos de jobs.

Esto explica por qué varias operaciones son asíncronas o consultables mediante
endpoints de estado.

---

## Fortalezas de la arquitectura actual

- separación por dominios funcionales relativamente clara;
- alineación razonable entre routers y servicios del frontend;
- uso de esquemas tipados para contratos HTTP;
- soporte para jobs de larga duración;
- trazabilidad con correlation id y logging estructurado;
- pipeline reutilizable para datos, modelos y predicciones.

---

## Limitaciones o rasgos a tener en cuenta

La arquitectura actual también presenta características que conviene documentar
explícitamente:

1. **Algunos routers son extensos**, especialmente `modelos.py` y
   `predicciones.py`.
2. Existe una convivencia entre rutas más antiguas y rutas más modernas, por
   ejemplo `prediccion` y `predicciones`.
3. El sistema depende de forma importante de **artefactos en disco** y de su
   consistencia entre procesos.
4. Parte de la lógica del sistema se articula mediante jobs y archivos de estado,
   no únicamente por operaciones síncronas directas.

Estas decisiones no invalidan la arquitectura, pero sí condicionan cómo debe
entenderse, operarse y documentarse.

---

## Resumen arquitectónico

El backend de NeuroCampus puede entenderse como una API FastAPI orientada a
pipeline, con cuatro dominios funcionales visibles para el producto:

- ingestión y preparación de datos;
- entrenamiento y gestión de modelos;
- inferencia y predicciones persistidas;
- lectura agregada del histórico para dashboard.

Sobre esa base, incorpora servicios de soporte para jobs, observabilidad,
validación, administración y gestión de artefactos. El resultado es una capa de
backend diseñada no solo para responder peticiones HTTP, sino para coordinar un
flujo analítico completo dentro del sistema.
