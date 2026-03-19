# Pestaña «Datos»

## Objetivo

La pestaña **Datos** concentra el flujo de ingestión, validación, carga y
preparación de artefactos derivados a partir de datasets de evaluaciones
docentes.

Desde esta pestaña el usuario puede:

- seleccionar un periodo de trabajo;
- cargar un archivo de datos;
- validarlo y persistirlo en el backend;
- consultar un resumen del dataset activo;
- ejecutar análisis de sentimientos con BETO;
- unificar históricos;
- preparar el paquete de características para etapas posteriores del pipeline.

Esta pestaña funciona como el punto de entrada operativo de los datos que luego
alimentan otras partes del sistema, especialmente **Modelos**, **Predicciones**
y **Dashboard**.

---

## Estructura general de la pestaña

La interfaz actual está organizada en tres bloques funcionales:

1. **Carga del Dataset**
2. **Artefactos de datos**
3. **Resumen y análisis del dataset**

Cuando el dataset ya fue cargado o existe un dataset activo en contexto, también
se habilita la sección:

4. **Análisis de Sentimientos con BETO**

---

## 1. Carga del Dataset

La primera tarjeta de la pestaña se llama **Carga del Dataset**.

### Elementos visibles

En esta sección la interfaz presenta:

- un área para seleccionar o arrastrar un archivo;
- el campo **Nombre del Dataset**;
- el selector **Semestre**;
- varias opciones de procesamiento;
- el botón principal **Load and Process**;
- una barra de progreso durante la subida;
- mensajes de error o confirmación.

---

## Selección del archivo

El archivo puede cargarse de dos maneras:

- haciendo clic en el área de carga;
- arrastrando y soltando el archivo sobre la zona punteada.

### Formatos visibles en la UI

La interfaz actual muestra explícitamente:

- **CSV**
- **XLSX**

con la nota visual:

- **Max 10MB**

### Observación importante

A nivel de servicios frontend y backend existen referencias a validación para
otros formatos como `parquet`, pero la interfaz actual guía al usuario
principalmente a trabajar con **CSV** y **XLSX**. Para fines del manual de uso,
estos son los formatos operativos principales de esta pestaña.

---

## Campo «Nombre del Dataset»

La interfaz muestra un campo de texto llamado **Nombre del Dataset**.

### Estado real en la implementación actual

En la versión actual de la pestaña, este campo está visible, pero **no define el
identificador efectivo** con el que se valida y carga el dataset en backend.

El identificador lógico real utilizado por el flujo actual corresponde al valor
seleccionado en **Semestre**.

### Implicación práctica

Aunque el usuario puede escribir un nombre en este campo, el backend trabaja con
el dataset asociado al **periodo/semestre activo**.

Por ello, al operar la pestaña debe asumirse que el contexto real del dataset lo
determina el selector de **Semestre**, no el texto escrito en este campo.

---

## Selector «Semestre»

El selector de semestre establece el contexto principal de trabajo del dataset.

### Qué hace

Al cambiar el semestre:

- se actualiza el contexto global del frontend;
- cambia el identificador lógico del dataset activo;
- se reinician estados locales relacionados con jobs y mensajes;
- el panel queda listo para consultar o cargar información asociada a ese
  periodo.

### Interpretación funcional

En la implementación actual, el semestre actúa como el **dataset_id efectivo**
para:

- validación;
- carga;
- consulta de resumen;
- consulta de sentimientos;
- preparación de artefactos.

Por ejemplo, si el usuario selecciona `2025-1`, ese valor es el que el sistema
usa como referencia principal del dataset.

---

## Opciones de procesamiento

Debajo del selector aparecen varias casillas de verificación.

### 1. Aplica pre-procesamiento

La UI muestra esta opción como parte del flujo de carga.

#### Estado real en la versión actual

Aunque la casilla está visible y puede activarse o desactivarse, **no modifica
de forma efectiva el flujo de carga actual en el frontend**.

Es decir, hoy funciona más como un elemento de interfaz heredado o reservado
para evolución futura que como un control operativo real.

### 2. Correr análisis de sentimientos (BETO)

Esta opción sí afecta el flujo.

Si está activada, una vez cargado el dataset el frontend intenta lanzar el job
de análisis de sentimientos con BETO.

### 3. Generar embeddings TF-IDF+LSA (64)

Esta opción aparece únicamente cuando está activa la ejecución de BETO.

Controla el parámetro de generación de representaciones textuales adicionales
durante el job.

### 4. Tratar los comentarios vacíos como SIN_TEXTO

También aparece cuando BETO está habilitado.

Controla la política usada para comentarios vacíos o sin contenido útil.

### 5. Forzar la reconstrucción del conjunto de datos procesados

Esta opción permite solicitar la reconstrucción de la versión procesada del
dataset cuando se ejecuta el flujo BETO.

---

## Botón principal: «Load and Process»

Este botón inicia el flujo principal de la pestaña.

### Secuencia real del proceso

Cuando el usuario pulsa **Load and Process**, el frontend ejecuta este orden:

1. valida que se haya seleccionado un archivo;
2. lanza una validación previa del dataset;
3. si la validación falla, detiene el flujo;
4. si la validación pasa, sube el archivo al backend;
5. si el dataset ya existe, solicita confirmación para reemplazarlo;
6. fija el dataset activo en el contexto global;
7. si BETO está activado, intenta lanzar el job de sentimientos;
8. refresca el resumen del dataset.

### Manejo de reemplazo

Si el backend responde que el dataset ya existe, la interfaz muestra una
confirmación para decidir si se desea hacer **overwrite**.

Si el usuario acepta, se repite la subida con reemplazo habilitado.

---

## Barra de progreso y mensajes

Durante la carga se muestra:

- una barra de progreso;
- el porcentaje de avance;
- el estado de procesamiento.

La UI también puede mostrar:

- errores de validación;
- errores de subida;
- mensajes de fallo del job BETO;
- confirmación de filas leídas y válidas.

### Confirmación visible tras carga

Cuando la operación termina correctamente, la interfaz muestra un mensaje tipo:

- `X rows read, Y valid`

Esto permite verificar rápidamente que el dataset fue reconocido y procesado por
el backend.

---

## 2. Artefactos de datos

La segunda tarjeta se llama **Artefactos de datos**.

Esta sección queda operativa cuando existe un dataset activo en el contexto.

Su objetivo es habilitar procesos derivados necesarios para otras etapas del
pipeline.

La tarjeta contiene tres grupos:

1. **BETO**
2. **Unificación**
3. **Paquete de características**

---

## 2.1 Estado del proceso BETO

La tarjeta muestra un resumen del job BETO asociado al dataset activo.

### Información que puede aparecer

- **Status**
- **Text coverage**
- **Accepted**
- **text_feats**
- **empty_text_policy**
- ruta de salida del archivo etiquetado

### Archivo de salida esperado

Cuando el proceso está asociado al dataset activo, la interfaz muestra como
referencia una salida de este tipo:

```text
data/labeled/<dataset_id>_beto.parquet
```

### Utilidad

Este bloque permite confirmar:

- si el análisis de sentimientos ya corrió;
- con qué parámetros se ejecutó;
- si produjo un artefacto etiquetado reutilizable.

---

## 2.2 Unificación histórica

Esta subsección se presenta como **Unificación (historico/*)**.

### Botones disponibles

La UI actual muestra dos acciones:

- **Unificar histórico**
- **Unify Labeled**

### Qué hacen

#### Unificar histórico

Lanza el job de unificación del histórico general.

#### Unify Labeled

Lanza la unificación del histórico etiquetado, es decir, la versión asociada a
datasets ya enriquecidos con sentimientos u otras salidas derivadas.

### Estados visibles

La interfaz puede mostrar:

- **Corriendo unificación…**
- **Unify failed**
- **Done**

### Resultado esperado

Cuando termina correctamente, el backend devuelve una referencia de salida
asociada a `historico/*`.

### Uso recomendado

Esta acción se utiliza cuando se quiere consolidar información de múltiples
datasets ya cargados para alimentar vistas históricas, especialmente el
**Dashboard**.

---

## 2.3 Paquete de características

Esta subsección aparece como:

- **Paquete de características (artifacts/features/*)**

### Acción disponible

- **Preparar Paquete de Características**

### Qué hace

Lanza un job de construcción del feature-pack para el dataset activo.

### Resultado esperado

Cuando finaliza correctamente, la interfaz informa una salida de este tipo:

```text
artifacts/features/<dataset_id>/train_matrix.parquet
```

### Para qué sirve

Este artefacto es relevante para etapas posteriores del pipeline de modelado, ya
que prepara una matriz de entrenamiento o insumo estructurado para procesos de
machine learning.

---

## 3. Resumen del Dataset

En la columna derecha aparece la tarjeta **Resumen del Dataset**.

Esta sección se activa cuando existe un dataset cargado o seleccionado en el
contexto.

### Indicadores mostrados en la UI actual

La implementación actual presenta tres KPI principales:

- **Total de Filas**
- **Columnas**
- **Docentes**

### Importante

Aunque el backend puede manejar más información de resumen, la UI actual de esta
pestaña muestra de forma visible esas tres métricas como resumen principal.

---

## Vista previa tabular

Debajo de los KPIs aparece una tabla de vista previa.

### Columnas visibles

La tabla actual muestra:

- **ID**
- **Docente**
- **Materia**
- **Calificación**
- **Comentario**

### Propósito

Esta tabla permite al usuario revisar rápidamente la estructura general de los
registros y confirmar que el contenido cargado es coherente con lo esperado.

### Observación funcional

La vista previa depende de la muestra devuelta por el proceso de validación y de
las transformaciones internas que realiza el frontend para representarla.

Debe entenderse como una **verificación rápida de contenido**, no como una vista
completa del dataset persistido.

---

## 4. Análisis de Sentimientos con BETO

Cuando hay dataset activo y la opción BETO está habilitada, la pestaña muestra
la sección **Análisis de Sentimientos con BETO**.

Esta parte contiene dos visualizaciones principales:

1. **Distribución de polaridad**
2. **Distribución de Sentimientos por docente**

---

## 4.1 Distribución de polaridad

Se muestra mediante un gráfico de torta.

### Etiquetas visibles

La interfaz traduce las etiquetas de sentimiento a:

- **Positivo**
- **Neutral**
- **Negativo**

### Convención de color

La UI actual usa esta convención:

- **Verde** para positivo
- **Gris** para neutral
- **Rojo** para negativo

### Qué representa

El gráfico resume la distribución global de sentimientos del dataset activo.

Sirve para obtener una lectura inmediata del balance general entre comentarios
positivos, neutrales y negativos.

---

## 4.2 Distribución de Sentimientos por docente

La segunda visualización muestra la distribución agregada de sentimientos por
docente.

### Propósito

Permite comparar cómo se distribuyen las polaridades entre distintos docentes
del dataset activo.

### Utilidad

Esta visualización ayuda a:

- detectar docentes con mayor concentración de comentarios negativos;
- comparar perfiles cualitativos;
- identificar patrones generales de percepción.

---

## Estados de error o indisponibilidad

La pestaña puede mostrar mensajes no intrusivos cuando ciertos endpoints aún no
están disponibles o no devuelven información lista para mostrar.

Por ejemplo:

- errores asociados al endpoint de **Sentimientos**;
- errores asociados al endpoint de **Resumen**;
- fallos del job BETO;
- fallos del job de unificación;
- fallos del feature-pack.

Esto es coherente con el diseño actual del sistema, donde varias operaciones se
ejecutan como jobs asíncronos y pueden tardar en reflejarse en la UI.

---

## Flujo de trabajo recomendado

En la versión actual de NeuroCampus, el flujo recomendado dentro de esta pestaña
es el siguiente:

1. seleccionar el **Semestre** que actuará como identificador lógico;
2. cargar el archivo del dataset;
3. ejecutar **Load and Process**;
4. verificar que el resumen del dataset sea coherente;
5. si aplica, esperar o revisar el estado del job **BETO**;
6. ejecutar **Unificar histórico** cuando se requiera consolidación histórica;
7. ejecutar **Preparar Paquete de Características** cuando se necesiten
   artefactos para modelado.

---

## Alcance real de la pestaña en la versión actual

La pestaña **Datos** sí está diseñada para:

- cargar datasets;
- validar y persistir información;
- lanzar jobs de procesamiento;
- construir artefactos reutilizables;
- alimentar el resto del pipeline.

La pestaña **Datos** no está diseñada para:

- entrenar modelos directamente;
- seleccionar modelo campeón;
- ejecutar predicciones finales sobre usuarios específicos;
- visualizar indicadores institucionales agregados del histórico completo como
  función principal.

---

## Relación con otras pestañas

La pestaña **Datos** tiene un papel fundacional dentro del sistema:

- alimenta a **Modelos** mediante datasets y feature-packs;
- alimenta a **Predicciones** al dejar datasets disponibles para inferencia;
- alimenta al **Dashboard** a través de los procesos de unificación histórica.

Por ello, cualquier flujo de trabajo completo dentro de NeuroCampus suele
comenzar en **Datos**.