# Scripts utilitarios del proyecto

Este directorio reúne scripts auxiliares para **operación local**, **smoke tests**,
**mantenimiento** y **experimentación** alrededor de NeuroCampus.

No todos los scripts forman parte del flujo principal de la aplicación. Algunos
son operativos y vigentes, mientras que otros cumplen un papel de apoyo para QA,
debug o pruebas manuales.

---

## Criterios de uso

Los scripts de esta carpeta deben seguir estas reglas generales:

- ejecutarse desde la **raíz del repositorio**;
- evitar rutas absolutas hardcodeadas;
- no incluir credenciales ni secretos;
- producir salidas claras para facilitar su uso en QA o soporte;
- ser idempotentes o, cuando no lo sean, dejar explícito su efecto.

En varios casos es recomendable definir también:

```bash
PYTHONPATH=backend/src
```

para que los módulos del backend se resuelvan correctamente.

---

## Estado actual del directorio

En la versión actual del repositorio, el directorio `scripts/` contiene scripts
reales para cuatro propósitos principales:

1. **mantenimiento y limpieza**;
2. **smoke tests y validaciones rápidas**;
3. **entrenamiento y experimentación manual**;
4. **utilidades auxiliares para frontend o simulación**.

---

## 1. Mantenimiento y limpieza

### `cleanup.py`

Script de limpieza operativa del proyecto.

### Propósito

Permite inventariar y limpiar artefactos antiguos del repositorio, especialmente
bajo rutas como:

- `artifacts/`
- `.tmp`
- `data/tmp`
- `jobs`

En lugar de borrar directamente los archivos, el script puede moverlos a una
papelera temporal (`.trash`) para permitir recuperación dentro de un período de
retención.

### Casos de uso

- reducir acumulación de artefactos viejos;
- mantener liviano el directorio de trabajo;
- revisar candidatos a limpieza antes de ejecutar borrado efectivo;
- soporte de la API administrativa `/admin/cleanup*`.

### Observación importante

Este script no es solo una utilidad manual: el router administrativo del backend
lo reutiliza como base funcional para los endpoints de limpieza.

---

## 2. Smoke tests y validaciones rápidas

### `dashboard_smoke_test.py`

Smoke test HTTP para la API del dashboard.

### Propósito

Ejecuta un conjunto mínimo de requests contra endpoints de `/dashboard` y falla
si alguno responde con error o con payload no válido.

### Cuándo usarlo

- después de cambios en el router `dashboard`;
- tras ajustes en filtros, agregaciones o endpoints de series/rankings;
- para comprobar rápidamente que el backend sigue respondiendo desde la óptica
  del frontend.

### Requisito práctico

Debe ejecutarse con el backend levantado.

Ejemplo típico:

```bash
PYTHONPATH=backend/src python scripts/dashboard_smoke_test.py
```

---

### `test_unificacion_quick.py`

Prueba rápida de la estrategia de unificación histórica.

### Propósito

Construye un escenario mínimo de prueba para verificar que la lógica de
unificación produce correctamente el artefacto histórico esperado.

### Cuándo usarlo

- al tocar `UnificacionStrategy`;
- al validar cambios en `historico/unificado.parquet`;
- en pruebas manuales de regresión del flujo histórico.

### Observación

Es un script de smoke test técnico, no una herramienta para usuarios finales.

---

## 3. Entrenamiento y experimentación manual

Estos scripts son útiles para pruebas locales y exploración manual, pero **no
sustituyen** el flujo recomendado actual basado en la API `/modelos/*`.

La ruta principal vigente del sistema para entrenamiento, sweep, champion y
estado de corridas es el router de **Modelos** del backend.

### `train_rbm_general.py`

Entrenamiento manual de la estrategia **RBM General**.

### Propósito

Permite entrenar una variante RBM directamente desde un dataset local sin pasar
por FastAPI.

### Cuándo usarlo

- para pruebas exploratorias;
- para debugging de la estrategia;
- para comparar resultados manuales con el pipeline API;
- para aislar fallos de entrenamiento fuera de la aplicación web.

### Salidas típicas

Puede generar artefactos bajo un directorio de salida indicado por el usuario,
por ejemplo pesos del modelo, metadatos y configuraciones auxiliares.

### Estado dentro del proyecto

Se considera un script de **experimentación/soporte técnico**, no el flujo
principal de operación del producto.

---

### `train_rbm_pura.py`

Entrenamiento manual de una RBM no supervisada.

### Propósito

Permite trabajar con una variante puramente no supervisada para exploración,
reducción de dimensionalidad o experimentación fuera del pipeline estándar.

### Cuándo usarlo

- para investigación y pruebas técnicas;
- para comparar representaciones latentes;
- para ensayos fuera del flujo productivo de `modelos/entrenar`.

### Estado dentro del proyecto

Es un script **auxiliar y experimental**.

No representa el flujo recomendado actual para entrenamiento productivo dentro
NeuroCampus.

---

## 4. Utilidades auxiliares

### `stripImportVersions.mjs`

Utilidad de mantenimiento del frontend.

### Propósito

Recorre archivos fuente del frontend y elimina sufijos de versión en imports
cuando estos aparecen incrustados en los specifiers.

### Cuándo usarlo

- al corregir imports generados o copiados desde fuentes externas;
- cuando aparezcan imports del tipo `paquete@1.2.3` dentro del código fuente;
- durante limpieza o normalización del árbol `frontend/src`.

### Observación

Este script **no forma parte del runtime** del backend ni del pipeline de datos.
Es una utilidad de saneamiento de código frontend.

---

### `sim/generate_synthetic.py`

Generador de dataset sintético.

### Propósito

Crea datos tabulares artificiales compatibles con el pipeline de NeuroCampus,
con columnas de calificaciones, probabilidades de sentimiento y etiqueta de
teacher simulada.

### Cuándo usarlo

- para demos internas;
- para pruebas sin usar datos reales;
- para validar flujos de entrenamiento o inferencia en entorno controlado;
- para QA reproducible cuando no se desea trabajar con datasets sensibles.

---

## Qué scripts son principales hoy

Si se mira el uso real del repositorio, los scripts más relevantes y vigentes de
esta carpeta son:

- `cleanup.py`
- `dashboard_smoke_test.py`
- `test_unificacion_quick.py`
- `sim/generate_synthetic.py`

Los scripts `train_rbm_general.py` y `train_rbm_pura.py` siguen siendo útiles,
pero deben entenderse como apoyo técnico o experimental, no como interfaz
operativa principal del sistema.

---

## Relación con el backend actual

En la versión vigente del proyecto:

- la **carga y procesamiento de datos** se gestiona principalmente desde
  `/datos` y `/jobs`;
- el **entrenamiento, sweep, readiness, runs y champion** se gestionan desde
  `/modelos`;
- la **limpieza administrativa** se apoya en `cleanup.py` mediante
  `/admin/cleanup`.

Por tanto, la carpeta `scripts/` debe verse como una colección de utilidades de
soporte alrededor del sistema, no como el centro del flujo funcional de la
aplicación.

---

## Recomendación de mantenimiento

Cada vez que se agregue, elimine o depreque un script en este directorio, este
README debe actualizarse para reflejar:

- nombre real del script;
- propósito;
- vigencia;
- relación con el flujo principal del producto.

Esto evita que el directorio quede documentado con scripts “previstos” o
históricos que ya no coinciden con el contenido real del repositorio.
