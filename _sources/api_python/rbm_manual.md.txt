# `neurocampus.models.rbm_manual`

Implementación manual de la variante RBM utilizada en el pipeline experimental
de NeuroCampus.

## Elementos relevantes

- `RestrictedBoltzmannMachine`: modelo principal para entrenamiento y
  reconstrucción.
- alias y compatibilidades mantenidas para flujos manuales previos.

## Capacidades expuestas

- entrenamiento por divergencia contrastiva,
- transformación al espacio oculto,
- reconstrucción de entradas,
- configuración de hiperparámetros para experimentos reproducibles.

## Relación con la documentación

- La base teórica se amplía en [Restricted RBM](../teoria/restricted_bm).
- El uso operativo aparece en [Modelos](../manual/modelos).
