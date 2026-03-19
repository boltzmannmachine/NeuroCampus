# Endpoints de administración

La API de administración agrupa operaciones de **inventario**, **limpieza** y
**consulta de logs** relacionadas con datasets, jobs y artefactos del sistema.

En la implementación actual, estos endpoints viven en el router
`admin_cleanup.py` y exponen rutas absolutas bajo el espacio:

- `/admin/cleanup/*`

A diferencia de otros routers, en `main.py` este router se registra **sin
prefix adicional**, por lo que las rutas documentadas aquí son las rutas finales
que recibe el cliente.

---

## Consideraciones de autenticación

Los tres endpoints del router dependen de `require_admin`.

### Comportamiento actual

- Si la variable de entorno `NC_DISABLE_ADMIN_AUTH=1` está activa,
  la validación de autenticación se desactiva.
- Si no está activa:
  - el cliente debe enviar un header `Authorization: Bearer <token>`;
  - si el header falta o no usa el esquema `Bearer`, el backend responde `401`.

### Importante

En la implementación actual, el backend **no valida el valor exacto del token**
una vez que el header `Bearer` está presente. Es decir, hoy el control efectivo
comprueba la presencia del esquema `Bearer`, no la igualdad contra un token
específico.

Esto debe interpretarse como una implementación de control administrativo en
estado de desarrollo o compatibilidad, no como un esquema de seguridad robusto
para producción.

---

## Resumen de endpoints

| Método | Ruta                        | Descripción |
| ------ | --------------------------- | ----------- |
| GET    | `/admin/cleanup/inventory`  | Calcula inventario y candidatos de limpieza en modo simulación |
| POST   | `/admin/cleanup`            | Ejecuta o simula la limpieza según el payload recibido |
| GET    | `/admin/cleanup/logs`       | Devuelve las últimas líneas del log de limpieza |

---

## `GET /admin/cleanup/inventory`

### Descripción

Devuelve un inventario de artefactos y candidatos de limpieza.

Este endpoint siempre opera en **modo simulación** (`dry_run=True`), por lo que:

- no borra archivos;
- no mueve elementos a papelera;
- no altera el estado persistido del sistema.

Su objetivo es permitir al usuario o a la interfaz administrativa inspeccionar
el impacto potencial de una limpieza antes de ejecutarla.

### Parámetros de query

- `retention_days`:
  - entero mayor o igual a `0`;
  - valor por defecto: `90`.
- `keep_last`:
  - entero mayor o igual a `0`;
  - valor por defecto: `3`.
- `exclude_globs`:
  - string opcional;
  - acepta patrones separados por coma, por ejemplo:
    - `artifacts/champions/**,*.keep`

### Ejemplo conceptual

```text
GET /admin/cleanup/inventory?retention_days=120&keep_last=5
Authorization: Bearer dev-admin-token
```

### Respuesta

Devuelve el resultado de `run_cleanup(...)` en modo simulación.

La forma exacta del JSON depende de la implementación del script de limpieza,
pero conceptualmente incluye:

- inventario inspeccionado;
- candidatos a limpieza;
- conteos agregados;
- criterios usados para calcular el resultado.

### Códigos relevantes

- `200 OK`: inventario calculado correctamente.
- `401 Unauthorized`: falta el header `Bearer` y la autenticación no está desactivada.

---

## `POST /admin/cleanup`

### Descripción

Ejecuta el flujo de limpieza administrativa.

Este endpoint soporta dos comportamientos principales:

- **simulación** si `dry_run=true`;
- **ejecución efectiva** si `dry_run=false`.

Adicionalmente, el comportamiento de borrado/movimiento depende del valor de
`force` y de la lógica implementada por `run_cleanup(...)`.

### Cuerpo de la petición

El payload corresponde al modelo `CleanupRequest`.

#### Campos soportados

- `retention_days`:
  - entero `>= 0`;
  - default: `90`.
- `keep_last`:
  - entero `>= 0`;
  - default: `3`.
- `exclude_globs`:
  - string opcional con globs separados por coma.
- `dry_run`:
  - booleano;
  - default: `true`.
- `force`:
  - booleano;
  - default: `false`.
- `trash_dir`:
  - string;
  - default: `.trash`.
- `trash_retention_days`:
  - entero `>= 0`;
  - default: `14`.

### Ejemplo de payload

```json
{
  "retention_days": 90,
  "keep_last": 3,
  "exclude_globs": "artifacts/champions/**,*.keep",
  "dry_run": true,
  "force": false,
  "trash_dir": ".trash",
  "trash_retention_days": 14
}
```

### Comportamiento

El endpoint delega la operación al script `scripts/cleanup.py` mediante la
función `run_cleanup(...)`.

Eso significa que la semántica final de la limpieza depende del script de
soporte, pero desde la API HTTP el contrato funcional actual es:

- calcular candidatos según política de retención;
- respetar exclusiones por glob;
- soportar simulación (`dry_run`);
- soportar ejecución forzada (`force`);
- usar una carpeta de papelera lógica (`trash_dir`) cuando aplique.

### Respuesta

Devuelve directamente el resultado de `run_cleanup(...)`.

En términos funcionales, la respuesta suele incluir:

- criterios usados en la ejecución;
- recursos afectados o candidatos;
- conteos de elementos procesados;
- detalle de elementos eliminados, movidos o preservados, según el modo.

### Códigos relevantes

- `200 OK`: operación aceptada y procesada.
- `401 Unauthorized`: falta el header `Bearer` y la autenticación no está desactivada.
- `422 Unprocessable Entity`: payload inválido según el modelo `CleanupRequest`.

---

## `GET /admin/cleanup/logs`

### Descripción

Devuelve las últimas líneas del archivo de log de limpieza generado por el
script administrativo.

El endpoint lee el archivo apuntado por `LOG_FILE` y devuelve una porción final
acotada por el parámetro `limit`.

### Parámetros de query

- `limit`:
  - entero entre `1` y `5000`;
  - default: `200`.

### Comportamiento

- si el archivo de log no existe, devuelve:

```json
{
  "lines": []
}
```

- si existe, devuelve las últimas `N` líneas del archivo.

### Respuesta

Respuesta JSON con la forma:

```json
{
  "lines": [
    "...",
    "..."
  ]
}
```

### Códigos relevantes

- `200 OK`: lectura correcta del log o log inexistente tratado como vacío.
- `401 Unauthorized`: falta el header `Bearer` y la autenticación no está desactivada.
- `422 Unprocessable Entity`: `limit` fuera del rango permitido.

---

## Consideraciones operativas

### 1. Router registrado sin prefijo adicional

Aunque en `main.py` el router se registra sin `prefix`, las rutas finales ya
incluyen `/admin/cleanup/...` porque ese segmento está declarado directamente en
las anotaciones de ruta del archivo `admin_cleanup.py`.

### 2. Dependencia de `scripts/cleanup.py`

El comportamiento real de inventario y limpieza está externalizado en el script:

- `scripts/cleanup.py`

Por ello, esta documentación describe el **contrato HTTP** y la intención
funcional del router, mientras que la lógica exacta de selección y eliminación
se define en ese script.

### 3. Uso recomendado

Este router está pensado para:

- tareas de mantenimiento técnico;
- limpieza controlada de artefactos;
- inspección del estado del sistema antes de borrar recursos;
- revisión de logs administrativos.

No está pensado como parte del flujo funcional normal de un usuario final.

---

## Relación con otras áreas del sistema

Los endpoints de administración impactan indirectamente en:

- **Datos**
  - si se eliminan datasets o artefactos intermedios.
- **Jobs**
  - si se limpian registros o salidas antiguas.
- **Modelos**
  - si se eliminan artefactos de entrenamiento, campeones o resultados previos.
- **Dashboard** y **Predicciones**
  - si la limpieza afecta históricos, artefactos persistidos o salidas necesarias.

Por eso su uso debe considerarse una operación de mantenimiento con impacto
transversal sobre el proyecto.
