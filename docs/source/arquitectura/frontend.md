# Arquitectura del frontend

## Visión general

El frontend de NeuroCampus está construido con **React 18 + TypeScript** y se
empaqueta con **Vite**.

La aplicación sigue una arquitectura ligera orientada a cuatro vistas
principales del producto:

- **Dashboard**
- **Datos**
- **Modelos**
- **Predicciones**

A nivel técnico, el frontend se organiza en cinco capas principales:

1. **Entrada de aplicación**
2. **Ruteo y layout**
3. **Páginas**
4. **Componentes funcionales por pestaña**
5. **Servicios de acceso a backend y estado compartido**

El objetivo de esta arquitectura es mantener separadas:

- la navegación,
- la composición visual,
- la lógica de cada pestaña,
- y la comunicación con la API del backend.

---

## Stack y herramientas

El `package.json` actual refleja este stack base:

- **React** para la interfaz
- **TypeScript** para tipado estático
- **React Router** para navegación
- **Vite** para desarrollo y build
- **Recharts** para visualizaciones
- **Lucide React** para iconografía
- **Vitest + Testing Library** para pruebas del frontend

Además, el proyecto incluye dependencias de interfaz asociadas a componentes de
estilo moderno, varias de ellas del ecosistema **Radix UI**.

---

## Estructura actual de directorios

Ubicación base del frontend:

```text
frontend/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  src/
    App.tsx
    main.tsx
    components/
      DashboardTab.tsx
      DataTab.tsx
      ModelsTab.tsx
      PredictionsTab.tsx
      Sidebar.tsx
      TeacherSentimentChart.tsx
    layouts/
      AppShell.tsx
    pages/
      DashboardPage.tsx
      DatosPage.tsx
      ModelosPage.tsx
      PrediccionesPage.tsx
    routes/
      Router.tsx
    services/
      api.ts
      apiClient.ts
      dashboard.ts
      datos.ts
      jobs.ts
      modelos.ts
      prediccion.ts
      predicciones.ts
      adminCleanup.ts
      endpoints.ts
      http.ts
    state/
      appFilters.store.ts
    styles/
      index.css
    types/
      neurocampus.ts
    setupTests.ts
```

### Lectura estructural

La estructura actual no está basada en muchas páginas complejas independientes,
sino en una composición sencilla:

- una **ruta por pestaña**;
- una **page wrapper** por ruta;
- un **tab component** que concentra la lógica real de la vista.

Es decir, la mayor parte de la lógica funcional vive hoy en:

- `DashboardTab.tsx`
- `DataTab.tsx`
- `ModelsTab.tsx`
- `PredictionsTab.tsx`

mientras que `pages/*.tsx` actúan como envolturas mínimas.

---

## 1. Entrada de la aplicación

### `src/main.tsx`

Es el punto de montaje de la aplicación React sobre el DOM.

Su responsabilidad principal es:

- inicializar React;
- importar estilos globales;
- montar el componente raíz.

### `src/App.tsx`

`App.tsx` es deliberadamente pequeño.

Su única responsabilidad es delegar el render al proveedor de rutas:

- usa `RouterProvider`;
- consume el `router` definido en `src/routes/Router.tsx`.

Esto mantiene el punto de entrada desacoplado de la navegación concreta.

---

## 2. Ruteo y navegación

### `src/routes/Router.tsx`

La navegación se define con `createBrowserRouter`.

La estructura actual es:

- `/` → redirección a `/dashboard`
- `/dashboard` → `DashboardPage`
- `/datos` → `DatosPage`
- `/models` → `ModelosPage`
- `/prediction` → `PrediccionesPage`
- `*` → redirección a `/dashboard`

### Observación importante

A nivel de interfaz, las pestañas visibles al usuario son:

- **Dashboard**
- **Datos**
- **Modelos**
- **Predicciones**

pero a nivel de rutas internas los paths actuales son:

- `/dashboard`
- `/datos`
- `/models`
- `/prediction`

Esto significa que el etiquetado de navegación está en español, mientras que dos
rutas internas permanecen con nombres heredados en inglés.

---

## 3. Layout compartido

### `src/layouts/AppShell.tsx`

`AppShell` define la estructura visual común de toda la aplicación.

### Responsabilidades

- Renderiza la **barra lateral** de navegación.
- Renderiza un **header superior** común.
- Expone un `<Outlet />` para el contenido de cada ruta.

### Composición visual

La disposición actual es:

- **Sidebar** a la izquierda;
- **header** superior en la zona principal;
- **contenido scrollable** en el área central.

### Header superior

El header incluye:

- identidad visual de NeuroCampus;
- botón de notificaciones;
- avatar o acceso visual de usuario.

En esta versión, estos elementos son principalmente de presentación y no
constituyen todavía un módulo funcional completo de autenticación o centro de
notificaciones.

---

## 4. Sidebar

### `src/components/Sidebar.tsx`

El `Sidebar` contiene los enlaces de navegación principales del sistema.

### Ítems actuales

- `Dashboard`
- `Datos`
- `Modelos`
- `Predicciones`

### Características

- usa `NavLink` para detectar estado activo;
- cambia estilo visual según la ruta actual;
- concentra la navegación de primer nivel;
- evita navegación anidada compleja.

Esta decisión es coherente con la arquitectura de producto actual, que prioriza
cuatro flujos grandes y diferenciados.

---

## 5. Capa de páginas

La carpeta `src/pages/` contiene cuatro componentes mínimos:

- `DashboardPage.tsx`
- `DatosPage.tsx`
- `ModelosPage.tsx`
- `PrediccionesPage.tsx`

### Patrón usado

Cada página simplemente delega en el componente de pestaña correspondiente.

Ejemplo conceptual:

- `DashboardPage` renderiza `DashboardTab`
- `DatosPage` renderiza `DataTab`
- `ModelosPage` renderiza `ModelsTab`
- `PrediccionesPage` renderiza `PredictionsTab`

### Ventaja de este patrón

Permite mantener separadas:

- la responsabilidad de enrutamiento,
- y la lógica funcional real de cada vista.

Así, si en el futuro se requiere cambiar el router, lazy loading o guards de
ruta, la lógica de negocio de cada pestaña no tiene que reescribirse.

---

## 6. Componentes funcionales principales

La carpeta `src/components/` concentra los componentes que implementan las
pantallas principales.

## 6.1 `DashboardTab.tsx`

Implementa la pestaña **Dashboard**.

### Responsabilidades funcionales

- consultar el estado del histórico;
- cargar periodos y catálogos del dashboard;
- aplicar filtros globales;
- mostrar KPIs institucionales;
- renderizar gráficos de ranking, series históricas, radar y sentimiento;
- presentar una vista agregada del sistema.

### Relación con backend

Consume principalmente endpoints bajo `/dashboard/*` mediante
`src/services/dashboard.ts`.

### Rol arquitectónico

Es una vista de **consulta y análisis agregado**.
No carga archivos, no entrena modelos y no ejecuta predicción operativa.

---

## 6.2 `DataTab.tsx`

Implementa la pestaña **Datos**.

### Responsabilidades funcionales

- seleccionar un archivo;
- validar dataset;
- subir y registrar dataset;
- consultar resumen del dataset activo;
- lanzar y monitorear análisis de sentimientos BETO;
- ejecutar unificación histórica;
- preparar el paquete de características.

### Relación con backend

Utiliza sobre todo:

- `src/services/datos.ts`
- `src/services/jobs.ts`

para consumir endpoints de:

- `/datos/*`
- `/jobs/*`

### Rol arquitectónico

Es la puerta de entrada operativa del pipeline de datos.
Conecta la ingesta con el resto del sistema.

---

## 6.3 `ModelsTab.tsx`

Implementa la pestaña **Modelos**.

### Responsabilidades funcionales

La UI actual está organizada en varias subpestañas internas, entre ellas:

- resumen,
- entrenamiento,
- ejecuciones,
- campeón,
- sweep,
- artefactos,
- diagnóstico.

### Funciones principales

- configurar y lanzar entrenamientos;
- consultar runs y métricas;
- revisar el campeón activo;
- explorar resultados de búsqueda o sweep;
- inspeccionar artefactos y señales de diagnóstico.

### Relación con backend

Consume principalmente `src/services/modelos.ts` y se apoya en endpoints de
`/modelos/*`.

### Observación arquitectónica importante

La implementación actual mezcla:

- datos reales del backend cuando los endpoints están disponibles;
- y ciertos fallbacks de interfaz o defaults visuales cuando una parte del
  backend aún no responde con la estructura esperada.

Por eso esta pestaña debe entenderse como una UI en consolidación, pero ya
alineada con el flujo operativo del sistema.

---

## 6.4 `PredictionsTab.tsx`

Implementa la pestaña **Predicciones**.

### Responsabilidades funcionales

- seleccionar dataset o contexto de predicción;
- resolver docente y asignatura cuando aplica;
- ejecutar predicción batch;
- mostrar resultados, trazabilidad y artefactos asociados;
- reutilizar contexto compartido desde Modelos cuando existe un run
  seleccionado.

### Relación con backend

La pestaña consume principalmente:

- `src/services/prediccion.ts`
- `src/services/predicciones.ts`

según el tipo de flujo solicitado.

### Rol arquitectónico

Es la capa de inferencia del frontend.
Conecta la selección de contexto con el champion activo o el run solicitado por
el usuario.

---

## 6.5 Componentes auxiliares especializados

### `TeacherSentimentChart.tsx`

Es un componente especializado para visualizar distribución de sentimientos por
docente.

### Qué aporta

- comparación entre docentes;
- ordenamiento por volumen o polaridad;
- búsqueda por nombre;
- selección comparativa de varios docentes;
- render con `Recharts`.

Este componente encapsula una lógica visual más rica que la de una gráfica
simple y evita sobrecargar la pestaña Datos o Dashboard con detalles de
interacción.

---

## 7. Estado compartido entre pestañas

### `src/state/appFilters.store.ts`

El frontend utiliza un store ligero basado en `useSyncExternalStore`.

### Qué guarda

El estado global actual incluye:

- `activeDatasetId`
- `activePeriodo`
- `periodoFrom`
- `periodoTo`
- `programa`
- `asignatura`
- `docente`
- `selectedModelFamily`
- `selectedModelName`
- `requestedPredictionRunId`
- `predictionSource`

### Objetivo arquitectónico

Este store permite compartir contexto entre pestañas sin introducir una capa más
pesada como Redux.

### Casos de uso principales

- mantener dataset y periodo activos;
- transportar filtros globales entre vistas;
- llevar contexto desde **Modelos** hacia **Predicciones**;
- persistir intención de navegación y trazabilidad.

### Persistencia

El store guarda su contenido en `localStorage` mediante la clave:

```text
NC_APP_FILTERS_V1
```

Esto permite conservar estado básico al recargar la aplicación.

---

## 8. Capa de servicios

La carpeta `src/services/` concentra la comunicación con el backend.

La arquitectura actual sigue un patrón claro:

- un **cliente base** de HTTP;
- módulos especializados por dominio funcional;
- tipos y helpers para query params, errores y endpoints.

## 8.1 Cliente base

### `src/services/apiClient.ts`

Es el wrapper principal sobre `fetch`.

### Responsabilidades

- resolver la URL base desde variables de entorno;
- manejar métodos HTTP comunes;
- serializar JSON o `FormData`;
- enriquecer errores HTTP;
- soportar timeout;
- adjuntar `X-Correlation-Id` en escenarios definidos;
- ofrecer una interfaz consistente tipo cliente API.

### Variables de entorno soportadas

- `VITE_API_BASE`
- `VITE_API_URL`

Si no existen, usa por defecto:

```text
http://127.0.0.1:8000
```

---

## 8.2 `src/services/api.ts`

Es un cliente mínimo o utilitario de compatibilidad.

Incluye funciones simples como `pingDatos()` y `pingJobs()` y expone `API_BASE`.

Su rol es más auxiliar que central frente a `apiClient.ts`.

---

## 8.3 `src/services/endpoints.ts`

Centraliza varias rutas backend para evitar strings hardcodeados en componentes.

### Dominios mapeados actualmente

- `datos`
- `jobs`
- `modelos`
- `prediccion`
- `admin`

Esto facilita consistencia entre vistas y reduce errores de rutas repetidas.

---

## 8.4 Servicios por dominio

### `src/services/datos.ts`

Cliente del flujo de datos.

### Qué cubre

- esquema esperado;
- validación previa;
- upload de datasets;
- resumen del dataset;
- sentimientos del dataset.

Además define tipos ricos para:

- esquema,
- validación,
- resumen,
- sentimientos.

### `src/services/jobs.ts`

Servicio orientado a jobs del flujo de datos, especialmente BETO.

### Qué cubre

- lanzar job BETO;
- consultar estado de job;
- listar jobs recientes;
- transportar metadatos asociados al preprocesamiento.

### `src/services/modelos.ts`

Servicio de la pestaña Modelos.

### Qué cubre

- entrenamiento;
- consulta de estado;
- listado de runs;
- detalle de run;
- campeón activo;
- y otras operaciones asociadas al ciclo de vida del modelado.

### `src/services/prediccion.ts`

Servicio del flujo de inferencia directa.

### Qué cubre

- predicción online;
- predicción batch en endpoints del dominio `prediccion`.

### `src/services/predicciones.ts`

Servicio complementario del dominio `predicciones`.

### Qué cubre

- exploración y gestión de resultados persistidos;
- catálogos, listados o artefactos relacionados con inferencia según la
  capacidad expuesta por backend.

### `src/services/dashboard.ts`

Servicio especializado del Dashboard.

### Qué cubre

- estado del histórico;
- periodos;
- catálogos;
- KPIs;
- series temporales;
- sentimiento;
- y otras visualizaciones agregadas del panel institucional.

### `src/services/adminCleanup.ts`

Servicio técnico asociado a tareas de limpieza administrativa de artefactos.

### `src/services/http.ts`

Agrupa utilidades HTTP auxiliares empleadas por la capa de servicios.

---

## 9. Tipos de dominio

### `src/types/neurocampus.ts`

Este archivo centraliza tipos compartidos del dominio frontend.

### Propósito

Evitar acoplar la representación del backend directamente a los componentes de
UI, y proveer contratos reutilizables para:

- datasets;
- validación;
- resumen;
- sentimientos;
- jobs;
- runs de modelos;
- champion;
- predicción online y batch;
- placeholders del dashboard.

Esto ayuda a que la capa visual consuma modelos de datos conocidos y reduce la
duplicidad de interfaces en componentes aislados.

---

## 10. Estilos

### `src/styles/index.css`

Define los estilos globales del frontend.

### Características visuales actuales

- paleta oscura como base del sistema;
- layout full-height;
- tarjetas y paneles con contraste alto;
- composición visual orientada a dashboard analítico.

La estética del sistema está alineada con un panel de monitoreo técnico y no
con una web pública convencional.

---

## 11. Estrategia de pruebas

El frontend ya incluye base de pruebas automatizadas.

### Archivos relevantes

- `src/setupTests.ts`
- `src/services/datos.test.ts`

### Herramientas

- **Vitest**
- **Testing Library**
- **jsdom**

### Enfoque actual

La cobertura visible está más orientada a capa de servicios que a una batería
completa de pruebas de interacción de cada pantalla.

Esto es coherente con una arquitectura donde buena parte del riesgo funcional
está en:

- contratos con backend,
- parsing de payloads,
- y sincronización de estados.

---

## 12. Flujo arquitectónico general

De forma resumida, el flujo del frontend es el siguiente:

1. `main.tsx` monta la aplicación.
2. `App.tsx` entrega el control al router.
3. `Router.tsx` selecciona la página según la URL.
4. `AppShell.tsx` compone layout y navegación.
5. La página renderiza su componente de pestaña.
6. La pestaña consume servicios del dominio correspondiente.
7. Los servicios usan `apiClient.ts` para hablar con el backend.
8. Parte del contexto compartido se conserva en `appFilters.store.ts`.

---

## 13. Decisiones arquitectónicas visibles en la versión actual

### 1. UI centrada en pestañas grandes

El sistema prioriza cuatro áreas funcionales amplias en lugar de muchas rutas
pequeñas.

### 2. Pages delgadas, tabs gruesas

La lógica principal vive en los componentes de pestaña y no en wrappers de ruta.

### 3. Estado global mínimo

Se evita una solución de estado más pesada y se usa un store simple para los
filtros y el contexto compartido.

### 4. Servicios por dominio

Cada área funcional tiene su propia capa de llamadas API, lo que mejora
mantenibilidad y documentación.

### 5. Integración progresiva con backend

La UI está diseñada para convivir con endpoints completamente operativos y con
zonas aún en consolidación, usando estados de carga, fallback o degradación
controlada cuando hace falta.

---

## 14. Alcance real de la arquitectura frontend actual

La arquitectura actual ya soporta de forma coherente:

- navegación principal del producto;
- operación de datos;
- monitoreo agregado en dashboard;
- gestión de modelos;
- ejecución de predicciones;
- compartición básica de contexto entre pantallas.

Todavía no refleja una aplicación con:

- autenticación completa en frontend;
- módulos de usuario avanzados;
- internacionalización;
- separación por microfrontends;
- o una capa de diseño sistematizada formalmente.

Es una arquitectura **compacta, funcional y orientada al dominio**, suficiente
para el estado actual de NeuroCampus.