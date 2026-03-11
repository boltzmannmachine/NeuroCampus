# Changelog

Este archivo resume los cambios funcionales y documentales relevantes de
NeuroCampus a partir del estado actual verificable del repositorio.

> Nota editorial:
> el repositorio contiene rastros de etapas intermedias del proyecto
> (por ejemplo, referencias a “Día 7”, “P2.2” y layouts legacy). Como parte de la
> normalización documental, este changelog se reorganiza para reflejar el
> **estado vigente del software** y dejar explícito qué elementos pertenecen a
> flujos heredados o ya superados.
>
> Cuando no fue posible reconstruir con certeza una cronología fina por versión,
> se prefirió consolidar el cambio por capacidades reales del sistema antes que
> mantener hitos históricos ambiguos.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed
- Se alinea la documentación del proyecto con la implementación vigente de la
  aplicación.
- Se actualizan los manuales de usuario de:
  - `Dashboard`
  - `Datos`
  - `Modelos`
  - `Predicciones`
- Se actualiza la documentación de arquitectura para reflejar la estructura real
  de frontend, backend y pipeline de modelos.
- Se amplía la documentación de API backend para cubrir routers activos que no
  estaban integrados completamente en Sphinx:
  - `/dashboard`
  - `/modelos`
  - `/prediccion`
  - `/predicciones`
  - `/admin/cleanup`
- Se actualizan documentos técnicos operativos fuera de `docs/source/`,
  incluyendo contratos frontend-backend, entrenamiento, preprocesamiento,
  inferencia y scripts auxiliares.

### Fixed
- Se corrige el índice principal de Sphinx y la navegación de la documentación
  publicada.
- Se elimina la desalineación entre documentación antigua de la UI y las
  pestañas reales del frontend.
- Se corrige la descripción de la capa de predicción, separando claramente:
  - predicción directa (`/prediccion`)
  - predicción operativa persistida (`/predicciones`)

---

## [0.6.0]

Versión base actualmente reflejada por la API en `backend/src/neurocampus/app/main.py`.

### Added
- Backend FastAPI con routers activos para:
  - `/datos`
  - `/jobs`
  - `/modelos`
  - `/prediccion`
  - `/dashboard`
  - `/predicciones`
  - `/admin/cleanup`
- Dashboard institucional basado en histórico unificado y, cuando existe,
  histórico etiquetado.
- Flujo de datos con:
  - validación de archivos,
  - carga de datasets por periodo,
  - resumen de dataset,
  - preview tabular,
  - análisis de sentimientos,
  - unificación histórica,
  - preparación de feature-pack.
- Flujo de modelos con soporte para:
  - detección de datasets disponibles,
  - verificación de readiness,
  - construcción de feature-pack,
  - entrenamiento de runs,
  - sweeps síncronos y asíncronos,
  - consulta de runs,
  - diagnóstico de estado,
  - promoción y consulta de champion.
- Flujo de predicciones con soporte para:
  - exploración de datasets disponibles,
  - listado de docentes y materias,
  - predicción individual por par docente–materia,
  - ejecución batch asíncrona,
  - historial de runs de predicción,
  - preview y descarga de outputs persistidos.
- Ruta de predicción directa para inferencia online y batch ligero a través de
  `/prediccion`.
- Mecanismos de observabilidad y trazabilidad:
  - `Correlation-Id`
  - logging contextual
  - wiring seguro de eventos `training.*` y `prediction.*`
- Límite de tamaño de subida configurable para endpoints de datos.

### Changed
- La arquitectura documental pasa a describir la aplicación real organizada en
  cuatro pestañas principales:
  - `Dashboard`
  - `Datos`
  - `Modelos`
  - `Predicciones`
- El concepto de champion se documenta y usa según el layout vigente basado en:
  `artifacts/champions/<family>/<dataset_id>/champion.json`.
- El flujo de entrenamiento recomendado se centra en la API de `/modelos` y en
  los artefactos persistidos bajo `artifacts/runs/<run_id>/`.
- El flujo de predicciones se apoya en feature-packs y artefactos persistidos,
  no solo en inferencia puntual en memoria.

### Fixed
- Se evita seguir documentando como “actual” el flujo histórico de RBM Student
  y de predicción P2.2 como si representaran el estado vigente completo del
  sistema.
- Se aclara que algunas rutas o convenciones antiguas permanecen por
  compatibilidad o legado, pero no son la referencia principal para operar la
  plataforma hoy.

---

## Legacy / migración documental

Los siguientes elementos aparecen en el repositorio como parte de etapas
anteriores, auditorías puntuales o snapshots de implementación, y no deben
interpretarse como la referencia activa del sistema:

- documentación de paridad o checklist temporal de UI;
- documentos de validación puntual de datasets o ejemplos cerrados;
- referencias a layouts legacy de champions;
- documentación que describe `/predicciones/predict` únicamente como
  `resolve/validate` de una fase intermedia del proyecto;
- snapshots históricos del frontend o de la arquitectura previos a la versión
  actual de las pestañas.

Estos materiales se conservan por trazabilidad, pero la fuente de verdad para el
estado actual debe ser:

- `README.md`
- `docs/source/`
- la documentación técnica operativa actualizada bajo `docs/`

---

## Notas

- Este changelog prioriza exactitud funcional sobre reconstrucción histórica
  exhaustiva.
- Si en el futuro se decide formalizar releases con mayor precisión temporal,
  conviene reconstruirlos a partir del historial Git y no únicamente desde los
  documentos heredados del repositorio.
