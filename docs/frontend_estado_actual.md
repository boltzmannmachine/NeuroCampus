> **Estado:** Legacy / historico.
> Este documento se conserva como referencia de una etapa anterior del frontend y puede no reflejar la estructura actual de la aplicacion.
>
> **Documentacion activa relacionada:**
> - `docs/source/arquitectura/frontend.md`
> - `docs/source/manual/index.md`
>
> ---
# Estado actual del frontend

## Rutas activas
El router principal del frontend se define en `frontend/src/routes/Router.tsx`.
Actualmente las rutas activas son estas:

- **`/`**: redirige a `/dashboard`.
- **`/dashboard`**: tablero principal con metricas y agregados del historico consolidado.
- **`/datos`**: flujo operativo de carga, validacion, resumen, sentimientos y generacion de artefactos de datos.
- **`/models`**: pestana de modelos con readiness, entrenamiento, sweep, runs, champion, bundle y diagnostico.
- **`/prediction`**: pestana de predicciones basada en el router backend `/predicciones`.
- **`*`**: cualquier otra ruta redirige a `/dashboard`.

## Rutas no activas
Estas rutas aparecieron en documentacion o prototipos previos, pero **no estan registradas** en el router actual:

- `/jobs`
- `/datos/v2`
- `/models/v2`
- `/prediction/v2`

## Composicion actual por pagina
- **Dashboard**: usa `DashboardPage` y consume endpoints del dominio `dashboard`.
- **Datos**: usa `DatosPage` y renderiza `DataTab`, que concentra la ingesta, validacion y artefactos.
- **Modelos**: usa `ModelosPage` y orquesta las subtabs del dominio `modelos`.
- **Predicciones**: usa `PrediccionesPage` y opera contra el contrato actual de `/predicciones`.

## Notas de coherencia
- El identificador operativo del dataset en la pestana **Datos** se deriva del semestre seleccionado, que a su vez se alinea con `activePeriodo` y `activeDatasetId`.
- La documentacion debe considerar `/prediccion` como ruta legacy de backend; la UI activa utiliza `/predicciones` a traves de la capa de servicios del frontend.
- La aplicacion todavia tiene componentes y textos heredados del prototipo, pero la navegacion activa ya esta acotada a las cuatro rutas funcionales listadas arriba.
