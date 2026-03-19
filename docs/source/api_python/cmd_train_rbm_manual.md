# `cmd_train_rbm_manual`

Esta página documenta de forma manual el job
`neurocampus.app.jobs.cmd_train_rbm_manual` para mantener la cobertura del
sitio sin depender de imports internos del backend durante el build de Sphinx.

## Propósito

Este comando entrena un modelo manual sobre un dataset ya preprocesado y
genera un reporte JSON con parámetros y métricas de reconstrucción.

Soporta dos modos:

- `rbm`: entrenamiento con `RestrictedBoltzmannMachine` y `RBMTrainer`.
- `bm`: entrenamiento con `BMManualStrategy`.

## Flujo general

1. Cargar un archivo de entrada en `.parquet` o `.csv`.
2. Seleccionar columnas numéricas y convertirlas a `float32`.
3. Entrenar el modelo indicado por `--model`.
4. Calcular el error de reconstrucción.
5. Generar un reporte JSON en el directorio de salida.

## Parámetros principales

- `--in`: ruta del dataset de entrada.
- `--out-dir`: directorio donde se escriben reportes y métricas.
- `--model`: tipo de modelo a entrenar (`rbm` o `bm`).
- `--n-hidden`: número de neuronas ocultas.
- `--lr`: tasa de aprendizaje.
- `--epochs`: número máximo de épocas.
- `--batch-size`: tamaño de lote.
- `--seed`: semilla para reproducibilidad.
- `--l2`: regularización L2.
- `--clip-grad`: clipping de gradiente.
- `--binarize-input`: activa binarización de entrada.
- `--input-bin-threshold`: umbral de binarización.
- `--cd-k`: pasos de Gibbs para entrenamiento contrastivo.
- `--pcd`: activa Persistent Contrastive Divergence.

## Salida

El job escribe un archivo `report_<model>.json` con:

- dataset de entrada,
- tipo de modelo,
- hiperparámetros,
- métricas de reconstrucción,
- historial del entrenador cuando aplica.

## Uso de referencia

```bash
PYTHONPATH="backend/src" python -m neurocampus.app.jobs.cmd_train_rbm_manual \
  --in data/prep_auto/dataset_ejemplo.parquet \
  --out-dir reports \
  --model rbm \
  --n-hidden 64 \
  --lr 0.01 \
  --epochs 10 \
  --batch-size 64
```
