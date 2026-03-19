# Visión general de la arquitectura

## Propósito

NeuroCampus es una plataforma para procesar evaluaciones docentes, construir
artefactos de datos, entrenar modelos basados en Máquinas de Boltzmann,
ejecutar predicciones y exponer resultados agregados mediante una interfaz web.

La arquitectura actual del sistema está organizada para soportar cuatro flujos
funcionales principales:

1. **Datos**
2. **Modelos**
3. **Predicciones**
4. **Dashboard**

Estos cuatro flujos están reflejados tanto en el frontend como en el backend y
constituyen la estructura operativa real del software en su versión vigente.

---

## Vista global del sistema

A alto nivel, NeuroCampus se compone de cinco capas principales:

1. **Frontend web**
2. **API backend**
3. **Capa de datos y artefactos**
4. **Capa de modelos y entrenamiento**
5. **Jobs y observabilidad**

La relación entre estas capas es la siguiente:

- el **frontend** ofrece la interfaz de operación y consulta;
- la **API backend** expone endpoints por dominio;
- la **capa de datos** gestiona validación, persistencia y artefactos;
- la **capa de modelos** resuelve entrenamiento, evaluación y selección de
  corridas;
- la **capa de jobs** ejecuta procesos pesados o asíncronos como
  preprocesamiento, unificación, feature-pack y entrenamiento.

---

## Frontend

### Stack

El frontend está implementado con:

- **React**
- **TypeScript**
- **Vite**
- **React Router**

Su ubicación principal es:

```text
frontend/
```

### Estructura real de navegación

La navegación vigente está definida en:

```text
frontend/src/routes/Router.tsx
```

Las rutas activas actuales son:

- `/dashboard`
- `/datos`
- `/models`
- `/prediction`

Estas rutas cargan las cuatro páginas principales:

- `DashboardPage.tsx`
- `DatosPage.tsx`
- `ModelosPage.tsx`
- `PrediccionesPage.tsx`

El layout principal se monta con:

```text
frontend/src/layouts/AppShell.tsx
```

La barra lateral está implementada en:

```text
frontend/src/components/Sidebar.tsx
```

### Componentes funcionales principales

La UI operativa real se concentra en estos componentes:

- `frontend/src/components/DashboardTab.tsx`
- `frontend/src/components/DataTab.tsx`
- `frontend/src/components/ModelsTab.tsx`
- `frontend/src/components/PredictionsTab.tsx`

Cada uno representa una pestaña funcional completa y consume servicios del
backend mediante clientes HTTP específicos.

### Capa de servicios frontend

El acceso a backend está encapsulado en:

- `frontend/src/services/datos.ts`
- `frontend/src/services/jobs.ts`
- `frontend/src/services/modelos.ts`
- `frontend/src/services/prediccion.ts`
- `frontend/src/services/predicciones.ts`
- `frontend/src/services/dashboard.ts`
- `frontend/src/services/adminCleanup.ts`

Esto permite separar:

- lógica de presentación;
- contratos HTTP;
- tipado de payloads;
- composición de estados y flujos.

### Estado compartido

La sincronización de contexto entre pestañas se apoya en:

```text
frontend/src/state/appFilters.store.ts
```

Este estado compartido es especialmente importante entre **Modelos** y
**Predicciones**, donde se conserva trazabilidad del dataset, el run
seleccionado y el origen lógico de la predicción.

---

## Backend API

### Stack

El backend está construido con:

- **FastAPI**
- **Python**
- **Pydantic**

Su punto de entrada principal es:

```text
backend/src/neurocampus/app/main.py
```

### Responsabilidades del backend principal

La aplicación principal de FastAPI se encarga de:

- registrar routers por dominio;
- exponer el endpoint `/health`;
- habilitar CORS para el frontend;
- aplicar límite de tamaño de subida;
- conectar middleware de `Correlation-Id`;
- activar logging y observabilidad.

### Routers activos

La versión actual registra los siguientes routers:

- `/datos`
- `/jobs`
- `/modelos`
- `/prediccion`
- `/dashboard`
- `/predicciones`
- `/admin/cleanup`

Estos routers viven en:

- `backend/src/neurocampus/app/routers/datos.py`
- `backend/src/neurocampus/app/routers/jobs.py`
- `backend/src/neurocampus/app/routers/modelos.py`
- `backend/src/neurocampus/app/routers/prediccion.py`
- `backend/src/neurocampus/app/routers/dashboard.py`
- `backend/src/neurocampus/app/routers/predicciones.py`
- `backend/src/neurocampus/app/routers/admin_cleanup.py`

### Esquemas

Los contratos del backend se modelan con esquemas en:

- `backend/src/neurocampus/app/schemas/datos.py`
- `backend/src/neurocampus/app/schemas/jobs.py`
- `backend/src/neurocampus/app/schemas/modelos.py`
- `backend/src/neurocampus/app/schemas/prediccion.py`
- `backend/src/neurocampus/app/schemas/predicciones.py`
- `backend/src/neurocampus/app/schemas/dashboard.py`

Estos esquemas formalizan payloads de entrada, respuestas, estados de jobs y
estructuras utilizadas por el frontend.

---

## Flujo funcional del sistema

## 1. Datos

La pestaña **Datos** es el punto de entrada del pipeline.

Desde aquí el sistema permite:

- validar datasets;
- subir archivos al backend;
- fijar un dataset activo por periodo;
- ejecutar análisis de sentimientos con BETO;
- unificar históricos;
- construir paquetes de características.

Este flujo se conecta principalmente con:

- `routers/datos.py`
- `routers/jobs.py`
- `app/jobs/cmd_cargar_dataset.py`
- `app/jobs/cmd_preprocesar_beto.py`
- `app/jobs/cmd_preprocesar_batch.py`

Los artefactos generados en esta etapa alimentan directamente el resto del
sistema.

## 2. Modelos

La pestaña **Modelos** consume datasets y artefactos preparados para ejecutar el
ciclo de modelado.

La implementación actual organiza esta área en siete subpestañas:

- Resumen
- Entrenamiento
- Ejecuciones
- Campeón
- Sweep
- Artefactos
- Diagnóstico

Desde esta capa se gestionan tareas como:

- selección de dataset de trabajo;
- lanzamiento de entrenamientos;
- seguimiento de corridas;
- comparación de resultados;
- selección de champion;
- consulta de artefactos y diagnósticos.

Su núcleo backend se apoya en:

- `routers/modelos.py`
- `schemas/modelos.py`
- `models/`
- `app/jobs/cmd_train_rbm_manual.py`
- `app/jobs/cmd_train_dbm_manual.py`
- `app/jobs/cmd_eval_confusion.py`
- `app/jobs/cmd_autoretrain.py`

## 3. Predicciones

La pestaña **Predicciones** resuelve la inferencia del sistema.

En la versión actual existen dos dominios relacionados:

- `prediccion`
- `predicciones`

Esto refleja dos formas de trabajar:

- predicción online o batch desde el dominio más simple de inferencia;
- predicciones persistidas, runs, preview y flujos más ricos asociados a
  `score_docente`.

La UI vigente trabaja sobre selección contextual de:

- dataset;
- docente;
- asignatura;
- runs disponibles o champion activo, según el caso.

Backend asociado:

- `routers/prediccion.py`
- `routers/predicciones.py`
- `schemas/prediccion.py`
- `schemas/predicciones.py`
- `app/jobs/cmd_score_docente.py`

## 4. Dashboard

La pestaña **Dashboard** es la capa de consulta agregada del sistema.

A diferencia de Datos, Modelos y Predicciones, el Dashboard no opera sobre un
archivo puntual, sino sobre históricos consolidados.

Sus fuentes principales son:

- histórico procesado;
- histórico etiquetado;
- KPIs agregados de predicciones persistidas;
- catálogos institucionales.

El backend del dashboard se apoya en:

- `routers/dashboard.py`
- `schemas/dashboard.py`
- `dashboard/queries.py`
- `dashboard/aggregations.py`
- `dashboard/predictions_kpis.py`

Esta capa resume el comportamiento del sistema mediante:

- KPIs;
- rankings;
- series temporales;
- radar de indicadores;
- sentimiento;
- nube de palabras.

---

## Capa de datos

La lógica de manejo de datos está centralizada en:

```text
backend/src/neurocampus/data/
```

Aquí se agrupan componentes como:

- adaptadores de almacenamiento;
- utilidades para DataFrames;
- helpers de persistencia y rutas;
- piezas de transformación y soporte al pipeline.

Además, el backend mantiene directorios de trabajo y artefactos como:

- `data/raw/`
- `data/processed/`
- `data/labeled/`
- `historico/`
- `artifacts/features/`
- `artifacts/predictions/`
- `artifacts/models/` o equivalentes de entrenamiento según el flujo
  ejecutado.

La convención general del proyecto es que los datasets y artefactos queden
organizados por `dataset_id`, que en muchos flujos coincide con el semestre o
periodo activo.

---

## Capa de modelos

La capa de modelos vive en:

```text
backend/src/neurocampus/models/
```

Esta capa contiene la lógica de entrenamiento y evaluación de modelos basados en
Máquinas de Boltzmann.

### Componentes principales

Entre los módulos relevantes se encuentran:

- `bm_manual.py`
- `rbm_manual.py`
- `dbm_manual.py`
- `hparam_search.py`
- `registry.py`
- estrategias y utilidades auxiliares

### Responsabilidad de esta capa

Su función es desacoplar la lógica matemática y experimental de la superficie de
API.

Así, los routers no implementan directamente el entrenamiento, sino que delegan
en funciones, estrategias y jobs especializados.

---

## Jobs y procesos batch

Una parte importante del sistema está diseñada alrededor de procesos pesados o
asíncronos.

Estos comandos viven en:

```text
backend/src/neurocampus/app/jobs/
```

### Jobs relevantes de la versión actual

- `cmd_cargar_dataset.py`
- `cmd_preprocesar_batch.py`
- `cmd_preprocesar_beto.py`
- `cmd_train_rbm_manual.py`
- `cmd_train_dbm_manual.py`
- `cmd_eval_confusion.py`
- `cmd_score_docente.py`
- `cmd_autoretrain.py`

### Por qué existen

Estos jobs permiten:

- ejecutar tareas largas sin bloquear la UI;
- reutilizar lógica desde CLI y desde la API;
- registrar estado, salida y errores por corrida;
- mantener trazabilidad operativa del pipeline.

En la práctica, la API actúa muchas veces como capa de orquestación sobre estos
procesos.

---

## Observabilidad y logging

La observabilidad del sistema está organizada en:

```text
backend/src/neurocampus/observability/
```

### Componentes destacados

- middleware de correlación;
- contexto de logging;
- filtros y destinos de logging;
- wiring de eventos de entrenamiento y predicción.

### Objetivo

Esta capa permite:

- asociar eventos a una petición concreta;
- mejorar trazabilidad entre frontend, backend y jobs;
- registrar eventos `training.*` y `prediction.*`;
- facilitar diagnóstico operativo.

El backend también define su configuración de logging en:

```text
backend/src/neurocampus/app/logging_config.py
```

---

## Persistencia y artefactos

Una característica central de NeuroCampus es que no trabaja solo con respuestas
HTTP efímeras, sino con artefactos persistidos en disco.

Entre los artefactos más importantes están:

- datasets validados o procesados;
- datasets etiquetados por BETO;
- históricos unificados;
- feature-packs;
- corridas de entrenamiento;
- métricas y diagnósticos;
- salidas de predicción.

Esto explica por qué varias áreas del sistema consultan tanto endpoints de API
como estructuras de archivos generadas por jobs previos.

---

## Tests y calidad

El repositorio incluye pruebas automáticas en:

```text
tests/
```

Además, existen pruebas o validaciones específicas en distintas capas del
proyecto, incluyendo servicios frontend y componentes del backend.

La presencia de tests es importante porque la arquitectura actual combina:

- endpoints HTTP;
- procesamiento de archivos;
- jobs asíncronos;
- lógica estadística y de modelado.

En este contexto, la documentación debe entenderse como complemento de una base
que ya incorpora validación técnica automatizada.

---

## Documentación y publicación

El repositorio contiene una documentación estructurada con Sphinx en:

```text
docs/source/
```

Esta documentación se divide en:

- manual de usuario;
- arquitectura;
- teoría;
- API backend;
- API Python;
- devops.

También existe un workflow para publicación documental en:

```text
.github/workflows/docs.yml
```

Esto confirma que la arquitectura del proyecto no solo contempla software de
aplicación, sino también una capa formal de documentación versionada.

---

## Material legacy

El repositorio conserva una implementación anterior de la UI en:

```text
archive/legacy_ui/
```

Este material no corresponde a la interfaz operativa actual, pero sí es útil
como referencia histórica del proyecto.

Por esta razón, la documentación vigente debe distinguir claramente entre:

- arquitectura actual;
- documentación histórica o de transición.

---

## Principios arquitectónicos observables en la versión actual

A partir de la implementación vigente, la arquitectura de NeuroCampus responde a
estos principios prácticos:

### 1. Separación por dominios

Los flujos de Datos, Modelos, Predicciones y Dashboard están claramente
separados tanto en frontend como en backend.

### 2. Orquestación por API y jobs

La API no resuelve todo en memoria durante una sola petición; en muchos casos
coordina jobs que producen artefactos persistidos.

### 3. Persistencia orientada a artefactos

Buena parte del valor del sistema reside en archivos generados por etapas
anteriores del pipeline.

### 4. Reutilización de componentes

La lógica de datos, entrenamiento y predicción puede reutilizarse desde routers,
servicios y jobs.

### 5. Trazabilidad operativa

La incorporación de logging contextual y correlación de peticiones refleja un
interés explícito por observabilidad y mantenimiento.

---

## Resumen

La arquitectura actual de NeuroCampus puede entenderse como un sistema web de
analítica y modelado con cuatro dominios funcionales principales:

- **Datos**: ingesta, validación y preparación
- **Modelos**: entrenamiento, comparación y champion
- **Predicciones**: inferencia y salidas persistidas
- **Dashboard**: lectura agregada e histórica

Esta arquitectura está soportada por:

- un frontend React/TypeScript organizado por pestañas y servicios;
- un backend FastAPI organizado por routers y esquemas;
- una capa de jobs que ejecuta procesos pesados;
- una capa de datos y modelos reutilizable;
- observabilidad para trazabilidad y diagnóstico;
- documentación Sphinx integrada al repositorio.

En conjunto, esto convierte a NeuroCampus en una plataforma orientada no solo a
visualizar información, sino a sostener un pipeline completo de datos,
modelado, predicción y análisis institucional.
