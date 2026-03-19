# Pestaña «Predicciones»

## Objetivo

La pestaña **Predicciones** permite ejecutar inferencia sobre el desempeño
esperado de pares **docente–asignatura** a partir de un dataset previamente
preparado y de un **modelo campeón** disponible para ese dataset.

Esta pestaña opera sobre la familia de modelos **`score_docente`**, es decir,
modelos de regresión cuyo resultado principal es un puntaje estimado en escala
**0–50**.

Desde esta pestaña el usuario puede trabajar en dos modos:

1. **Predicción individual**
   - para estimar el resultado de un par docente–asignatura específico.
2. **Predicción por lote**
   - para generar predicciones masivas sobre todos los pares disponibles en el
     dataset activo.

Además, la pestaña permite:

- consultar datasets disponibles para inferencia;
- reutilizar el dataset activo compartido con otras pestañas;
- abrir historial de ejecuciones batch previas;
- descargar artefactos de predicciones persistidas.

---

## Dependencias funcionales

La pestaña **Predicciones** no parte de cero. Para operar correctamente
necesita que, previamente, exista un flujo de datos y modelado completado.

### Requisitos funcionales

Para que esta pestaña funcione como se espera, debe existir:

- un **dataset** previamente cargado desde la pestaña **Datos**;
- un **feature-pack** o artefacto de características ya preparado para ese
  dataset;
- un **modelo campeón** disponible para la familia `score_docente`.

### Consecuencia práctica

Si el dataset existe pero **no** tiene campeón disponible, la pestaña puede:

- listar el dataset;
- mostrarlo en los selectores;
- pero no necesariamente completar la inferencia con éxito.

Por eso, esta pestaña debe entenderse como la fase de **consumo de modelos y
artefactos**, no como la fase donde se entrenan o seleccionan modelos.

---

## Contexto compartido con otras pestañas

La implementación actual sincroniza parte del contexto global con el resto de la
aplicación.

### Dataset activo compartido

Cuando existe un dataset activo en el estado global del frontend:

- la pestaña **Predicciones** intenta reutilizarlo automáticamente;
- si ese dataset no existe en el listado disponible, toma como referencia el
  dataset más reciente con artefactos compatibles.

### Contexto recibido desde «Modelos»

La UI actual puede mostrar un bloque informativo llamado:

- **Contexto recibido desde Modelos**

Este bloque sirve para trazabilidad visual y puede mostrar:

- dataset activo;
- familia de modelo seleccionada;
- run seleccionado;
- origen del contexto.

### Limitación importante

Aunque la pestaña **Modelos** puede manejar diferentes familias o contextos,
la pestaña **Predicciones** opera actualmente sobre el champion de la familia:

- **`score_docente`**

Si desde **Modelos** llega otra familia distinta, la interfaz lo advierte, pero
mantiene el dataset como referencia compartida y conserva el run recibido solo
como contexto visual.

---

## Estructura general de la pestaña

La interfaz se divide en dos modos mediante tabs:

1. **Predicción individual**
2. **Predicción por lote**

Antes de esos tabs se muestra:

- encabezado de la pestaña;
- descripción breve del propósito;
- bloque opcional de contexto recibido desde **Modelos**.

---

## Encabezado principal

La parte superior de la pestaña muestra:

- el título **Predicciones**;
- el subtítulo **Sistema de predicción del desempeño docente**.

Este encabezado identifica claramente que la pestaña está orientada a
**inferencia**, no a carga de datos ni entrenamiento.

---

## Modo 1: Predicción individual

Este modo permite estimar el resultado de un par específico:

- un **docente**;
- una **asignatura**;
- dentro de un **dataset** determinado.

La vista está organizada en dos columnas principales:

- **columna izquierda**: selección y contexto;
- **columna derecha**: resultados y visualizaciones.

---

## 1.1 Selección del conjunto de datos

En el panel izquierdo aparece el selector:

- **Conjunto de datos**

### Qué muestra cada opción

Cada dataset se presenta con información resumida como:

- `dataset_id`
- número de pares disponibles
- indicador visual de disponibilidad de campeón

La forma visual típica es:

- `dataset_id — N pares ✓`
- `dataset_id — N pares ⚠`

### Interpretación

- **✓** indica que el dataset reporta campeón disponible.
- **⚠** indica que el dataset existe, pero no necesariamente tiene el campeón
  listo para inferencia.

### Origen de los datasets listados

La pestaña consulta datasets desde el backend asociados a artefactos de tipo
**pair matrix** y contexto de predicción.

Por ello, no todos los datasets cargados históricamente tienen que aparecer aquí:
solo aparecen aquellos que tienen el nivel de preparación requerido para la
pestaña **Predicciones**.

---

## 1.2 Selección de docente

Debajo del dataset aparece el bloque **Docente**.

### Elementos visibles

La UI ofrece:

- una caja de búsqueda;
- un selector desplegable con los docentes disponibles.

### Búsqueda

La búsqueda permite filtrar por:

- nombre del docente;
- código o clave del docente.

### Resultado del selector

Cada elemento puede mostrarse como:

- `Nombre (teacher_key)`
- o solo el identificador si no hay nombre legible disponible.

---

## 1.3 Selección de asignatura

Después del docente aparece el bloque **Asignatura**.

### Elementos visibles

La UI ofrece:

- una caja de búsqueda;
- un selector desplegable con las asignaturas disponibles.

### Búsqueda

La búsqueda permite filtrar por:

- nombre de la asignatura;
- código o clave de la asignatura.

### Resultado del selector

Cada elemento puede mostrarse como:

- `Nombre (materia_key)`
- o solo el identificador si no hay nombre legible disponible.

---

## 1.4 Panel «Información seleccionada»

Debajo de los selectores, la interfaz muestra una tarjeta de resumen con:

- dataset seleccionado;
- docente seleccionado;
- número de encuestas del docente;
- asignatura seleccionada;
- número de encuestas de la asignatura;
- puntaje histórico del par.

### Puntaje histórico del par

Este valor se muestra como:

- **Puntaje histórico (par)**

En la implementación actual, este dato solo se actualiza una vez que existe un
resultado de predicción cargado en pantalla.

---

## 1.5 Botón «Generar Predicción»

El botón principal del modo individual es:

- **Generar Predicción**

### Condiciones para habilitarse

El botón queda deshabilitado si falta seleccionar:

- docente;
- asignatura.

### Estado durante ejecución

Mientras la solicitud está en curso, el texto cambia a:

- **Generando…**

### Qué hace internamente

La interfaz envía al backend:

- `dataset_id`
- `teacher_key`
- `materia_key`

usando el endpoint de predicción individual de la pestaña **Predicciones**.

---

## 1.6 Resultado de predicción individual

Cuando la inferencia responde correctamente, la columna derecha muestra una
sección de resultados.

### Tarjeta principal de resultado

La primera tarjeta muestra:

- **Puntaje estimado (0–50)**
- **Confianza**
- **Nivel de riesgo**

### Puntaje estimado

Se presenta como un valor numérico principal en escala de **0 a 50**.

### Confianza

Se presenta como porcentaje derivado de la respuesta del backend.

### Nivel de riesgo

Se representa con una etiqueta visual, que puede ser:

- **Riesgo bajo**
- **Riesgo medio**
- **Riesgo alto**

### Convención visual

La interfaz usa el siguiente criterio de color:

- verde para riesgo bajo;
- amarillo para riesgo medio;
- rojo para riesgo alto.

### Barra de progreso

La tarjeta también incluye una barra horizontal que representa el puntaje como
porcentaje del máximo posible.

La escala visual marcada en la UI es:

- 0
- 25
- 50

### Mensaje interpretativo

Según el nivel de riesgo, la interfaz acompaña el resultado con una conclusión
textual de apoyo, orientada a lectura rápida.

---

## 1.7 Perfil de indicadores (Radar)

Después de la tarjeta principal, la interfaz muestra un gráfico:

- **Perfil de Indicadores (Radar)**

### Series mostradas

El radar compara dos perfiles:

- **Promedio Actual**
- **Predicción**

### Escala visual

La escala del radar está normalizada visualmente a rango:

- **0 a 5**

La implementación actual incorpora una normalización defensiva en frontend para
mantener el gráfico legible incluso si el backend responde en una escala más
alta de la esperada.

### Utilidad

Este gráfico permite ver, por dimensión o indicador:

- cómo se comporta el par actualmente;
- cómo se proyecta su comportamiento según la predicción.

---

## 1.8 Análisis comparativo por dimensión

La siguiente visualización es un gráfico de barras llamado:

- **Análisis Comparativo por Dimensión**

### Series comparadas

La comparación actual se hace entre:

- **Docente Seleccionado**
- **Promedio Cohorte**

### Escala visual

La gráfica usa una escala visual entre:

- **0 y 5**

### Utilidad

Permite responder preguntas como:

- ¿en qué dimensiones está por encima o por debajo de la cohorte?
- ¿qué tan distinta es la proyección del docente frente al promedio comparativo?

---

## 1.9 Proyección temporal

La última visualización del modo individual es:

- **Proyección Temporal**

### Series mostradas

El gráfico de líneas compara:

- **Rendimiento Real**
- **Predicción**

### Escala visual

La UI usa una escala vertical de:

- **0 a 50**

### Propósito

Esta visualización muestra el comportamiento histórico y la proyección para el
par o contexto analizado, permitiendo ver continuidad o desviación temporal.

---

## 1.10 Estado sin resultado

Si todavía no se ha ejecutado una predicción individual, la columna derecha
muestra una tarjeta de estado con el mensaje equivalente a:

- seleccionar docente y asignatura;
- luego hacer clic en **Generar Predicción**.

Esto actúa como placeholder funcional de la pantalla.

---

## 1.11 Manejo de errores

Si la predicción individual falla, la UI muestra un bloque de error visible en
pantalla.

Las causas pueden incluir:

- falta de campeón disponible;
- artefactos incompletos;
- parámetros inválidos;
- error interno de inferencia.

En estos casos, la pestaña no borra necesariamente el contexto seleccionado,
por lo que el usuario puede ajustar el dataset o reintentar la operación.

---

## Modo 2: Predicción por lote

Este modo permite ejecutar inferencia masiva para todos los pares
**docente–asignatura** disponibles dentro del dataset seleccionado.

Se trata de un flujo asíncrono con:

- lanzamiento de job;
- consulta de estado;
- carga de vista previa;
- posibilidad de descarga del artefacto final.

---

## 2.1 Selección del conjunto de datos

Al igual que en la predicción individual, el modo batch comienza con la
selección de un:

- **Conjunto de datos**

### Información adicional visible

En esta sección también se muestra:

- **Modelo campeón (automático)**

Ese valor se rellena cuando el backend devuelve el `champion_run_id` del job o
cuando se abre una ejecución previa.

### Implicación funcional

El usuario no selecciona manualmente el modelo en esta pestaña.

La lógica actual es:

- tomar el **champion** disponible para el dataset activo;
- usarlo como base de inferencia batch.

---

## 2.2 Botón «Generar predicciones del lote»

La acción principal del modo batch es:

- **Generar predicciones del lote**

### Qué hace

Lanza una solicitud al backend para iniciar un job de predicción por lote sobre
el dataset seleccionado.

### Estado posterior al lanzamiento

Si el backend responde correctamente, la UI:

- guarda el `job_id`;
- comienza un polling periódico del estado;
- muestra progreso mientras el job está en ejecución.

---

## 2.3 Progreso del job

Mientras el lote está corriendo, la interfaz muestra:

- el mensaje **Procesando lote…**;
- una barra de progreso;
- el porcentaje estimado de avance.

### Naturaleza del proceso

Este comportamiento confirma que la predicción batch se trata como un
**proceso asíncrono**, no como una respuesta inmediata.

---

## 2.4 Historial de ejecuciones

Dentro del modo batch existe una tarjeta llamada:

- **Historial de ejecuciones**

### Qué muestra

La tabla presenta, para el dataset activo, información como:

- fecha;
- número de pares procesados;
- modelo asociado;
- acciones disponibles.

### Acciones por ejecución

Cada fila puede ofrecer:

- **Ver vista previa**
- **Descargar**

### Ver vista previa

Abre el parquet histórico asociado al run y carga su contenido en la sección de
resultados del batch actual.

### Descargar

Permite descargar directamente el archivo de predicciones persistido asociado a
ese run.

### Utilidad

Este bloque es importante porque convierte la pestaña en una interfaz no solo de
**ejecución**, sino también de **consulta histórica de predicciones batch**.

---

## 2.5 Resumen de resultados batch

Cuando el batch termina correctamente —o cuando se abre una ejecución previa—
la UI muestra un conjunto de tarjetas KPI.

### Indicadores visibles

La implementación actual presenta:

- **Pares procesados**
- **Riesgo bajo**
- **Riesgo medio**
- **Riesgo alto**

### Qué representan

- **Pares procesados**: total de filas o pares inferidos.
- **Riesgo bajo**: cantidad y porcentaje de pares clasificados como bajo riesgo.
- **Riesgo medio**: cantidad y porcentaje de pares clasificados como riesgo medio.
- **Riesgo alto**: cantidad y porcentaje de pares clasificados como alto riesgo.

---

## 2.6 Distribución de riesgo por materia

Después del resumen se muestra un gráfico de barras apiladas llamado:

- **Distribución de riesgo por materia**

### Qué representa

Para cada materia visible en la gráfica, se contabilizan tres segmentos:

- **Bajo Riesgo**
- **Medio Riesgo**
- **Alto Riesgo**

### Alcance visible en la UI actual

La implementación actual toma una muestra limitada de materias para mantener la
legibilidad del gráfico.

### Utilidad

Este gráfico permite detectar rápidamente:

- materias con más concentración de riesgo;
- diferencias de distribución entre asignaturas;
- focos de atención dentro del lote procesado.

---

## 2.7 Mapa de calor

La siguiente visualización es una tabla tipo heatmap titulada:

- **Mapa de calor: puntaje (% del máximo)**

### Estructura

- filas: docentes;
- columnas: materias;
- celdas: porcentaje del puntaje predicho respecto al máximo.

### Convención visual actual

La intensidad y color de cada celda depende del porcentaje calculado:

- verde intenso para valores altos;
- verde/amarillo intermedio para valores medios;
- rojo para valores más bajos;
- gris cuando no hay dato visible.

### Alcance visible

La UI actual no muestra toda la matriz completa en el heatmap: utiliza una
muestra acotada de materias para conservar legibilidad.

---

## 2.8 Tabla de predicciones

La última sección del modo batch es la:

- **Tabla de predicciones**

### Columnas visibles

La tabla muestra actualmente:

- **Docente**
- **Materia**
- **Puntaje (0–50)**
- **Confianza**
- **Nivel de Riesgo**

### Filtros rápidos por riesgo

Encima de la tabla aparecen badges para filtrar por:

- **Todos**
- **Bajo**
- **Medio**
- **Alto**

### Descarga del artefacto

Cuando existe una ruta de predicciones persistida, la UI muestra el botón:

- **Descargar predicciones**

Este botón descarga el artefacto generado por el backend.

### Vista previa paginada

La implementación actual carga una vista previa limitada del archivo de salida.

Si hay más filas disponibles, aparece el botón:

- **Cargar más**

Esto confirma que la tabla no intenta renderizar de una sola vez el universo
completo del parquet, sino una vista previa incremental.

---

## Artefactos de salida

El flujo batch persiste un archivo de predicciones que luego puede:

- abrirse como vista previa;
- descargarse desde la UI;
- reutilizarse desde el historial.

En la implementación actual, la interfaz opera sobre una `predictions_uri`
resuelta por backend, en lugar de asumir manualmente una ruta fija.

---

## Estados de error en batch

Si el job batch falla, la interfaz muestra un bloque de error con el detalle
recibido del backend o un mensaje genérico.

Las causas pueden incluir:

- champion no disponible;
- artefactos faltantes;
- error de lectura del feature-pack;
- fallo interno durante la inferencia;
- error al abrir vista previa histórica.

---

## Comportamiento de sincronización por dataset

Cada vez que cambia el dataset seleccionado, la pestaña reinicia estados
internos dependientes de ese dataset.

### Elementos que se reinician

Al cambiar de dataset, la UI limpia o reinicia:

- docente seleccionado;
- asignatura seleccionada;
- búsquedas activas;
- resultado individual;
- resultados batch;
- filtros de riesgo;
- vista previa;
- historial de runs cargado en memoria;
- polling activo de jobs anteriores.

### Importancia de este comportamiento

Esto evita que el usuario vea resultados cruzados de un dataset anterior cuando
ya cambió de contexto.

---

## Alcance real de la pestaña en la versión actual

La pestaña **Predicciones** sí está diseñada para:

- ejecutar inferencia individual docente–asignatura;
- ejecutar inferencia batch por dataset;
- visualizar resultados con apoyo gráfico;
- revisar historial de ejecuciones batch;
- descargar artefactos de predicción.

La pestaña **Predicciones** no está diseñada para:

- cargar datasets nuevos;
- entrenar modelos;
- seleccionar manualmente hiperparámetros;
- cambiar manualmente la familia activa de inferencia;
- administrar directamente los artefactos del entrenamiento.

---

## Flujo de trabajo recomendado

En la versión actual de NeuroCampus, el flujo recomendado es:

1. cargar y preparar el dataset en **Datos**;
2. asegurar en **Modelos** que existe campeón para `score_docente`;
3. abrir **Predicciones** con el dataset correcto;
4. ejecutar una predicción individual para validar el comportamiento esperado;
5. ejecutar el batch si se necesita cobertura completa del dataset;
6. revisar KPIs, distribución por riesgo y tabla filtrable;
7. descargar el artefacto final si se requiere análisis externo o trazabilidad.

---

## Relación con otras pestañas

La pestaña **Predicciones** se alimenta directamente del trabajo hecho en otras
partes del sistema:

- **Datos**
  - aporta datasets y artefactos base.
- **Modelos**
  - aporta el modelo campeón que se usa para inferencia.
- **Dashboard**
  - puede reutilizar resultados agregados o indicadores derivados de
    predicciones persistidas.

Por eso, **Predicciones** debe entenderse como la etapa de **inferencia y
consulta de resultados**, ubicada después de la preparación de datos y del
ciclo de modelado.
