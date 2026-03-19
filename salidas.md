santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ git status
On branch documentacion
nothing to commit, working tree clean

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ find . -type f -name "*.md" | sort
./CHANGELOG.md
./README.md
./archive/README.md
./archive/legacy_ui/README.md
./docs/Entrenamiento.md
./docs/Inferencia_API.md
./docs/Preprocesamiento.md
./docs/Reporte_Docente.md
./docs/api.md
./docs/arquitectura.md
./docs/cleanup.md
./docs/dashboard_api.md
./docs/dashboard_data_dictionary.md
./docs/dashboard_troubleshooting.md
./docs/frontend_api_contracts.md
./docs/frontend_estado_actual.md
./docs/metodologias.md
./docs/modelos/RBM_design.md
./docs/modelos/README_D11_uso_rapido.md
./docs/modelos/runbook_backend_modelos.md
./docs/predicciones.md
./docs/rbm_resultados.md
./docs/source/api_backend/admin.md
./docs/source/api_backend/dashboard.md
./docs/source/api_backend/datos.md
./docs/source/api_backend/index.md
./docs/source/api_backend/jobs.md
./docs/source/api_backend/modelos.md
./docs/source/api_backend/prediccion.md
./docs/source/api_backend/predicciones.md
./docs/source/arquitectura/backend.md
./docs/source/arquitectura/frontend.md
./docs/source/arquitectura/index.md
./docs/source/arquitectura/pipeline_modelos.md
./docs/source/arquitectura/vision_general.md
./docs/source/devops/deploy.md
./docs/source/devops/index.md
./docs/source/devops/instalacion.md
./docs/source/devops/makefile.md
./docs/source/devops/tests.md
./docs/source/index.md
./docs/source/manual/dashboard.md
./docs/source/manual/datos.md
./docs/source/manual/index.md
./docs/source/manual/modelos.md
./docs/source/manual/predicciones.md
./docs/source/teoria/boltzmann_machine.md
./docs/source/teoria/deep_bm.md
./docs/source/teoria/implementacion_neurocampus.md
./docs/source/teoria/index.md
./docs/source/teoria/restricted_bm.md
./docs/ui_paridad_checklist.md
./docs/validacion_datasets.md
./docs/validacion_ejemplo.md
./examples/README.md
./scripts/README.md

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ sed -n '1,12p' docs/api.md
sed -n '1,12p' docs/arquitectura.md
sed -n '1,12p' docs/cleanup.md
sed -n '1,12p' docs/dashboard_api.md
sed -n '1,12p' docs/dashboard_data_dictionary.md
sed -n '1,12p' docs/frontend_estado_actual.md
sed -n '1,12p' docs/modelos/RBM_design.md
sed -n '1,12p' docs/modelos/README_D11_uso_rapido.md
sed -n '1,12p' docs/rbm_resultados.md
sed -n '1,12p' docs/ui_paridad_checklist.md
sed -n '1,12p' docs/validacion_datasets.md
sed -n '1,12p' docs/validacion_ejemplo.md
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
> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de etapas anteriores del proyecto y puede no reflejar la arquitectura actual del software.
>
> **Documentación activa relacionada:**
> - `docs/source/arquitectura/vision_general.md`
> - `docs/source/arquitectura/frontend.md`
> - `docs/source/arquitectura/backend.md`
> - `docs/source/arquitectura/pipeline_modelos.md`
>
> ---
# Apéndice A — Arquitectura (Día 2, referencia histórica)

> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior del proyecto y puede no reflejar el flujo actual de limpieza y administración.
>
> **Documentación activa relacionada:**
> - `docs/source/api_backend/admin.md`
>
> ---
# Limpieza de artefactos y temporales (Días 1–4)

## Comandos
- `make clean-inventory` — inventario resumido, sin eliminación.
- `make clean-artifacts-dry-run` — simulación de borrado con `--keep-last` y `--retention-days`.
> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior del proyecto y puede no reflejar la documentación principal vigente del Dashboard.
>
> **Documentación activa relacionada:**
> - `docs/source/api_backend/dashboard.md`
> - `docs/source/manual/dashboard.md`
>
> ---
# Dashboard API (histórico-only)

> **Propósito:** Documentar el contrato HTTP del Dashboard de NeuroCampus.
> **Regla de negocio:** el Dashboard **solo** consulta histórico (no datasets individuales).
> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia técnica de una etapa anterior del proyecto y puede no reflejar la documentación principal vigente del Dashboard.
>
> **Documentación activa relacionada:**
> - `docs/source/api_backend/dashboard.md`
> - `docs/source/manual/dashboard.md`
>
> ---
# Dashboard — Diccionario de datos (histórico)

Este documento describe las columnas y métricas principales usadas por la pestaña **Dashboard** en NeuroCampus.

> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior del frontend y puede no reflejar la estructura actual de la aplicación.
>
> **Documentación activa relacionada:**
> - `docs/source/arquitectura/frontend.md`
> - `docs/source/manual/index.md`
>
> ---
# Estado Actual del Frontend

## Rutas y Componentes
A continuación, se documentan las rutas principales del frontend actual y el estado de cada una.
> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia técnica de una etapa anterior del proyecto, centrada en variantes RBM y auditorías experimentales.
> No debe usarse como fuente principal de documentación del sistema actual.
>
> ---

# Día 11 · Documentación de Modelos RBM — NeuroCampus

**Fecha de generación:** 2025-11-05 02:33

Este documento describe la estructura actual de modelos RBM dentro del proyecto **NeuroCampus**, con sus roles, diferencias técnicas y relaciones. Incluye los cambios implementados en el **Día 11**, en el marco del bloque “Mejora de rendimiento de RBM (Días 10–15)”.

> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia técnica de una etapa anterior del proyecto, centrada en entrenamiento y auditoría RBM del Día 11.
> No debe usarse como fuente principal de documentación del sistema actual.
>
> ---

# README — Uso rápido modelos RBM (Día 11)

**Última actualización:** 2025-11-05 03:26

Este documento resume cómo **generar datos**, **entrenar modelos** y **auditar** resultados en NeuroCampus después de los cambios del Día 11.

> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia técnica de una etapa anterior del proyecto, centrada en auditoría y resultados experimentales de RBM.
> No debe usarse como fuente principal de documentación del sistema actual.
>
> ---
# Día 10 · Paso 6.4 — Informe de Auditoría RBM (K-Fold)

**Fecha de generación:** 2025-11-04 18:03

Este documento consolida los resultados y cambios técnicos realizados en los pasos 6.1–6.3, y deja la documentación final del **Paso 6.4**.


> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior de validación visual del frontend.
> No debe usarse como fuente principal de documentación del sistema actual.
>
> ---
# Checklist de Paridad Visual 1:1

Antes de marcar cualquier fase como "Done", asegúrate de que todos los componentes y rutas cumplen con las especificaciones visuales del prototipo.

## Shell (global)
- [ ] Sidebar: Asegurarse que el ancho, padding, tipografía e iconografía coinciden exactamente con el prototipo.
- [ ] Header: Comprobar que la alineación y los elementos coinciden exactamente (título "NeuroCampus").
> **Estado:** Legacy / histórico.
> Este documento se conserva como referencia de una etapa anterior del flujo de validación e ingesta de datasets y puede no reflejar el comportamiento actual del sistema.
>
> **Documentación activa relacionada:**
> - `docs/source/api_backend/datos.md`
> - `docs/Preprocesamiento.md`
> - `docs/frontend_api_contracts.md`
>
> ---
# Validación e Ingesta de Datasets — Diagnóstico (Día 6)

## Objetivo general
> **Estado:** Legacy / histórico.
> Este documento se conserva como ejemplo de una etapa anterior del flujo de validación y no debe usarse como fuente principal de documentación del sistema actual.
>
> ---
# Ejemplo de reporte de validación (Día 3)
Resumen + top de issues reales capturados en pruebas locales.
> Útil para Miembro B (UI) y para revisión rápida.

- summary.rows: 250
- summary.errors: 3
- summary.warnings: 7
- engine: pandas

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ sed -n '1,80p' docs/source/index.md
sed -n '1,80p' docs/source/manual/index.md
sed -n '1,120p' docs/source/api_backend/index.md
sed -n '1,120p' docs/source/arquitectura/index.md
sed -n '1,120p' README.md
# NeuroCampus

NeuroCampus es una plataforma para el análisis de evaluaciones docentes mediante
modelos de Máquinas de Boltzmann (BM, RBM, DBM), análisis de sentimientos y
visualización de resultados.

Esta documentación centraliza el manual de uso, la arquitectura del sistema,
los fundamentos teóricos, la referencia de API y la guía operativa del proyecto.

```{toctree}
:maxdepth: 2
:caption: Contenido

manual/index
arquitectura/index
teoria/index
api_backend/index
api_python/index
devops/index
# Manual de usuario

Este manual describe el uso funcional de NeuroCampus desde la interfaz principal
de la aplicación. La navegación actual se organiza en cuatro áreas principales:
**Dashboard**, **Datos**, **Modelos** y **Predicciones**.

En las siguientes secciones se documenta el propósito de cada pestaña, los flujos
de trabajo disponibles y las operaciones principales que el usuario puede ejecutar.

```{toctree}
:maxdepth: 1

dashboard
datos
modelos
predicciones# API del backend

Esta sección describe los endpoints HTTP expuestos por el backend de
NeuroCampus.

La API actual está organizada por dominios funcionales y registra los siguientes
routers activos:

- **Datos** (`/datos`)
- **Jobs** (`/jobs`)
- **Modelos** (`/modelos`)
- **Dashboard** (`/dashboard`)
- **Predicción online y batch** (`/prediccion`)
- **Predicciones y salidas persistidas** (`/predicciones`)
- **Administración y limpieza** (`/admin/cleanup`)

## Cobertura documental actual

Las páginas integradas en esta sección corresponden a los dominios activos del
backend y reflejan la organización vigente de la API:

- `datos`
- `jobs`
- `modelos`
- `dashboard`
- `prediccion`
- `predicciones`
- `admin`

## Resumen de dominios expuestos

| Dominio | Prefijo o ruta base | Propósito principal |
| --- | --- | --- |
| Datos | `/datos` | Validación, carga, resumen, vista previa y agregados del dataset |
| Jobs | `/jobs` | Ejecución y seguimiento de procesos asíncronos |
| Modelos | `/modelos` | Entrenamiento, readiness, sweeps, artefactos, runs y champion |
| Dashboard | `/dashboard` | KPIs, series, radar, rankings, sentimiento y wordcloud |
| Predicción | `/prediccion` | Inferencia online e inferencia batch directa |
| Predicciones | `/predicciones` | Catálogos, predicción individual/lote, salidas persistidas y preview |
| Administración | `/admin/cleanup` | Inventario, limpieza y logs de mantenimiento |

## Navegación de esta sección

```{toctree}
:maxdepth: 1

datos
jobs
modelos
dashboard
prediccion
predicciones
admin
```
# Arquitectura de NeuroCampus

Esta sección describe cómo está organizado el sistema a nivel técnico:
backend, frontend y el pipeline de modelos de Máquinas de Boltzmann.

```{toctree}
:maxdepth: 2

vision_general
backend
frontend
pipeline_modelos
```# NeuroCampus

MVP para analizar evaluaciones estudiantiles con **FastAPI (backend)**, **RBM Student** y **NLP (BETO)**.
Incluye pipeline de preprocesamiento, entrenamiento y endpoints de predicción (**/predicciones/predict** resuelve/valida el bundle por defecto y puede ejecutar inferencia real cuando `do_inference=true`).

---

## Requisitos

- Python 3.10+ (recomendado 3.10–3.12)
- Node 18+ (frontend)
- Git Bash / WSL (Windows) o shell POSIX
- Dependencias Python (backend):
  - `torch`, `transformers`, `pandas`, `pyarrow`, `fastapi`, `uvicorn`, `scikit-learn`, `scipy` (para el reporte)

> **Windows (Git Bash):** usa **comillas simples** en `printf`/`echo` para evitar `event not found` por `!`.

---

## Estructura de carpetas (resumen)

```
backend/
  src/neurocampus/  # Lógica central del sistema
    app/            # FastAPI, routers, pipelines y jobs CLI
    models/         # Estrategias RBM, entrenamiento de modelos
    prediction/     # Fachada de predicción
    services/nlp/   # Preprocesamiento y teacher (BETO)
config/             # Configuraciones (e.g. auditoría y búsqueda de hiperparámetros)
scripts/            # Scripts utilitarios (train models, smoke tests, simuladores)
frontend/           # Aplicación web (Vite + React + TS + Tailwind)
tests/              # Pruebas automatizadas (unitarias y API)
docs/               # Documentación y diagramas
schemas/            # JSON schemas
examples/           # Ejemplos versionables y dummy (reportes)

# Carpetas generadas (NO versionadas)
artifacts/          # Trabajos (jobs), champions (modelos activos), reportes
data/               # Datasets estandarizados y etiquetados
```

---

## Guía de Arquitectura

El sistema está dividido en dos grandes bloques:
- **Backend (FastAPI)**: Orquesta la carga de datos, el procesamiento de Procesamiento de Lenguaje Natural (PLN) utilizando el modelo BETO pre-entrenado y las estrategias de modelado de Machine Learning, principalmente focalizadas en Máquinas de Boltzmann Restringidas (RBM).
- **Frontend (Vite + React)**: Provee una interfaz gráfica de usuario para subir datasets, iniciar y monitorear trabajos de preparación, y visualizar las métricas y reportes del modelo "champion".
- **Scripts y Herramientas**: Utilidades en `scripts/` para ejecutar entrenamientos sin servidor, limpiar la carpeta temporal de artefactos y preparar ejecuciones de validación cruzada.

Para una exploración profunda teórica de los modelos y del ecosistema de ML empleado, revisar la carpeta `/docs`.

---

## Setup rápido

### 1) Backend

```bash
# Linux/macOS
python -m venv .venv && source .venv/bin/activate
# Windows PowerShell
# python -m venv .venv ; .\.venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt
```

Crea ignores para artefactos:

```bash
mkdir -p artifacts/{jobs,champions,reports}
printf '*\n!.gitkeep\n' > artifacts/jobs/.gitignore
printf '*\n!.gitkeep\n' > artifacts/champions/.gitignore
printf '*\n!.gitkeep\n' > artifacts/reports/.gitignore
touch artifacts/jobs/.gitkeep artifacts/champions/.gitkeep artifacts/reports/.gitkeep
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Pipeline de datos (end-to-end)

> Todos los comandos asumen que ejecutas desde la **raíz del repo**.
> Cuando uses módulos Python, define `PYTHONPATH="$PWD/backend/src"`.

### A) Cargar CSV crudo → parquet estandarizado

Convierte tu CSV de evaluaciones a un parquet con:
- `comentario`
- `calif_1..calif_10` (solo columnas `pregunta_1..10` o `pregunta 1..10`)
- (opcional) metadatos que quieras preservar

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.app.jobs.cmd_cargar_dataset   --in examples/Evaluacion.csv   --out data/processed/evaluaciones_2025.parquet   --meta-list "codigo_materia,docente,grupo,periodo"
```

> El cargador admite nombres de pregunta con **espacio o guion bajo** (ej. `pregunta 1` / `pregunta_1`).

### B) Preprocesamiento + BETO (teacher)

Limpia, lematiza y etiqueta con **BETO** (modo **probs** recomendado).
Filtra por número mínimo de tokens y aplica “gating” por confianza.

```bash
PYTHONPATH="$PWD/backend/src" python -m neurocampus.app.jobs.cmd_preprocesar_beto   --in data/processed/evaluaciones_2025.parquet   --out data/labeled/evaluaciones_2025_beto.parquet   --beto-mode probs   --threshold 0.90 --margin 0.25 --neu-min 0.90   --min-tokens 1
```

Genera un subset **texto-válido** (aceptado por el teacher):

```bash
python - <<'PY'
import pandas as pd
df = pd.read_parquet("data/labeled/evaluaciones_2025_beto.parquet")

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ grep -R "docs/api.md\|docs/arquitectura.md\|docs/cleanup.md\|docs/dashboard_api.md\|docs/dashboard_data_dictionary.md\|docs/frontend_estado_actual.md\|docs/modelos/RBM_design.md\|docs/modelos/README_D11_uso_rapido.md\|docs/rbm_resultados.md\|docs/ui_paridad_checklist.md\|docs/validacion_datasets.md\|docs/validacion_ejemplo.md" .
Binary file ./.git/index matches
./docs/api.md:- **Trazabilidad:** el sistema publicará eventos `prediction.requested|completed|failed` (ver `docs/arquitectura.md`).
./docs/arquitectura.md:- Ver detalle en `docs/api.md` (v0.4.0).
./docs/arquitectura.md:- Ver detalle de campos/ejemplos en **docs/api.md (v0.4.0)**.
./docs/arquitectura.md:| **Documentación** | `docs/arquitectura.md` (este archivo) | Se añaden rutas y flujo de unificación de datasets. |
./docs/modelos/README_D11_uso_rapido.md:git add backend/src/neurocampus/models/audit_kfold.py         backend/src/neurocampus/models/strategies/modelo_rbm_general.py         backend/src/neurocampus/models/strategies/modelo_rbm_restringida.py         backend/src/neurocampus/models/strategies/rbm_pura.py         scripts/train_rbm_pura.py         scripts/train_rbm_general.py         scripts/sim/generate_synthetic.py         config/rbm_audit.yaml         tests/unit/test_rbm_general_api.py         Makefile         docs/modelos/README_D11_uso_rapido.md

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ find docs/source -type f | sort
docs/source/api_backend/admin.md
docs/source/api_backend/dashboard.md
docs/source/api_backend/datos.md
docs/source/api_backend/index.md
docs/source/api_backend/jobs.md
docs/source/api_backend/modelos.md
docs/source/api_backend/prediccion.md
docs/source/api_backend/predicciones.md
docs/source/api_python/generated/neurocampus.app.jobs.cmd_preprocesar_beto.rst
docs/source/api_python/generated/neurocampus.app.jobs.cmd_train_dbm_manual.rst
docs/source/api_python/generated/neurocampus.app.jobs.cmd_train_rbm_manual.rst
docs/source/api_python/generated/neurocampus.models.bm_manual.rst
docs/source/api_python/generated/neurocampus.models.dbm_manual.rst
docs/source/api_python/generated/neurocampus.models.hparam_search.rst
docs/source/api_python/generated/neurocampus.models.rbm_manual.rst
docs/source/api_python/index.rst
docs/source/api_python/jobs.rst
docs/source/api_python/modelos.rst
docs/source/arquitectura/backend.md
docs/source/arquitectura/frontend.md
docs/source/arquitectura/index.md
docs/source/arquitectura/pipeline_modelos.md
docs/source/arquitectura/vision_general.md
docs/source/conf.py
docs/source/devops/deploy.md
docs/source/devops/index.md
docs/source/devops/instalacion.md
docs/source/devops/makefile.md
docs/source/devops/tests.md
docs/source/index.md
docs/source/manual/dashboard.md
docs/source/manual/datos.md
docs/source/manual/index.md
docs/source/manual/modelos.md
docs/source/manual/predicciones.md
docs/source/teoria/boltzmann_machine.md
docs/source/teoria/deep_bm.md
docs/source/teoria/implementacion_neurocampus.md
docs/source/teoria/index.md
docs/source/teoria/restricted_bm.md

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ git diff --stat main...documentacion
 CHANGELOG.md                                 |  186 ++-
 docs/Entrenamiento.md                        |  595 ++++++---
 docs/Inferencia_API.md                       |  820 +++++++++++--
 docs/Preprocesamiento.md                     |  646 +++++++---
 docs/api.md                                  |   14 +
 docs/arquitectura.md                         |   10 +
 docs/cleanup.md                              |    7 +
 docs/dashboard_api.md                        |    8 +
 docs/dashboard_data_dictionary.md            |    8 +
 docs/frontend_api_contracts.md               | 1682 +++++++++++++++++++-------
 docs/frontend_estado_actual.md               |    8 +
 docs/modelos/RBM_design.md                   |    5 +
 docs/modelos/README_D11_uso_rapido.md        |    5 +
 docs/modelos/runbook_backend_modelos.md      |  516 +++++++-
 docs/rbm_resultados.md                       |    5 +
 docs/source/api_backend/admin.md             |  301 +++--
 docs/source/api_backend/dashboard.md         |  416 +++++++
 docs/source/api_backend/datos.md             |  470 +++++--
 docs/source/api_backend/index.md             |   46 +-
 docs/source/api_backend/jobs.md              |  519 ++++++--
 docs/source/api_backend/modelos.md           |  646 ++++++++++
 docs/source/api_backend/prediccion.md        |  234 ++++
 docs/source/api_backend/predicciones.md      |  623 ++++++++++
 docs/source/arquitectura/backend.md          |  693 ++++++++---

santi@Santiago MINGW64 ~/OneDrive/Documents/Universidad/NeuroCampus (documentacion)
$ git diff --name-only main...documentacion
CHANGELOG.md
docs/Entrenamiento.md
docs/Inferencia_API.md
docs/Preprocesamiento.md
docs/api.md
docs/arquitectura.md
docs/cleanup.md
docs/dashboard_api.md
docs/dashboard_data_dictionary.md
docs/frontend_api_contracts.md
docs/frontend_estado_actual.md
docs/modelos/RBM_design.md
docs/modelos/README_D11_uso_rapido.md
docs/modelos/runbook_backend_modelos.md
docs/rbm_resultados.md
docs/source/api_backend/admin.md
docs/source/api_backend/dashboard.md
docs/source/api_backend/datos.md
docs/source/api_backend/index.md
docs/source/api_backend/jobs.md
docs/source/api_backend/modelos.md
docs/source/api_backend/prediccion.md
docs/source/api_backend/predicciones.md