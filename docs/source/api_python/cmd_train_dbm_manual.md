# `cmd_train_dbm_manual`

Job CLI orientado al entrenamiento manual de un modelo DBM sobre un dataset ya
preprocesado.

## Propósito

Este comando encapsula el flujo de entrenamiento de la variante DBM manual y
permite ejecutar experimentos reproducibles desde línea de comandos.

## Flujo general

1. Cargar el dataset de entrada.
2. Preparar la matriz numérica utilizada por el modelo.
3. Configurar hiperparámetros de la DBM.
4. Ejecutar el entrenamiento por épocas y lotes.
5. Persistir métricas y reportes en el directorio de salida.

## Parámetros típicos

- `--in`: dataset de entrada.
- `--out-dir`: carpeta de reportes.
- `--n-hidden1`: tamaño de la primera capa oculta.
- `--n-hidden2`: tamaño de la segunda capa oculta.
- `--lr`: tasa de aprendizaje.
- `--cd-k`: pasos de Gibbs.
- `--epochs`: número de épocas.
- `--batch-size`: tamaño de lote.

## Uso de referencia

```bash
PYTHONPATH="backend/src" python -m neurocampus.app.jobs.cmd_train_dbm_manual \
  --in data/prep_auto/dataset_ejemplo.parquet \
  --out-dir reports/dbm_manual \
  --n-hidden1 64 \
  --n-hidden2 32 \
  --lr 0.01 \
  --epochs 10
```
