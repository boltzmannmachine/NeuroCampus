# `cmd_preprocesar_beto`

Job CLI para preparar datasets textuales y enriquecerlos con señales de PLN.

## Propósito

Este comando toma un dataset tabular, detecta columnas de texto, limpia y
normaliza comentarios, ejecuta inferencia con BETO y puede generar
representaciones adicionales para el pipeline de modelos.

## Responsabilidades principales

- detectar una o varias columnas de texto,
- limpiar y lematizar comentarios,
- aplicar la política de manejo de texto vacío,
- ejecutar clasificación de sentimiento con BETO,
- generar artefactos de salida en formato tabular y metadatos de auditoría.

## Entradas relevantes

- archivo de entrada en `.csv` o formato tabular soportado,
- selección automática o explícita de columnas de texto,
- configuración de BETO,
- umbrales de aceptación y política para comentarios vacíos.

## Salidas esperadas

- dataset enriquecido con etiquetas y probabilidades de sentimiento,
- columnas derivadas para uso posterior en entrenamiento,
- archivos de metadatos para auditoría del proceso.

## Uso de referencia

```bash
PYTHONPATH="backend/src" python -m neurocampus.app.jobs.cmd_preprocesar_beto \
  --in data/processed/evaluaciones_2025.parquet \
  --out data/labeled/evaluaciones_2025_beto.parquet
```

## Relación con otras secciones

- La lógica funcional del flujo de datos está descrita en [Datos](../manual/datos).
- El pipeline general del backend se resume en [Pipeline de modelos](../arquitectura/pipeline_modelos).
