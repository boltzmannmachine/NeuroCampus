# Pipeline de modelos

## Objetivo

El pipeline de modelos de NeuroCampus describe el flujo completo que conecta la
preparación de datos, el entrenamiento de modelos, la selección del campeón,
la administración de artefactos y la reutilización del resultado en las pestañas
**Predicciones** y **Dashboard**.

En la versión actual del sistema, este pipeline no es un proceso único y lineal
oculto al usuario. Está expuesto de forma operativa en dos lugares:

- la pestaña **Datos**, donde se preparan los insumos;
- la pestaña **Modelos**, donde se entrenan, comparan, seleccionan y revisan
  los modelos.

Por ello, el pipeline de modelos debe entenderse como una cadena de etapas
coordinadas entre frontend, backend y artefactos persistidos en disco.

---

## Vista general

La secuencia funcional vigente es la siguiente:

1. **Carga y validación del dataset**.
2. **Construcción de artefactos base**.
3. **Preparación del feature-pack**.
4. **Entrenamiento de runs individuales**.
5. **Barrido o sweep de múltiples candidatos**.
6. **Selección y promoción del champion**.
7. **Consulta de runs, bundle y diagnóstico**.
8. **Reutilización del champion en predicción y monitoreo**.

Cada una de estas etapas tiene soporte explícito en el frontend y en el router
`/modelos` del backend.

---

## 1. Entrada al pipeline: datos listos para modelado

El pipeline comienza realmente cuando existe un dataset operativo para el
periodo activo.

Ese dataset se prepara desde la pestaña **Datos**, donde el usuario puede:

- cargar el archivo fuente;
- validarlo;
- persistirlo;
- ejecutar BETO si aplica;
- unificar históricos;
- construir artefactos previos.

### Insumos que el pipeline espera encontrar

Según la ruta seguida por el usuario, el backend puede resolver como entrada:

- `data/processed/<dataset_id>.parquet`
- `data/labeled/<dataset_id>_beto.parquet`
- `datasets/<dataset_id>.parquet`

### Observación importante

En la implementación actual, el pipeline favorece artefactos ya preparados y no
trabaja como un entrenamiento “desde cualquier archivo arbitrario” dentro de la
pestaña Modelos.

Por eso, el dataset activo debe entenderse como un **dataset identificado por
periodo** y ya registrado en la estructura del proyecto.

---

## 2. Contexto de trabajo del pipeline

La pestaña **Modelos** arranca con un encabezado de contexto compartido entre
Modelos y Predicciones.

### Variables de contexto principales

- **datasetId**
- **family**

### Familias visibles en la implementación actual

El frontend opera con al menos estas familias:

- `sentiment_desempeno`
- `score_docente`

### Función del contexto

Ese contexto determina:

- qué runs se listan;
- qué champion se resuelve;
- qué sweep se lanza;
- qué bundle se consulta;
- qué diagnóstico se arma;
- qué información puede reaprovechar luego la pestaña Predicciones.

En otras palabras, el pipeline no es global y abstracto: siempre corre dentro de
la combinación **dataset + familia**.

---

## 3. Preparación del feature-pack

Antes de entrenar, el backend puede necesitar construir el **feature-pack** del
contexto activo.

### Endpoint principal

- `POST /modelos/feature-pack/prepare`

### Qué hace

Construye o reconstruye el conjunto de artefactos derivados necesarios para
entrenamiento, especialmente la matriz de entrada del modelo.

### Salida esperada

La salida principal queda en una ruta de este tipo:

```text
artifacts/features/<dataset_id>/train_matrix.parquet
```

### Cómo se usa en la UI

En la subpestaña **Entrenamiento**, el usuario puede preparar el feature-pack
antes de lanzar un run.

Además, el backend soporta la lógica `auto_prepare`, por lo que el entrenamiento
puede intentar preparar automáticamente los artefactos faltantes cuando el flujo
lo permite.

### Rol dentro del pipeline

Esta etapa separa con claridad dos niveles:

- el dataset operativo preparado en **Datos**;
- el insumo estructurado de modelado preparado en **Modelos**.

---

## 4. Entrenamiento de runs individuales

La etapa central del pipeline es el entrenamiento de un run individual.

### Punto de entrada en frontend

- subpestaña **Entrenamiento** de `ModelsTab`

### Endpoint principal

- `POST /modelos/entrenar`

### Qué recibe el backend

El entrenamiento se lanza con un request que incluye, entre otros campos:

- `modelo`
- `dataset_id`
- `family`
- `epochs`
- `seed`
- `hparams`
- `metodologia`
- `warm_start_from`
- `warm_start_run_id`
- `auto_prepare`
- `split_mode`
- `val_ratio`

### Modelos visibles en la implementación actual

La UI trabaja explícitamente con estas estrategias:

- `rbm_general`
- `rbm_restringida`
- `dbm_manual`

### Comportamiento del entrenamiento

Cuando se lanza un entrenamiento:

1. el frontend construye el request usando el dataset y familia activos;
2. el backend crea un `job_id`;
3. el entrenamiento se ejecuta en background;
4. la UI consulta el estado del job;
5. al finalizar, se produce un `run_id` y se registran métricas y artefactos.

### Consulta de estado

- `GET /modelos/estado/{job_id}`

### Resultado funcional

El resultado no es solo un modelo entrenado “en memoria”, sino un **run
persistido y trazable** que después puede:

- verse en la subpestaña **Ejecuciones**;
- promoverse a champion;
- reutilizarse en Predicciones;
- inspeccionarse desde Artefactos y Diagnóstico.

---

## 5. Warm start y reutilización de estado previo

El pipeline actual soporta continuidad de entrenamiento mediante **warm start**.

### Modos de warm start visibles

- `none`
- `champion`
- `run_id`

### Interpretación

- **none**: entrenamiento desde cero;
- **champion**: reutiliza el champion activo del contexto;
- **run_id**: reutiliza un run específico.

### Rol en el pipeline

Esto permite que el entrenamiento no siempre parta de una inicialización nueva,
lo que vuelve al pipeline más incremental y más cercano al trabajo real de
iteración sobre modelos.

---

## 6. Sweep de candidatos

Además del entrenamiento unitario, la aplicación implementa una etapa de
**sweep** para comparar varios candidatos de forma coordinada.

### Punto de entrada en frontend

- subpestaña **Sweep**

### Endpoints asociados

- `POST /modelos/sweep`
- `POST /modelos/entrenar/sweep`
- `GET /modelos/sweeps/{sweep_id}`

### Qué hace el sweep

El sweep ejecuta múltiples entrenamientos comparables bajo el mismo contexto de:

- dataset;
- familia;
- métrica primaria;
- reglas de evaluación.

### En la implementación actual

La UI comunica esta etapa como un proceso para **entrenar tres modelos** y
comparar candidatos.

### Resultado del sweep

El sistema genera:

- un `sweep_id`;
- un resumen consolidado;
- una lista de candidatos;
- un ganador global;
- posibles ganadores por tipo de modelo.

### Rol dentro del pipeline

El sweep formaliza la parte comparativa del pipeline: no solo entrena modelos,
sino que ayuda a elegir cuál vale la pena convertir en champion.

---

## 7. Registro y consulta de runs

Una vez que existen entrenamientos ejecutados, el pipeline entra en una fase de
**gestión de runs**.

### Endpoints principales

- `GET /modelos/runs`
- `GET /modelos/runs/{run_id}`

### Qué representa un run

Un run es la unidad persistida de trabajo del pipeline. Un run conserva, como
mínimo:

- modelo entrenado;
- dataset asociado;
- familia;
- hiperparámetros;
- métricas;
- estado;
- referencias a artefactos.

### Uso en la UI

La subpestaña **Ejecuciones** permite:

- listar runs del contexto actual;
- filtrar o inspeccionar runs;
- revisar métricas resumidas;
- abrir el detalle de un run;
- saltar hacia Predicciones usando el run como trazabilidad de UI.

### Importante

La pestaña Predicciones sigue resolviendo la inferencia desde el champion activo
soportado por backend. El run seleccionado se usa sobre todo como contexto y
trazabilidad, no como bypass del contrato principal de inferencia.

---

## 8. Selección y promoción del champion

El pipeline actual separa claramente el concepto de run entrenado del concepto
**champion**.

### Endpoint para consultar el champion

- `GET /modelos/champion`

### Endpoint para promover un run

- `POST /modelos/promote`

### Qué significa champion

El champion es el modelo activo que el sistema considera referencia principal
para una combinación de dataset y familia.

### Cómo encaja en el pipeline

1. se entrenan uno o varios runs;
2. se revisan métricas y resultados;
3. uno de esos runs se promueve a champion;
4. el champion pasa a ser la base operativa para predicción y parte del
   monitoreo posterior.

### Subpestaña asociada

- **Campeón**

Esta subpestaña permite resolver el champion actual y compararlo con otros runs
candidatos.

---

## 9. Bundle y artefactos del pipeline

La etapa siguiente del pipeline es la inspección de los artefactos producidos
por los entrenamientos.

### Subpestaña asociada

- **Artefactos**

### Qué se consulta aquí

La aplicación usa el detalle del run para recuperar:

- configuración persistida;
- métricas serializadas;
- paths relevantes;
- `bundle_artifacts` si están disponibles.

### Qué papel cumplen estos artefactos

Los artefactos permiten:

- trazabilidad técnica;
- reproducibilidad;
- auditoría de resultados;
- soporte a predicción posterior;
- inspección operativa sin tener que reentrenar.

Dentro del pipeline, esta es la capa que conecta el entrenamiento con la
persistencia reutilizable.

---

## 10. Diagnóstico del estado del pipeline

La implementación actual incluye una subpestaña específica para salud y contrato
operativo del flujo de modelos.

### Subpestaña asociada

- **Diagnóstico**

### Estrategia de construcción

La UI intenta primero obtener datos reales desde backend mediante:

- runs del contexto;
- champion del contexto.

Si la API no está lista para una parte del flujo, la interfaz mantiene un
fallback visual basado en prototipos o mocks.

### Qué valida el diagnóstico

El diagnóstico arma un snapshot de checks sobre:

- presencia de runs;
- existencia de champion;
- consistencia del contexto;
- disponibilidad de artefactos esperados;
- estado general de salud del flujo.

### Resultado visible

La UI resume el estado como:

- `Healthy`
- `Degraded`
- `Unhealthy`

Esto convierte al pipeline de modelos en un flujo observable y no solamente en
una secuencia de endpoints.

---

## 11. Integración con Predicciones

El pipeline de modelos desemboca directamente en la pestaña **Predicciones**.

### Cómo ocurre esa integración

Desde varias subpestañas de Modelos, la UI puede navegar hacia Predicciones
conservando contexto como:

- `activeDatasetId`
- `selectedModelFamily`
- `requestedPredictionRunId`
- `predictionSource`

### Limitación intencional

Aunque el frontend preserve el `run_id` como traza de navegación, la resolución
real de inferencia sigue dependiendo del champion activo y de los contratos del
backend.

### Interpretación correcta

Por tanto, el pipeline no debe leerse como “entrenar un run y predecir con ese
run directamente sin más”, sino como:

- entrenar;
- comparar;
- seleccionar champion;
- usar el contexto vigente de inferencia.

---

## 12. Integración con Dashboard

El Dashboard no entrena modelos ni consulta runs individuales, pero sí depende
indirectamente del pipeline de modelos.

### Relación principal

- el champion influye en métricas de rendimiento mostradas en dashboard;
- las predicciones persistidas se agregan después en indicadores globales;
- el pipeline completo contribuye al estado analítico final del sistema.

### Interpretación

Dentro de la arquitectura general, el pipeline de modelos es la capa intermedia
que transforma datos preparados en resultados predictivos reutilizables.

---

## 13. Lectura correcta del pipeline en la versión actual

En la implementación vigente, el pipeline de modelos debe entenderse como una
cadena de trabajo con estas propiedades:

- **contextual**: depende de dataset y familia;
- **persistente**: genera runs, champion y artefactos en disco;
- **asíncrona**: usa jobs y polling de estado;
- **trazable**: cada resultado relevante queda asociado a IDs y rutas;
- **observable**: puede revisarse desde resumen, ejecuciones, campeón,
  artefactos y diagnóstico;
- **integrada**: alimenta directamente Predicciones y, de forma indirecta,
  Dashboard.

No es simplemente un script de entrenamiento aislado, sino una pieza central de
la operación de NeuroCampus.

---

## Resumen

El pipeline vigente de modelos en NeuroCampus sigue esta lógica práctica:

1. **Datos** deja listo el dataset operativo.
2. **Modelos** prepara el feature-pack.
3. Se entrenan runs individuales o por sweep.
4. Los runs se comparan y se promueve un champion.
5. Los artefactos quedan disponibles para consulta y auditoría.
6. El champion y el contexto activo alimentan la inferencia.
7. Los resultados terminan impactando Predicciones y Dashboard.

Esta es la forma más fiel de describir el sistema actual desde su
implementación real.
