# Endpoints de predicción directa

La API de **predicción directa** agrupa endpoints de inferencia inmediata bajo el
prefijo:

- `/prediccion`

Esta sección documenta el router orientado a predicción **online** y
predicción **batch** ligera. Su objetivo es resolver inferencia rápida a partir

- de un payload JSON en línea, o
- de un archivo cargado en la petición.

A diferencia del router `predicciones`, este módulo **no** gestiona listados de
runs persistidos, feature-packs, champion browsing ni descargas de outputs. Su
alcance está centrado en ejecutar inferencia directamente mediante el facade de
predicción.

---

## Resumen de endpoints

| Método | Ruta                | Descripción |
| ------ | ------------------- | ----------- |
| POST   | `/prediccion/online` | Ejecuta predicción online con payload JSON |
| POST   | `/prediccion/batch`  | Ejecuta predicción batch ligera a partir de un archivo |

---

## `POST /prediccion/online`

### Descripción

Ejecuta una predicción online a partir de un cuerpo JSON validado por el schema
`PrediccionOnlineRequest`.

Este endpoint está pensado para escenarios donde el cliente ya dispone de los
atributos de entrada en memoria y necesita una respuesta inmediata sin generar
artefactos persistidos.

### Comportamiento real del endpoint

El router:

1. recibe un request tipado con `PrediccionOnlineRequest`;
2. serializa el payload con `model_dump()` o `dict()` según compatibilidad;
3. llama al facade `predict_online(...)`;
4. convierte la salida a un formato seguro para JSON;
5. devuelve la respuesta como `JSONResponse`.

También intenta capturar y serializar correctamente tipos no nativos como:

- `numpy.integer`
- `numpy.floating`
- `numpy.ndarray`
- `torch.Tensor` (si `torch` está disponible)

Esto evita errores de serialización frecuentes en respuestas de inferencia.

### Entrada

- Método: `POST`
- Content-Type: `application/json`
- Cuerpo: `PrediccionOnlineRequest`

El detalle exacto del schema depende de `neurocampus.app.schemas.prediccion`,
pero conceptualmente el payload representa una observación individual para la
que se desea inferencia inmediata.

### Reglas de decisión internas

El módulo define una lógica auxiliar de decisión costo-sensible sobre
probabilidades de clase:

- prioriza **pos** si `p_pos >= 0.55`;
- favorece **neg** si `p_neg >= 0.35`;
- o si `p_neg - p_neu >= 0.05`;
- en otro caso, cae en **neu**.

Actualmente esa lógica está implementada como helper interno, pero el endpoint
`/online` delega la inferencia principal al facade `predict_online(...)`.

### Respuesta

- Código `200 OK` en caso de éxito.
- Cuerpo JSON compatible con `PrediccionOnlineResponse`.

El contrato exacto depende del facade, pero la respuesta se devuelve ya
normalizada para evitar problemas de codificación de tipos numéricos.

### Errores esperados

- `500 Internal Server Error`
  - si el facade de predicción falla;
  - si ocurre una excepción durante la inferencia.

A diferencia de un 500 genérico opaco, este endpoint construye un `detail`
JSON con forma similar a:

```json
{
  "detail": "prediction_failed",
  "error": "mensaje del error"
}
```

Si la variable de entorno `NEUROCAMPUS_DEBUG=1` está habilitada, puede incluir
además un traceback en la respuesta de error.

---

## `POST /prediccion/batch`

### Descripción

Ejecuta una predicción batch ligera a partir de un archivo subido en la misma
petición.

Este endpoint está pensado como una variante mínima de inferencia por lote,
separada del sistema más completo de runs persistidos del router
`/predicciones`.

### Entrada

- Método: `POST`
- Content-Type: `multipart/form-data`
- Campo soportado:
  - `file` (opcional en la firma, pero esperado en el flujo principal)

### Formato esperado del archivo

Cuando se envía `file`, el código actual lee el contenido con `pandas.read_csv`
y espera columnas con esta forma conceptual:

- `id`
- `comentario`
- `pregunta_1` ... `pregunta_10`

### Adaptación interna

Por cada fila del CSV, el endpoint construye un item con estructura lógica como:

```json
{
  "id": "...",
  "comentario": "...",
  "calificaciones": {
    "pregunta_1": 4.0,
    "pregunta_2": 3.0
  }
}
```

Luego delega la inferencia al facade:

- `predict_batch(items, correlation_id=...)`

### Respuesta

- Código `201 Created` en caso de éxito.
- Cuerpo compatible con `PrediccionBatchResponse`.

El endpoint retorna directamente el `summary` devuelto por `predict_batch(...)`.

### Alcance actual y limitaciones

El propio código deja explícito que esta implementación es una **variante
mínima**.

Hoy no documenta ni implementa completamente:

- resolución de `data_ref` en JSON;
- persistencia de outputs batch;
- polling de jobs;
- reglas costo-sensibles aplicadas a cada ítem de salida.

Existe un comentario `TODO` para extender la entrada a escenarios con JSON y
adapters más generales.

### Errores probables

Aunque el endpoint no envuelve todas las excepciones con un manejo tan explícito
como `/prediccion/online`, pueden aparecer errores por:

- archivo CSV inválido;
- columnas faltantes;
- tipos no convertibles a `float` en `pregunta_*`;
- fallos internos del facade `predict_batch(...)`.

Dependiendo del punto del fallo, FastAPI puede responder con:

- `422 Unprocessable Entity`
- `500 Internal Server Error`

---

## Diferencia entre `/prediccion` y `/predicciones`

Aunque sus nombres son parecidos, ambos routers cumplen funciones distintas.

### `/prediccion`

Se usa para:

- inferencia directa online;
- batch simple cargado en la misma petición;
- respuestas inmediatas sin pipeline completo de artefactos.

### `/predicciones`

Se usa para:

- listar datasets y runs disponibles;
- resolver docentes y materias desde feature-pack;
- ejecutar predicción individual sobre pares docente–materia;
- lanzar jobs batch persistidos;
- consultar estado de jobs batch;
- descargar outputs persistidos;
- inspeccionar bundles de modelo (`model-info`, `predict`).

Por tanto, este archivo documenta únicamente el router **ligero** de
predicción directa.

---

## Relación con otros módulos

El router `/prediccion` se apoya principalmente en:

- `neurocampus.app.schemas.prediccion`
- `neurocampus.prediction.facades.prediccion_facade`

Esto implica que el contrato funcional real depende del facade y de los schemas
Pydantic asociados. Si esos contratos cambian, esta página debe actualizarse.
