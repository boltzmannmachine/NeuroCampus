# API del backend

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
