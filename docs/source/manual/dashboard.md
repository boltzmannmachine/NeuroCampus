# Pestaña «Dashboard»

## Objetivo

La pestaña **Dashboard** presenta una vista consolidada del desempeño académico
e institucional a partir del **histórico unificado** del sistema.

Su propósito es permitir una lectura rápida del estado general de la institución
mediante indicadores agregados, rankings, comparaciones históricas y contexto
cualitativo de comentarios.

A diferencia de otras pestañas, el Dashboard **no trabaja directamente sobre un
dataset puntual cargado por el usuario**. Su información proviene del histórico
procesado y, cuando está disponible, del histórico etiquetado con análisis de
sentimientos.

---

## Fuente de información

El Dashboard consume información del backend a través de los endpoints
`/dashboard/*`.

Las visualizaciones se construyen a partir de dos fuentes principales:

- **Histórico procesado**:
  - base para KPIs, series temporales, rankings y radar de indicadores.
- **Histórico etiquetado**:
  - base para análisis de sentimientos y nube de palabras.

En consecuencia:

- si el histórico procesado no está listo, la pestaña no puede operar con
  normalidad;
- si el histórico etiquetado no está listo, algunas visualizaciones cualitativas
  pueden no estar disponibles temporalmente.

---

## Encabezado y estado de carga

En la parte superior se muestra:

- el título **Dashboard**;
- el subtítulo **Diagnóstico General de la Institución**;
- mensajes de estado del sistema.

### Estados que puede mostrar la interfaz

- **Cargando datos del histórico…**
  - aparece mientras el frontend consulta la información del dashboard.
- **Error**
  - aparece si falla la carga de datos desde el backend.
- **Histórico en actualización…**
  - aparece cuando el histórico procesado o el histórico etiquetado aún no están
    listos.

Este comportamiento permite al usuario saber si la información mostrada está
disponible completamente o si alguna parte del pipeline todavía está pendiente.

---

## Filtros globales

La barra de filtros actual contiene **tres controles**:

1. **Semestre / Periodo**
2. **Asignatura**
3. **Docente**

### 1. Semestre / Periodo

Este filtro permite seleccionar:

- un periodo específico, por ejemplo `2024-2`;
- o la opción **Histórico (todo)**.

#### Comportamiento

- Cuando se elige un **periodo específico**, los KPIs y rankings se calculan
  sobre ese periodo.
- Cuando se elige **Histórico (todo)**, el dashboard usa el rango completo de
  periodos disponibles en el histórico.

### 2. Asignatura

Permite limitar la vista a:

- **Todas las Asignaturas**, o
- una asignatura específica disponible en el catálogo del periodo/rango actual.

### 3. Docente

Permite limitar la vista a:

- **Todos los Docentes**, o
- un docente específico disponible en el catálogo del periodo/rango actual.

### Observaciones importantes sobre los filtros

- Los catálogos de docente y asignatura se recalculan según el periodo o rango
  seleccionado.
- Si un docente o una asignatura dejan de existir en el catálogo filtrado,
  la interfaz reinicia ese filtro a la opción general.
- En la versión actual de la UI, el backend soporta también filtro por
  **programa**, pero ese control **no está expuesto** todavía en la barra visual
  del Dashboard.

---

## Tarjetas KPI

Debajo de los filtros se muestran **cuatro tarjetas principales**.

### 1. Predicciones Totales

Indica el número total de predicciones persistidas para el contexto filtrado.

Se calcula a partir de los artefactos de predicción asociados al periodo o rango
seleccionado.

### 2. Exactitud del Modelo

Muestra la exactitud del modelo campeón en forma de porcentaje.

En la interfaz actual esta tarjeta se presenta como:

- **Exactitud del Modelo**
- subtítulo: **F1-Score Champion**

Esta tarjeta se mantiene para conectar el Dashboard con el rendimiento del modelo
activo, aunque conceptualmente no proviene del mismo histórico que las otras
métricas agregadas.

### 3. Evaluaciones Registradas

Indica la cantidad de evaluaciones presentes en el histórico filtrado.

Es uno de los indicadores básicos para validar el volumen de información que
soporta las visualizaciones del dashboard.

### 4. % Alto Rendimiento

Representa el porcentaje agregado de alto rendimiento en el contexto
seleccionado.

Sirve como señal rápida del estado general del desempeño en el periodo,
docente o asignatura filtrados.

---

## Sección: «¿Cómo estamos ahora?»

Esta sección ofrece una **vista transversal del estado actual** mediante dos
visualizaciones.

### 1. Distribución de Riesgo por Asignatura

Se muestra como un **gráfico de barras apiladas**.

#### Qué representa

Para cada asignatura se presentan tres segmentos:

- **Bajo Riesgo**
- **Medio Riesgo**
- **Alto Riesgo**

#### Utilidad

Permite identificar rápidamente:

- asignaturas con mayor concentración de riesgo;
- distribución comparativa entre asignaturas;
- áreas que requieren atención o intervención.

### 2. Ranking de Docentes

Se muestra como un **gráfico de barras horizontales**.

#### Modos disponibles

La interfaz permite alternar entre dos vistas:

- **Top Mejores**
- **A Intervenir**

#### Interpretación

- **Top Mejores** prioriza docentes con mejor score.
- **A Intervenir** prioriza docentes con menor score o mayor necesidad de
  seguimiento.

#### Utilidad

Este gráfico facilita:

- identificar referentes de buen desempeño;
- detectar casos prioritarios para acompañamiento;
- comparar docentes dentro del contexto filtrado.

---

## Sección: «Análisis de Indicadores - Comparación Histórica vs Semestre Actual»

Esta sección usa un **gráfico radar** para comparar indicadores agregados.

### Qué compara

El radar muestra dos perfiles:

- **Promedio Histórico (Todos los Semestres)**
- **Semestre seleccionado**

### Qué representa

Cada eje corresponde a un indicador derivado de preguntas o dimensiones del
histórico procesado.

### Utilidad

Este gráfico ayuda a responder preguntas como:

- ¿el semestre actual está por encima o por debajo del promedio histórico?
- ¿en qué dimensiones se observan mejoras o retrocesos?
- ¿el perfil actual mantiene un comportamiento estable o cambia de forma clara?

### Comportamiento contextual

- Si el usuario selecciona un docente, el radar se interpreta como el perfil de
  ese docente dentro del contexto filtrado.
- Si no hay un docente específico seleccionado, el radar se interpreta como un
  **perfil global de indicadores**.

---

## Sección: «¿Cómo hemos cambiado? - Vista Temporal»

Esta sección presenta dos gráficos de evolución histórica.

### 1. Histórico por Entidad Seleccionada

Se muestra como un **gráfico de líneas**.

#### Qué representa

- si hay un docente seleccionado, se visualiza el histórico de ese docente;
- si no lo hay, se presenta un histórico agregado de la entidad filtrada.

#### Utilidad

Permite observar:

- evolución del desempeño a lo largo de varios periodos;
- estabilidad o variación temporal;
- patrones de mejora o deterioro.

### 2. Promedio Histórico vs Semestre Actual

También se muestra como un **gráfico de líneas**.

#### Series comparadas

- **Promedio Histórico**
- **Semestre Actual**

#### Utilidad

Sirve para contrastar:

- el comportamiento general acumulado,
- frente al valor del periodo activo.

Es una visualización útil para detectar desviaciones del semestre más reciente
respecto al comportamiento histórico.

---

## Sección: «Contexto Cualitativo - Tendencias en Comentarios»

La parte final de la pestaña muestra una **nube de palabras** derivada del
análisis textual de comentarios.

### Nube de palabras

Cada término se representa con:

- tamaño relativo según su frecuencia;
- color según su polaridad estimada.

### Convención visual

- **Verde**: positivo
- **Gris**: neutral
- **Rojo**: negativo

### Utilidad

La nube de palabras permite:

- identificar conceptos recurrentes en comentarios;
- detectar señales cualitativas positivas o negativas;
- complementar la lectura cuantitativa del Dashboard con contexto textual.

### Disponibilidad

Esta visualización depende del histórico etiquetado.

Si el backend aún no dispone del histórico etiquetado, la UI puede mostrar una
versión de respaldo o dejar esta sección con información no definitiva hasta que
el proceso esté completo.

---

## Comportamiento general de la pestaña

### Carga de datos

La pestaña realiza consultas al backend para obtener:

- estado del histórico;
- periodos disponibles;
- catálogos;
- KPIs;
- series históricas;
- rankings;
- radar;
- sentimiento;
- nube de palabras.

### Deshabilitación de controles

Los filtros pueden quedar deshabilitados temporalmente cuando:

- la pestaña está cargando datos;
- el histórico procesado aún no está listo.

### Reacción a cambios de filtros

Cada vez que cambia el periodo, docente o asignatura:

- se recalculan KPIs;
- se actualizan rankings;
- se actualizan series históricas;
- se reconstruyen gráficos agregados;
- se recalculan las visualizaciones cualitativas cuando aplica.

---

## Alcance real del Dashboard en la versión actual

En la implementación actual, esta pestaña está orientada a:

- monitoreo agregado;
- análisis histórico;
- apoyo a toma de decisiones;
- priorización institucional.

No está diseñada para:

- cargar archivos manualmente;
- editar datasets;
- lanzar entrenamientos;
- ejecutar predicciones individuales o masivas.

Es una pestaña de **consulta y análisis**, no de operación del pipeline.

---

## Relación con otras pestañas

El Dashboard depende indirectamente del trabajo realizado en otras áreas del
sistema:

- **Datos**
  - aporta los insumos que alimentan el histórico institucional.
- **Modelos**
  - define el modelo campeón y el contexto de rendimiento predictivo.
- **Predicciones**
  - genera resultados persistidos que se reflejan en parte de los KPIs del
    dashboard.

Por tanto, el Dashboard actúa como la **vista consolidada final** del sistema:
resume y presenta en una sola pantalla el estado general construido a partir del
histórico, los modelos y las predicciones.