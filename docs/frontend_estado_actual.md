# Estado actual del frontend

## Rutas activas
El router principal del frontend se define en `frontend/src/routes/Router.tsx`.
Actualmente las rutas activas son estas:

- **`/`**: redirige a `/dashboard`.
- **`/dashboard`**: tablero principal con métricas y agregados del histórico consolidado.
- **`/datos`**: flujo operativo de carga, validación, resumen, sentimientos y generación de artefactos de datos.
- **`/models`**: pestaña de modelos con readiness, entrenamiento, sweep, runs, champion, bundle y diagnóstico.
- **`/prediction`**: pestaña de predicciones basada en el router backend `/predicciones`.
- **`*`**: cualquier otra ruta redirige a `/dashboard`.

## Rutas no activas
Estas rutas aparecieron en documentación o prototipos previos, pero **no están registradas** en el router actual:

- `/jobs`
- `/datos/v2`
- `/models/v2`
- `/prediction/v2`

## Composición actual por página
- **Dashboard**: usa `DashboardPage` y consume endpoints del dominio `dashboard`.
- **Datos**: usa `DatosPage` y renderiza `DataTab`, que concentra la ingesta, validación y artefactos.
- **Modelos**: usa `ModelosPage` y orquesta las subtabs del dominio `modelos`.
- **Predicciones**: usa `PrediccionesPage` y opera contra el contrato actual de `/predicciones`.

## Notas de coherencia
- El identificador operativo del dataset en la pestaña **Datos** se deriva del semestre seleccionado, que a su vez se alinea con `activePeriodo` y `activeDatasetId`.
- La documentación debe considerar `/prediccion` como ruta legacy de backend; la UI activa utiliza `/predicciones` a través de la capa de servicios del frontend.
- La aplicación todavía tiene componentes y textos heredados del prototipo, pero la navegación activa ya está acotada a las cuatro rutas funcionales listadas arriba.
