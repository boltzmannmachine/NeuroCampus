# Pestaña «Modelos»

## Objetivo

La pestaña **Modelos** concentra el flujo de entrenamiento, comparación,
selección y diagnóstico de modelos de la familia de Redes de Boltzmann dentro de
NeuroCampus.

Desde esta pestaña el usuario puede:

- seleccionar el **dataset** activo para trabajo de modelado;
- elegir la **familia de problema** a resolver;
- revisar el **modelo campeón** actual;
- entrenar nuevos modelos con diferentes estrategias;
- inspeccionar ejecuciones históricas;
- ejecutar un **sweep** comparativo entre varios modelos;
- revisar el estado del **bundle de artefactos**;
- correr validaciones de consistencia y diagnóstico.

La pestaña no se limita a entrenar un modelo aislado: también administra el
**contexto completo de modelado** que luego se reutiliza en la pestaña
**Predicciones**.

---

## Estructura general de la pestaña

La implementación actual de **Modelos** tiene dos niveles de navegación:

1. un **encabezado de contexto global**;
2. siete **subpestañas** funcionales.

### Subpestañas actuales

1. **Resumen**
2. **Entrenamiento**
3. **Ejecuciones**
4. **Campeón**
5. **Sweep**
6. **Artefactos**
7. **Diagnóstico**

El orden anterior coincide con la navegación real de la UI.

---

## Encabezado de contexto global

Antes de entrar a cualquiera de las subpestañas, la pantalla muestra un bloque
superior persistente que define el contexto del modelado.

### Controles visibles

La cabecera incluye:

- selector de **Dataset**;
- selector de **Familia**;
- campo informativo de **Fuente de Datos**;
- resolvedor de **Modelo activo**;
- chips de contexto con metadatos del problema.

---

## Dataset

El selector **Dataset** determina el conjunto de datos sobre el cual se listan,
entrenan y evalúan los modelos.

### Comportamiento real

La UI intenta cargar primero la lista real desde backend por medio de
`/modelos/datasets`.

Si el backend no responde o aún no expone la información completa, la interfaz
usa un conjunto de valores de respaldo para mantener la experiencia visual.

### Qué puede mostrar cada opción

Dependiendo de la información disponible, el selector puede mostrar detalles
como:

- número de filas;
- número de pares;
- disponibilidad de `train_matrix`;
- disponibilidad de `pair_matrix`.

### Observación importante

La UI usa identificadores internos tipo `ds_2025_1`, pero el backend trabaja con
IDs canónicos como `2025-1`.

La pestaña resuelve esta diferencia de forma automática, por lo que el usuario
no necesita transformar manualmente el identificador.

---

## Familia

El selector **Familia** define qué problema de modelado se está trabajando.

### Familias disponibles en la UI actual

1. **Desempeño por Sentimiento**
   - familia técnica: `sentiment_desempeno`
   - tipo de tarea: **clasificación**
   - nivel de entrada: **row**
   - fuente de datos: **feature_pack**
   - métrica principal: **val_f1_macro**
   - modo de comparación: **max**

2. **Calificación Docente**
   - familia técnica: `score_docente`
   - tipo de tarea: **regresión**
   - nivel de entrada: **pair**
   - fuente de datos: **pair_matrix**
   - métrica principal: **val_rmse**
   - modo de comparación: **min**

### Implicación funcional

Cambiar de familia modifica:

- el tipo de tarea reportado por la UI;
- la métrica principal usada para ranking;
- el tipo de datos esperado;
- la interpretación de runs, champion y sweep.

---

## Fuente de Datos

La cabecera muestra un campo de solo lectura llamado **Fuente de Datos**.

Este valor no se edita manualmente: se deriva automáticamente de la familia
seleccionada.

### Valores típicos

- `feature_pack`
- `pair_matrix`

Esto ayuda a entender desde qué artefacto parte el proceso de entrenamiento.

---

## Modelo activo

La cabecera también incluye un resolvedor de **modelo activo**.

### Fuentes de resolución disponibles

El usuario puede resolver el modelo desde:

- **Champion**
- **Run ID**

### Qué hace

Al resolver el modelo activo, la UI intenta determinar cuál run debe tomarse
como referencia para inferencia o trazabilidad.

### Comportamiento real

- si se elige **Champion**, la UI consulta el campeón actual del dataset y la
  familia seleccionados;
- si se elige **Run ID**, la UI intenta resolver un run específico;
- si el run existe pero el bundle está incompleto, la interfaz puede mostrar una
  advertencia tipo `422: Bundle incompleto para inferencia`.

### Información visible tras resolver

Cuando la resolución es exitosa, la cabecera muestra al menos:

- ID de ejecución resuelto;
- fuente de resolución;
- estado del bundle;
- métrica principal;
- valor de la métrica;
- modelo resuelto.

---

## Chips de contexto

En la cabecera se muestran chips resumen con información derivada de la familia
seleccionada, por ejemplo:

- **Tipo de tarea**
- **Nivel de entrada**
- **Métrica principal**

Estos chips no son interactivos, pero ayudan a interpretar correctamente el
resto de la pestaña.

---

# Subpestaña «Resumen»

## Objetivo

La subpestaña **Resumen** ofrece una vista rápida del estado del modelado para
el dataset y la familia activos.

Su función es responder preguntas como:

- ¿cuál es el champion actual?
- ¿cuál fue el último run entrenado?
- ¿cómo está el bundle?
- ¿cómo se ven las métricas recientes?

## Bloques principales

La UI actual presenta estos componentes:

1. **Champion Actual**
2. **Último Run Entrenado**
3. **Estado del Bundle**
4. **Tendencia reciente de métricas**
5. **Insights rápidos**

### 1. Champion Actual

Muestra el run que actualmente actúa como campeón del contexto seleccionado.

Puede incluir:

- run ID;
- modelo;
- valor de la métrica principal;
- fecha de promoción;
- estado del bundle;
- indicadores de warm start y features de texto.

#### Acciones disponibles

- **Ver Run**
- **Usar en Predictions**

La acción de usar en predicciones puede quedar deshabilitada si el modelo no es
compatible con el contrato de inferencia o si el bundle está incompleto.

### 2. Último Run Entrenado

Resume la ejecución más reciente registrada para el contexto actual.

Permite identificar rápidamente si hubo entrenamientos recientes y si vale la
pena inspeccionarlos con más detalle.

### 3. Estado del Bundle

Presenta un chequeo resumido del bundle de artefactos del champion o del run
más relevante.

### 4. Tendencia reciente de métricas

La UI muestra un gráfico simple de evolución para las ejecuciones recientes,
centrado en la métrica principal de la familia activa.

### 5. Insights rápidos

Incluye observaciones resumidas derivadas del estado del champion, runs recientes
y bundle.

---

# Subpestaña «Entrenamiento»

## Objetivo

La subpestaña **Entrenamiento** permite lanzar una nueva corrida de entrenamiento
para el dataset y la familia activos.

## Flujo general

El flujo actual se apoya en dos pasos:

1. validar o preparar el artefacto de entrada requerido;
2. lanzar el entrenamiento con la estrategia y parámetros seleccionados.

---

## Preparación del feature-pack

En la parte superior se ofrece una acción para preparar el **feature-pack**.

### Qué hace

La UI intenta verificar primero si el feature-pack ya existe.

Si no existe, llama al endpoint de preparación correspondiente y luego vuelve a
validar su disponibilidad.

### Resultado esperado

El estado visual pasa por algo similar a:

- `idle`
- `preparing`
- `ready`

### Importancia

Este paso es especialmente relevante para familias que dependen de
`feature_pack` como fuente de datos.

---

## Formulario de entrenamiento

La tarjeta principal se llama **Entrenar Modelo**.

### Campos visibles

La implementación actual presenta al menos estos campos:

- **Modelo**
- **Épocas**
- **Semilla**
- **Auto-prepare**
- **Warm Start**
- **warm_start_from**
- **warm_start_id_de_ejecución**
- **Overrides JSON**

### Modelos disponibles

El selector de modelo ofrece actualmente tres estrategias:

1. **RBM General** (`rbm_general`)
2. **RBM Restringida** (`rbm_restringida`)
3. **DBM Manual** (`dbm_manual`)

### Épocas y semilla

Permiten controlar:

- cantidad de épocas del entrenamiento;
- semilla explícita del experimento.

### Auto-prepare

Si está activado, el backend puede intentar preparar automáticamente artefactos
faltantes antes del entrenamiento.

### Warm Start

La UI permite activar warm start y elegir su procedencia.

#### Orígenes soportados en la interfaz

- `champion`
- `run_id`
- `none`

Si se elige `run_id`, el formulario exige un identificador de ejecución válido.

### Overrides JSON

La UI incluye una sección expandible para pasar hiperparámetros adicionales en
JSON.

#### Observación importante

El JSON debe ser válido. Si no lo es, la interfaz bloquea el envío y muestra un
mensaje de error.

---

## Ejecución del entrenamiento

Al iniciar el entrenamiento, la UI intenta llamar al backend y recibe un
`job_id`, que luego utiliza para polling del estado.

### Estados visibles

El entrenamiento puede pasar por estados como:

- `idle`
- `queued`
- `running`
- `completed`
- `failed`

### Progreso

La interfaz muestra una barra de progreso.

- si el backend reporta progreso real, se usa ese valor;
- si no lo hace, la UI simula un avance conservador para no dejar la pantalla
  sin retroalimentación.

### Resultado del entrenamiento

Cuando el entrenamiento termina, la tarjeta **Resultado del Entrenamiento**
resume el run generado.

Puede incluir:

- run ID;
- modelo entrenado;
- métrica principal;
- estado;
- bundle;
- información de warm start;
- acciones para abrir el run o usarlo en predicciones.

### Comportamiento de fallback

Si el backend no responde como espera la UI, la pestaña puede construir un
resultado mínimo para no romper la experiencia visual. Esto mantiene la
interfaz navegable, pero no debe interpretarse como sustituto de un run real.

---

# Subpestaña «Ejecuciones»

## Objetivo

La subpestaña **Ejecuciones** permite revisar el histórico de runs del dataset y
la familia seleccionados.

Tiene dos modos de trabajo:

1. **tabla de runs** con filtros;
2. **detalle de run**.

---

## Vista de tabla

La parte superior contiene filtros para acotar las ejecuciones mostradas.

### Filtros visibles

- **Modelo**
- **Estado**
- **Warm Start**
- **Texto**

### Qué permiten filtrar

- tipo de estrategia utilizada;
- estado del run;
- si usó warm start o no;
- si incorpora features de texto o no.

### Tabla de runs

La tabla lista, como mínimo:

- fecha;
- run ID;
- modelo;
- estado;
- métrica principal;
- bundle;
- acciones.

### Acciones típicas

- abrir el detalle del run;
- usar el run en predicciones, cuando aplica.

---

## Vista de detalle de run

Cuando se selecciona un run, la subpestaña cambia a una vista detallada.

### Secciones visibles en el detalle

La UI actual muestra varias secciones, entre ellas:

1. **Identidad y Contrato**
2. **Warm Start**
3. **Métricas**
4. **Loss por Época**
5. **Métrica principal por Época**
6. **Matriz de Confusión** (cuando aplica)
7. **y_true vs y_pred** (cuando aplica)
8. **Features**
9. **Artefactos / Bundle**

### 1. Identidad y Contrato

Resume el contexto estructural del run, por ejemplo:

- run ID;
- dataset;
- familia;
- modelo;
- target;
- fuente de datos;
- tipo de tarea.

### 2. Warm Start

Describe si el entrenamiento fue iniciado desde:

- cero;
- un champion previo;
- un run específico.

También puede mostrar si el warm start se resolvió correctamente o si fue
omitido por incompatibilidad.

### 3. Métricas

Presenta las métricas registradas del run.

La interpretación depende de la familia activa:

- clasificación: se priorizan métricas como `val_f1_macro` y `accuracy`;
- regresión: se priorizan métricas como `val_rmse`, `val_mae` y `val_r2`.

### 4. y 5. Curvas por época

La UI muestra gráficas de evolución por época para:

- pérdida;
- métrica principal.

Esto permite inspeccionar estabilidad, convergencia o sobreajuste.

### 6. Matriz de Confusión

Aparece en tareas de clasificación cuando el backend dispone de ese artefacto.

### 7. y_true vs y_pred

Aparece principalmente en tareas de regresión o escenarios donde la UI puede
representar pares de valor real y valor predicho.

### 8. Features

Muestra información como:

- número total de features;
- número de features de texto;
- columnas textuales utilizadas.

### 9. Artefactos / Bundle

Resume el estado del bundle asociado al run y su checklist de componentes.

---

# Subpestaña «Campeón»

## Objetivo

La subpestaña **Campeón** permite inspeccionar y administrar el **champion** del
contexto actual.

## Qué muestra

La UI presenta:

1. el champion actual;
2. una sección para reemplazarlo;
3. un ranking de runs completados.

---

## Champion actual

Cuando existe un champion, se muestra una tarjeta con información como:

- run ID;
- modelo;
- métrica principal;
- fecha de promoción;
- estado del bundle;
- indicadores de warm start y texto.

### Acciones disponibles

- **Usar Champion en Predictions**
- **Ver Run**
- **Reemplazar Champion**

### Restricciones importantes

La UI protege el contrato con Predicciones.

Por eso, aunque existan múltiples runs entrenados, solo algunos modelos son
considerados compatibles para actuar como champion global reutilizable en
predicción.

Si el champion no es deployable o su bundle está incompleto, la interfaz puede
bloquear el uso directo en Predicciones y mostrar una explicación.

---

## Reemplazar champion

La sección **Seleccionar Nuevo Champion** permite promover otro run.

### Flujo

1. la UI lista runs completados compatibles;
2. el usuario selecciona uno;
3. confirma la promoción;
4. el backend actualiza el champion si el endpoint está disponible.

### Comportamiento real

Si el backend aún no soporta completamente la promoción esperada por la UI,
puede mantenerse feedback visual de prototipo. Por eso la confirmación visual no
siempre equivale a una persistencia efectiva si el entorno backend no está
alineado.

---

## Ranking de runs

Debajo del champion, la pestaña muestra una tabla ordenada por la métrica
principal de la familia activa.

### Qué permite

- comparar runs entre sí;
- identificar el champion actual;
- abrir cualquier run para inspección.

### Regla de ordenamiento

La comparación respeta el `metric_mode` de la familia:

- `max` para clasificación;
- `min` para regresión.

---

# Subpestaña «Sweep»

## Objetivo

La subpestaña **Sweep** ejecuta una comparación automática entre varios modelos
para un mismo dataset y familia.

En la implementación actual, el sweep está pensado para entrenar y contrastar
**tres estrategias**:

- RBM General
- RBM Restringida
- DBM Manual

---

## Formulario de sweep

La tarjeta principal se titula **Sweep — Entrenar 3 Modelos**.

### Campos visibles

- **Epochs**
- **Seed**
- **warm_start_from**
- **Auto-promote**
- **Overrides por modelo (JSON)**

### warm_start_from

En esta vista la UI actual permite seleccionar principalmente:

- `champion`
- `none`

### Auto-promote

Si esta opción está activada, el backend puede promover automáticamente al
mejor candidato como champion al finalizar el sweep.

### Overrides por modelo

La interfaz permite introducir JSON independiente para cada una de las tres
estrategias del sweep.

Si alguno de esos JSON es inválido, el sweep no se lanza.

---

## Ejecución y progreso

Al iniciar el sweep, la UI intenta usar el flujo real de backend.

### Dos modos posibles

1. **sweep con polling**
2. **sweep con respuesta directa**

Si el backend responde con un job asíncrono, la interfaz consulta su estado
hasta completarlo.

### Progreso

Al igual que en entrenamiento, la UI usa:

- progreso real si el backend lo entrega;
- progreso sintético si no lo entrega.

---

## Resultados del sweep

Cuando el proceso termina, la interfaz muestra:

1. **Ganador del Sweep**
2. **Candidatos del Sweep**
3. **Comparador Side-by-Side**

### 1. Ganador del Sweep

Resume el mejor run según la métrica principal de la familia.

Incluye:

- run ID;
- modelo ganador;
- valor de la métrica;
- razón del resultado.

#### Regla de selección

La UI documenta explícitamente que la elección sigue:

- métrica principal de la familia;
- modo `max` o `min` según corresponda;
- tie-breaker por `model_name` y luego `run_id` en caso de empate.

#### Acciones disponibles

- **Abrir Ganador**
- **Promover Champion**
- **Comparar Runs**

### 2. Candidatos del Sweep

La tabla de candidatos muestra para cada run:

- modelo;
- run ID;
- métrica principal;
- estado de warm start;
- uso de texto;
- estado del bundle;
- si fue el ganador.

### 3. Comparador Side-by-Side

Permite ver los tres candidatos en paralelo, comparando:

- métrica principal;
- métricas secundarias;
- número de features;
- features de texto;
- warm start;
- estado del bundle.

---

# Subpestaña «Artefactos»

## Objetivo

La subpestaña **Artefactos** permite resolver un run y examinar su **bundle** de
archivos asociados.

Su función es verificar si el run tiene los componentes necesarios para
predicción, trazabilidad o auditoría técnica.

## Resolución del bundle

La UI ofrece un bloque llamado **Seleccionar Bundle**.

### Fuentes disponibles

- **Champion**
- **Run ID**

### Flujo

1. el usuario elige la fuente;
2. si corresponde, ingresa un run ID;
3. pulsa **Resolver**.

### Manejo de errores

La interfaz puede mostrar errores cuando:

- el run no existe;
- el champion no existe para el contexto;
- el bundle está incompleto.

---

## Información mostrada

Una vez resuelto el bundle, la UI presenta dos grupos principales:

1. **Artefactos del Bundle**
2. **Visor JSON**

### 1. Artefactos del Bundle

Resume el checklist de archivos esperados, por ejemplo:

- `predictor.json`
- `metrics.json`
- `job_meta.json`
- `preprocess.json`
- `model/`

### 2. Visor JSON

La interfaz permite alternar entre pestañas para inspeccionar el contenido JSON
real cuando el backend lo provee.

Las pestañas visibles actuales son:

- `predictor.json`
- `metrics.json`
- `job_meta.json`
- `preprocess.json`

### Comportamiento real

La prioridad de la UI es:

1. mostrar artefactos reales devueltos por backend;
2. si no están disponibles, usar contenido de respaldo del prototipo.

Por ello, esta subpestaña es muy útil para validar contratos, pero también debe
interpretarse teniendo en cuenta si está trabajando contra datos reales o contra
fallback visual.

---

# Subpestaña «Diagnóstico»

## Objetivo

La subpestaña **Diagnóstico** sintetiza chequeos de salud y consistencia del
contexto de modelado actual.

No entrena ni promueve modelos: su función es **validar el estado** del sistema
para el dataset y la familia seleccionados.

## Componentes principales

La UI muestra:

1. tarjetas de salud general;
2. lista de **Contract Checks**;
3. panel de advertencias;
4. especificación de errores de referencia.

---

## Tarjetas de salud

En la parte superior se presentan cuatro tarjetas:

- **Health**
- **Pass**
- **Warn**
- **Fail**

### Posibles estados globales

La salud general se resume como:

- `Healthy`
- `Degraded`
- `Unhealthy`

según la cantidad de checks en warning o fallo.

---

## Contract Checks

La tarjeta principal se llama **Contract Checks**.

### Fuente de datos

La UI indica explícitamente si el diagnóstico se construyó desde:

- **Backend real**
- **Fallback prototipo**

### Acciones disponibles

- **Revalidar**
- **Copiar Reporte**

### Qué incluye el reporte

El diagnóstico resume:

- familia;
- dataset;
- fecha;
- fuente de datos;
- lista de checks;
- lista de warnings;
- resumen total de pass, warn y fail.

### Utilidad

Esta subpestaña es especialmente valiosa para verificar si el contexto actual
está listo para ser usado en predicciones o para comparar si la UI está leyendo
backend real o datos de fallback.

---

## Advertencias

La sección **Advertencias** agrupa mensajes contextuales derivados del snapshot
de diagnóstico.

Sirve para llamar la atención sobre problemas que no necesariamente bloquean el
flujo, pero sí pueden afectar consistencia, deployabilidad o interpretación de
resultados.

---

## Especificación de errores

La UI incluye una sección de referencia llamada **Especificación de Errores**.

Su propósito es servir como guía rápida para interpretar los fallos o warnings
reportados por la pestaña.

---

# Comportamiento transversal de la pestaña

## Integración backend-first con fallback visual

La arquitectura actual de **Modelos** intenta usar primero el backend real para:

- datasets;
- champion;
- listado de runs;
- detalle de runs;
- readiness;
- feature-pack;
- entrenamiento;
- sweep;
- promoción de champion;
- bundle;
- diagnóstico.

Si alguno de esos contratos aún no está disponible o falla, la UI conserva la
experiencia visual por medio de datos mock o resultados construidos localmente.

### Implicación importante para el usuario

Esto significa que la pestaña es **usable** incluso cuando algunos contratos aún
están en evolución, pero también implica que no todo lo que aparece en pantalla
representa siempre persistencia efectiva en backend.

Cuando se requiera validación operativa real, conviene verificar:

- que el endpoint backend haya respondido;
- que el run exista realmente;
- que el bundle esté completo;
- que el champion haya sido promovido en backend y no solo en la UI.

---

## Navegación hacia Predicciones

Varias subpestañas ofrecen acciones del tipo:

- **Usar en Predictions**
- **Usar Champion en Predictions**

### Qué hacen

Estas acciones transfieren al contexto global:

- dataset activo;
- familia seleccionada;
- run solicitado para trazabilidad.

Luego la UI navega a la pestaña o ruta de **Predicciones**.

### Importante

La inferencia no necesariamente se ejecuta directamente con cualquier run:

en la arquitectura actual, **Predicciones** sigue resolviendo inferencia con el
modelo champion compatible del dataset y la familia soportados por backend.

El run seleccionado desde Modelos funciona sobre todo como contexto de UI y
trazabilidad.

---

# Flujo de trabajo recomendado

En la versión actual de NeuroCampus, un flujo recomendado dentro de **Modelos**
es:

1. seleccionar el **dataset** correcto;
2. elegir la **familia** adecuada;
3. revisar el **Resumen** para entender el estado actual;
4. preparar el **feature-pack** si es necesario;
5. lanzar un nuevo **Entrenamiento**;
6. inspeccionar el resultado en **Ejecuciones**;
7. comparar alternativas con **Sweep** si se desea;
8. promover o validar el **Campeón**;
9. verificar el bundle en **Artefactos**;
10. cerrar con revisión en **Diagnóstico**;
11. pasar a **Predicciones** cuando el contexto esté listo.

---

# Alcance real de la pestaña en la versión actual

La pestaña **Modelos** sí está diseñada para:

- orquestar el contexto de modelado;
- entrenar modelos;
- comparar estrategias;
- revisar ejecuciones;
- administrar el champion;
- verificar artefactos;
- validar consistencia operativa.

La pestaña **Modelos** no está diseñada para:

- cargar archivos de dataset directamente;
- consolidar históricos institucionales;
- mostrar la analítica agregada del dashboard;
- ejecutar el flujo final de predicciones como acción principal.

---

# Relación con otras pestañas

La pestaña **Modelos** depende de artefactos construidos en **Datos** y prepara
el contexto que después se consume en **Predicciones**.

En términos funcionales:

- **Datos** alimenta a **Modelos** con datasets y feature-packs;
- **Modelos** define qué runs, champions y bundles están listos;
- **Predicciones** reutiliza ese contexto para inferencia;
- **Dashboard** consume indirectamente parte de los resultados agregados del
  sistema, pero no sustituye la gestión detallada de modelos.

Por ello, **Modelos** es la pestaña central del ciclo de experimentación y
selección técnica dentro de NeuroCampus.
