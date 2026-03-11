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

En esta fase de la documentación, las páginas ya integradas en esta sección son:

- `datos`
- `jobs`
- `admin`

Los dominios **modelos**, **dashboard**, **prediccion** y **predicciones** ya
están activos en el backend y serán documentados en páginas específicas para
mantener una referencia técnica coherente con la implementación real, sin
introducir enlaces rotos en el árbol actual de Sphinx.

## Resumen de dominios expuestos

| Dominio | Prefijo o ruta base | Propósito principal |
| --- | --- | --- |
| Datos | `/datos` | Validación, carga, resumen y agregados del dataset |
| Jobs | `/jobs` | Ejecución y seguimiento de procesos asíncronos |
| Modelos | `/modelos` | Entrenamiento, estado, sweeps, artefactos y diagnóstico |
| Dashboard | `/dashboard` | KPIs, series, radar, rankings, sentimiento y wordcloud |
| Predicción | `/prediccion` | Inferencia online e inferencia batch |
| Predicciones | `/predicciones` | Salud del módulo, catálogos, salidas, preview y predicción resuelta |
| Administración | `/admin/cleanup` | Inventario, limpieza y logs de mantenimiento |

## Navegación de esta sección

```{toctree}
:maxdepth: 1

datos
jobs
admin
```