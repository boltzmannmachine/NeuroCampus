# Entrenamiento (NeuroCampus)

Este documento describe el flujo de **entrenamiento vigente** en NeuroCampus.

En la versión actual del sistema, el entrenamiento recomendado **no** se realiza
principalmente por scripts CLI aislados, sino a través del router:

- `/modelos`

Ese flujo produce:

- un `job_id` para seguimiento;
- un `run_id` persistido en `artifacts/runs/<run_id>/`;
- métricas estructuradas en `metrics.json`;
- un bundle de inferencia (`predictor.json`, `preprocess.json`, artefactos de modelo);
- y, cuando corresponde, actualización del **champion** del dataset.

---

## 1. Qué se entrena hoy en el sistema

La pestaña **Modelos** y el router `/modelos` soportan actualmente dos familias
funcionales principales:

- **`sentiment_desempeno`**
  - orientada al modelado basado en variables de evaluación y señales derivadas
    de sentimiento.
- **`score_docente`**
  - orientada a predicción de score agregado por par docente–materia.

Además, el backend soporta varias estrategias/modelos, entre ellas:

- `rbm_general`
- `rbm_restringida`
- `dbm_manual`

El sistema actual ya no debe entenderse como un único entrenamiento “RBM
Student” fijo, sino como un flujo de entrenamiento versionado, persistente y
comparable entre corridas.

---

## 2. Insumos previos al entrenamiento

Antes de entrenar, NeuroCampus necesita que el dataset tenga listos ciertos
artefactos. La combinación exacta depende de la familia y del plan de datos,
pero en términos generales intervienen estas capas:

### 2.1 Dataset crudo
Ubicación típica:

- `datasets/<dataset_id>.parquet`
- `datasets/<dataset_id>.csv`

### 2.2 Dataset procesado
Ubicación típica:

- `data/processed/<dataset_id>.parquet`

### 2.3 Dataset etiquetado / enriquecido
Ubicación típica:

- `data/labeled/<dataset_id>_beto.parquet`
- u otra variante compatible resuelta por el backend.

### 2.4 Feature-pack
Ubicación típica:

- `artifacts/features/<dataset_id>/train_matrix.parquet`
- `artifacts/features/<dataset_id>/meta.json`
- `artifacts/features/<dataset_id>/pair_matrix.parquet`
- `artifacts/features/<dataset_id>/pair_meta.json`

---

## 3. Verificación de readiness

Antes de lanzar un entrenamiento, el backend expone una verificación explícita:

- `GET /modelos/readiness?dataset_id=<dataset_id>`

Este endpoint informa, entre otros aspectos:

- si existe el dataset etiquetado;
- si existe `historico/unificado_labeled.parquet`;
- si existe el feature-pack;
- si existe la `pair_matrix`;
- qué `score_col` fue detectada;
- y qué rutas relevantes está usando el sistema.

### Cuándo usarlo
Conviene usarlo cuando:

- la UI de **Modelos** no habilita bien los flujos;
- se sospecha que faltan artefactos;
- se está depurando por qué una corrida no puede arrancar.

---

## 4. Datasets visibles para la pestaña Modelos

El backend expone:

- `GET /modelos/datasets`

Este endpoint detecta datasets desde varias fuentes del filesystem:

- `artifacts/features/`
- `data/labeled/`
- `data/processed/`
- `datasets/`

Para cada dataset devuelve indicadores como:

- `has_train_matrix`
- `has_pair_matrix`
- `has_labeled`
- `has_processed`
- `has_raw_dataset`
- `has_champion_sentiment`
- `has_champion_score`

Esto convierte a `/modelos/datasets` en la fuente de verdad para poblar el
selector principal de la pestaña **Modelos**.

---

## 5. Preparación del feature-pack

El entrenamiento actual depende en muchos casos del **feature-pack**. El backend
permite construirlo o reconstruirlo mediante:

- `POST /modelos/feature-pack/prepare`

### Parámetros principales
- `dataset_id` (requerido)
- `input_uri` (opcional)
- `force` (opcional)
- `text_feats_mode`
- `text_col`
- `text_n_components`
- `text_min_df`
- `text_max_features`

### Resolución automática del origen
Si no se envía `input_uri`, el backend intenta resolver el origen en este orden:

1. `data/labeled/<dataset_id>_beto.parquet`
2. `data/processed/<dataset_id>.parquet`
3. `datasets/<dataset_id>.parquet`

### Salida esperada
Al finalizar correctamente, el proceso deja listo el directorio:

- `artifacts/features/<dataset_id>/`

con artefactos reutilizables para entrenamiento e inferencia.

---

## 6. Entrenamiento recomendado: vía API

El flujo recomendado hoy es:

- `POST /modelos/entrenar`

Este endpoint crea un `job_id`, corre el entrenamiento en background y persiste
un **run** formal.

### Qué hace internamente
1. resuelve hiperparámetros efectivos;
2. determina la fuente de datos (`data_source` / `data_ref`);
3. prepara el dataset seleccionado;
4. construye la estrategia del modelo;
5. ejecuta entrenamiento mediante la plantilla de entrenamiento;
6. guarda artifacts del run;
7. intenta construir el bundle de inferencia;
8. evalúa si debe actualizar el champion.

### Respuesta esperada
La respuesta devuelve, como mínimo:

- `job_id`
- `status`
- `message`

### Seguimiento
El estado del job se consulta con:

- `GET /modelos/estado/{job_id}`

---

## 7. Estado del job de entrenamiento

El endpoint:

- `GET /modelos/estado/{job_id}`

expone el estado en memoria del job o, en el caso de sweeps, cae a un resumen
persistido si corresponde.

### Campos relevantes
Entre los campos que pueden aparecer están:

- `job_id`
- `status`
- `progress`
- `model`
- `params`
- `metrics`
- `history`
- `run_id`
- `artifact_path`
- `champion_promoted`
- `time_total_ms`
- `warm_start_trace`

### Estados esperables
- `running`
- `completed`
- `failed`
- `unknown`

### Qué significa `artifact_path`
Cuando el run alcanza persistencia, `artifact_path` apunta típicamente a:

- `artifacts/runs/<run_id>`

Eso permite inspeccionar el resultado incluso si hubo una falla posterior en
etapas auxiliares del pipeline.

---

## 8. Qué se guarda en cada run

Cada entrenamiento exitoso genera un run en:

- `artifacts/runs/<run_id>/`

### Artefactos típicos
- `metrics.json`
- `predictor.json`
- `preprocess.json`
- `model/` con archivos exportados del modelo
- otros archivos auxiliares según el modelo y la familia

### Contrato mínimo de persistencia
En el sistema actual, un run útil para inferencia y promoción debe contar con:

- métricas persistidas;
- contexto suficiente del request;
- bundle de predictor válido;
- export del modelo compatible con la familia/estrategia entrenada.

### Validación de export
El backend valida explícitamente la integridad de export para ciertos modelos:

- RBM: `meta.json` + `rbm.pt` / `head.pt`
- DBM: `meta.json` + `dbm_state.npz`

Si el export está incompleto, el entrenamiento puede terminar como fallido aun
si parte del run ya fue persistida.

---

## 9. Métricas y evaluación

El sistema actual normaliza métricas según el contrato de cada familia y
persiste información que luego consumen:

- la pestaña **Modelos**;
- la promoción de champion;
- el router `/predicciones`;
- y la comparación entre runs.

### Métricas frecuentes
Según la familia y el task type, pueden aparecer métricas como:

- `primary_metric`
- `primary_metric_mode`
- `primary_metric_value`
- `accuracy`
- `f1_macro`
- `val_accuracy`
- `val_f1_macro`
- `n_train`
- `n_val`
- matriz de confusión

### Interpretación recomendada
Para comparar corridas no conviene usar solo accuracy. En el flujo actual del
proyecto, la decisión de campeones y sweeps se apoya principalmente en una
**métrica primaria** explícita por familia.

---

## 10. Warm start

El entrenamiento actual soporta resolución de **warm start** cuando el request
lo solicita.

### Qué ocurre
El backend puede:

- resolver una corrida o modelo base previa;
- localizar el directorio de modelo exportado;
- e intentar cargar pesos como punto de partida.

### Trazabilidad
La ejecución deja rastro en:

- `warm_start_requested`
- `warm_start_resolved`
- `warm_started`
- `warm_start_trace`
- y, cuando aplica, un objeto `warm_start` en métricas.

### Importancia práctica
Esto permite distinguir entre:

- un warm start solicitado pero no resuelto;
- uno resuelto pero no aplicado;
- y uno efectivamente aplicado.

---

## 11. Sweep de modelos

El backend soporta dos modalidades relacionadas con sweep:

### 11.1 Sweep determinístico síncrono
- `POST /modelos/sweep`

Entrena un conjunto de modelos bajo condiciones comparables y devuelve el mejor
candidato según la métrica primaria.

#### Características
- ejecución síncrona;
- orden determinístico de candidatos;
- tie-break reproducible;
- promoción automática opcional del champion.

### 11.2 Sweep asíncrono
- `POST /modelos/entrenar/sweep`

Lanza un job de sweep y permite consultar el estado por `job_id`.

### Consulta de resumen de sweep
- `GET /modelos/sweeps/{sweep_id}`

Este endpoint devuelve:

- `best`
- `best_overall`
- `best_by_model`
- `candidates`
- `summary_path`
- `primary_metric`
- `primary_metric_mode`

---

## 12. Runs disponibles

El sistema permite listar runs con:

- `GET /modelos/runs`

### Filtros soportados
- `model_name`
- `dataset`
- `dataset_id`
- `periodo`
- `family`

### Para qué sirve
Este endpoint alimenta la pestaña **Ejecuciones** y permite:

- comparar corridas;
- recuperar métricas resumidas;
- inspeccionar contexto de entrenamiento;
- identificar runs candidatos a champion;
- enlazar con detalles completos.

### Detalle de un run
- `GET /modelos/runs/{run_id}`

Devuelve información más completa del run, incluyendo métricas, contexto y
estado del bundle de inferencia.

---

## 13. Champion

El modelo activo por dataset/family se consulta con:

- `GET /modelos/champion`

Y puede promoverse manualmente con:

- `POST /modelos/champion/promote`

### Ubicación conceptual
El champion vive bajo una estructura de este estilo:

- `artifacts/champions/<family>/<dataset_id>/champion.json`

### Qué representa
El champion es el run actualmente elegido como referencia operativa para
consumo posterior, especialmente por el router `/predicciones`.

### Promoción manual
La promoción manual debe usarse cuando:

- se desea fijar explícitamente una corrida concreta;
- se está auditando un cambio de champion;
- o se necesita corregir la selección automática.

### Errores típicos
- `404` si no existe el run o faltan métricas;
- `422` si `run_id` es inválido;
- `409` si la promoción no puede concretarse por inconsistencia operativa.

---

## 14. Relación con Predicciones

El entrenamiento ya no termina en la simple obtención de métricas. En el flujo
actual del sistema, un run entrenado se convierte en insumo de:

- `GET /predicciones/model-info`
- `POST /predicciones/predict`
- `POST /predicciones/batch/run`
- `GET /predicciones/runs`
- `GET /predicciones/outputs/preview`
- `GET /predicciones/outputs/file`

Por eso, para considerar “cerrado” un entrenamiento útil, no basta con que el
job termine: debe quedar un run persistido, un bundle válido y, si corresponde,
un champion consumible.

---

## 15. CLI y scripts legacy

Todavía pueden existir scripts CLI útiles para debugging o trabajo experimental,
pero **ya no representan el flujo principal recomendado del sistema**.

En particular:

- la persistencia oficial y consumible por la UI se basa en `artifacts/runs/`;
- la comparación entre modelos se apoya en el router `/modelos`;
- y la inferencia operativa se conecta con `/predicciones`, no con salidas
  manuales aisladas de jobs legacy.

Por tanto, la CLI debe entenderse hoy como herramienta auxiliar, no como el
contrato principal del producto.

---

## 16. Flujo recomendado de punta a punta

El flujo recomendado actual es:

1. cargar o procesar un dataset desde **Datos**;
2. generar labeled dataset si aplica;
3. preparar el feature-pack;
4. verificar readiness;
5. lanzar entrenamiento por `/modelos/entrenar` o `/modelos/sweep`;
6. seguir el job con `/modelos/estado/{job_id}`;
7. revisar runs con `/modelos/runs` y `/modelos/runs/{run_id}`;
8. promover o validar el champion;
9. consumir el modelo resultante desde **Predicciones**.

---

## 17. Problemas comunes

### El entrenamiento no arranca
Posibles causas:

- dataset inexistente;
- feature-pack ausente;
- labeled dataset no disponible;
- request incompleto;
- familia o modelo no soportado.

### El job aparece como completado pero no sirve para inferencia
Posibles causas:

- export del modelo incompleto;
- `predictor.json` inválido o ausente;
- champion no promovido;
- run persistido sin bundle de inferencia listo.

### El sweep no elige el modelo esperado
Revisar:

- `primary_metric`
- `primary_metric_mode`
- `best_overall`
- `best_by_model`
- elegibilidad deployable para predicciones

### Hay diferencias entre request y métricas persistidas
El backend hace normalización y backfill de contexto. La fuente final de verdad
para auditoría debe ser el contenido persistido en `metrics.json` y los detalles
expuestos por `/modelos/runs/{run_id}`.

---

## 18. Resumen operativo

En NeuroCampus, el entrenamiento vigente es un proceso:

- orientado a datasets versionados;
- persistido por runs;
- observable por jobs y estados;
- comparable por métricas estructuradas;
- y conectado directamente con champion e inferencia.

Por eso, cualquier documentación o flujo operativo nuevo debe tomar como base
el router `/modelos` y no un pipeline histórico centrado únicamente en una RBM
entrenada por CLI.
