# `neurocampus.models.hparam_search`

Módulo utilitario para búsqueda de hiperparámetros sobre modelos de la familia
Boltzmann en NeuroCampus.

## Propósito

Centraliza la ejecución de barridos y experimentos controlados para comparar
configuraciones de entrenamiento.

## Responsabilidades

- leer configuración de búsqueda,
- lanzar ejecuciones con distintas combinaciones de hiperparámetros,
- registrar resultados y métricas comparables,
- facilitar la selección de configuraciones candidatas.

## Uso esperado

Se invoca desde flujos de experimentación y targets del `Makefile` asociados a
auditoría y búsqueda.
