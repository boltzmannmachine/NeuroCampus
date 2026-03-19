# `neurocampus.models.bm_manual`

Implementación manual de una Máquina de Boltzmann binaria usada como base para
experimentos y estrategias legacy dentro de NeuroCampus.

## Elemento principal

- `BoltzmannMachine`: modelo con capas visibles y ocultas, con soporte para
  entrenamiento aproximado y reconstrucción de entradas.

## Capacidades expuestas

- ajuste del modelo sobre matrices numéricas,
- proyección al espacio oculto,
- reconstrucción de observaciones,
- configuración de regularización, clipping y binarización de entrada.

## Relación con el sistema

Este módulo es consumido indirectamente por estrategias manuales y jobs de
entrenamiento documentados en esta misma sección.
