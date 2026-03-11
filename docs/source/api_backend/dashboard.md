# Endpoints del Dashboard

La API del **Dashboard** expone endpoints de consulta agregada construidos sobre el
histórico institucional de NeuroCampus. Su función es alimentar la pestaña
**Dashboard** del frontend con KPIs, filtros, rankings, series temporales,
indicadores radar y contexto cualitativo.

Todos los endpoints aquí descritos cuelgan del prefijo base:

- `/dashboard`

## Fuente de datos

La implementación actual trabaja con dos artefactos principales:

- `historico/unificado.parquet`
  - histórico procesado, usado para KPIs, series, radar y rankings.
- `historico/unificado_labeled.parquet`
  - histórico etiquetado, usado para sentimiento y nube de palabras.

También consulta el manifiesto institucional para determinar periodos
existentes y estado del histórico.

## Filtros comunes

La mayoría de endpoints del dashboard aceptan los mismos filtros de consulta:

- `periodo`
  - periodo exacto; tiene prioridad sobre el rango.
- `periodo_from`
  - inicio de rango, inclusivo.
- `periodo_to`
  - fin de rango, inclusivo.
- `docente`
  - filtro por docente.
- `asignatura`
  - filtro por asignatura.
- `programa`
  - filtro por programa.

En la UI actual el control de `programa` no está expuesto de forma visible en la
barra principal del Dashboard, pero el backend sí lo soporta.

---

## Resumen de endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/dashboard/status` | Estado del histórico, manifiesto y disponibilidad de archivos base |
| GET | `/dashboard/periodos` | Lista de periodos disponibles para filtros |
| GET | `/dashboard/catalogos` | Catálogos de docentes, asignaturas y programas según filtros |
| GET | `/dashboard/kpis` | KPIs agregados del dashboard |
| GET | `/dashboard/series` | Serie temporal agregada por periodo |
| GET | `/dashboard/radar` | Perfil radar de indicadores promedio |
| GET | `/dashboard/wordcloud` | Términos frecuentes desde histórico etiquetado |
| GET | `/dashboard/sentimiento` | Distribución global de sentimiento |
| GET | `/dashboard/rankings` | Rankings por docente o asignatura |

---

## `GET /dashboard/status`

### Descripción

Devuelve el estado del histórico usado por el Dashboard.

Es un endpoint ligero: no carga parquets completos, sino que inspecciona
manifiestos y existencia de archivos relevantes.

### Respuesta

- `manifest_exists`
- `manifest_updated_at`
- `manifest_corrupt`
- `periodos_disponibles`
- `processed`
  - ruta, existencia y fecha de modificación de `historico/unificado.parquet`
- `labeled`
  - ruta, existencia y fecha de modificación de `historico/unificado_labeled.parquet`
- `ready_processed`
  - `true` si existe histórico procesado y hay periodos válidos en el manifiesto
- `ready_labeled`
  - `true` si existe el histórico etiquetado

### Uso en frontend

Este endpoint se usa para:

- determinar si el Dashboard puede cargarse normalmente;
- mostrar mensajes como “histórico en actualización”; 
- decidir si las visualizaciones cualitativas están disponibles.

---

## `GET /dashboard/periodos`

### Descripción

Lista los periodos disponibles para poblar el filtro de periodo del Dashboard.

### Respuesta

Devuelve un objeto con un arreglo `items`, por ejemplo:

```json
{
  "items": ["2023-2", "2024-1", "2024-2", "2025-1"]
}
```

---

## `GET /dashboard/catalogos`

### Descripción

Devuelve los catálogos dinámicos de:

- docentes
- asignaturas
- programas

según el contexto filtrado.

### Parámetros de query

- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Comportamiento

El backend:

1. carga el histórico procesado;
2. aplica los filtros recibidos;
3. calcula los catálogos válidos para ese subconjunto.

### Respuesta

Devuelve tres listas:

- `docentes`
- `asignaturas`
- `programas`

Este endpoint permite que el frontend recalcule dropdowns dependientes al cambiar
el periodo o el rango histórico.

---

## `GET /dashboard/kpis`

### Descripción

Calcula los KPIs agregados del Dashboard sobre el histórico procesado y agrega un
KPI adicional basado en predicciones persistidas.

### Parámetros de query

- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Comportamiento

El endpoint:

1. carga `historico/unificado.parquet`;
2. aplica filtros;
3. calcula KPIs base con `compute_kpis(df_f)`;
4. cuenta predicciones persistidas en `artifacts/predictions/` para los
   `dataset_id` compatibles con el periodo o rango solicitado.

### Respuesta

Incluye, al menos, el KPI de:

- `predicciones`

junto con el resto de KPIs agregados calculados desde el histórico.

### Observación

Este endpoint conecta el Dashboard con el subsistema de predicciones, por eso el
número de predicciones no sale del histórico procesado sino del directorio de
artefactos de salida de predicción.

---

## `GET /dashboard/series`

### Descripción

Devuelve una serie agregada por periodo para construir gráficos temporales.

### Parámetros de query

- `metric`
  - por defecto: `evaluaciones`
  - ejemplos soportados: `evaluaciones`, `score_promedio`, `docentes`, `asignaturas`
- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Respuesta

Devuelve un objeto con:

- `metric`
- `points`
  - lista de puntos con `periodo` y `value`

Ejemplo simplificado:

```json
{
  "metric": "evaluaciones",
  "points": [
    {"periodo": "2024-1", "value": 1200},
    {"periodo": "2024-2", "value": 1335}
  ]
}
```

### Errores relevantes

- `404` si no existe el histórico procesado.
- `400` si la métrica solicitada no es válida o los filtros son inconsistentes.

---

## `GET /dashboard/radar`

### Descripción

Devuelve el perfil radar del histórico filtrado, calculado a partir del promedio
agregado de las preguntas 1 a 10.

### Parámetros de query

- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Respuesta

Devuelve un objeto con `items`, donde cada elemento contiene:

- `key`
- `value`

### Notas de implementación

- El backend trabaja sobre la escala original del histórico, típicamente `0–50`.
- Si el frontend requiere escala `0–5`, debe transformar los valores.

### Errores relevantes

- `404` si no existe histórico procesado.
- `400` si los filtros o el cálculo no son válidos.

---

## `GET /dashboard/wordcloud`

### Descripción

Devuelve los términos más frecuentes del histórico etiquetado, junto con su
frecuencia y polaridad asociada.

### Parámetros de query

- `limit`
  - máximo de términos; por defecto `80`, mínimo `1`, máximo `500`
- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Respuesta

Devuelve un objeto con `items`, donde cada elemento contiene:

- `text`
- `value`
- `sentiment`

### Errores relevantes

- `404` si no existe `historico/unificado_labeled.parquet`.
- `400` si el cálculo no puede realizarse con los filtros dados.

---

## `GET /dashboard/sentimiento`

### Descripción

Devuelve la distribución agregada de sentimiento sobre el histórico etiquetado.

### Parámetros de query

- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Respuesta

Devuelve un objeto con `buckets`, por ejemplo:

- `neg`
- `neu`
- `pos`

Cada bucket contiene:

- `label`
- `value`

El valor se entrega como proporción en el rango `0..1`.

### Errores relevantes

- `404` si no existe histórico etiquetado.
- `400` si el archivo existe, pero no tiene columnas compatibles de sentimiento.

---

## `GET /dashboard/rankings`

### Descripción

Genera rankings agregados a partir del histórico procesado.

### Parámetros de query

- `by`
  - obligatorio; dimensión del ranking, por ejemplo `docente` o `asignatura`
- `metric`
  - por defecto `score_promedio`
  - también puede usarse `evaluaciones`
- `order`
  - `asc` o `desc`
- `limit`
  - por defecto `8`, mínimo `1`, máximo `200`
- `periodo`
- `periodo_from`
- `periodo_to`
- `docente`
- `asignatura`
- `programa`

### Uso típico

Este endpoint alimenta bloques como:

- ranking de docentes;
- ranking de asignaturas;
- tablas de mejores o casos a intervenir.

### Errores relevantes

- `404` si no existe el histórico procesado.
- `400` si `by`, `metric` u `order` no son válidos.

---

## Consideraciones funcionales

### Dependencia del histórico

La mayor parte del Dashboard depende de la existencia y consistencia de:

- `historico/unificado.parquet`
- `historico/unificado_labeled.parquet`
- manifiesto institucional de periodos

Si estos artefactos no están listos, algunos endpoints devolverán `404` o un
estado de no disponibilidad.

### Separación entre datos procesados y etiquetados

- Los endpoints `status`, `periodos`, `catalogos`, `kpis`, `series`, `radar` y
  `rankings` se apoyan principalmente en el histórico procesado.
- Los endpoints `wordcloud` y `sentimiento` requieren histórico etiquetado.

### Relación con otras áreas del sistema

La API del Dashboard depende indirectamente de procesos ejecutados desde:

- **Datos**
  - para unificación de histórico y procesamiento base;
- **Predicciones**
  - para el conteo de resultados persistidos;
- **Modelos**
  - de forma indirecta, cuando el frontend cruza KPIs del dashboard con estado
    del modelo campeón.
