import { DATASETS } from "@/components/models/mockData";

/**
 * Convierte el identificador de dataset usado por la UI legacy (`ds_2025_1`)
 * al identificador canónico consumido por backend (`2025-1`).
 *
 * Si el dataset ya está en formato backend, se devuelve sin cambios.
 */
export function normalizeDatasetIdForBackend(datasetId: string): string {
  const fromCatalog = DATASETS.find((entry) => entry.id === datasetId);
  if (fromCatalog?.period) return fromCatalog.period;

  const match = /^ds_(\d{4})_(\d+)$/.exec(datasetId);
  if (match) return `${match[1]}-${match[2]}`;

  return datasetId;
}

/**
 * Convierte el identificador canónico del backend al formato histórico de la UI.
 *
 * Esta función permite que las subpestañas de Modelos sigan operando sobre los
 * mocks y filtros actuales sin perder compatibilidad con el backend real.
 */
export function normalizeDatasetIdForUi(datasetId: string): string {
  const fromCatalog = DATASETS.find((entry) => entry.period === datasetId);
  if (fromCatalog?.id) return fromCatalog.id;

  const match = /^(\d{4})-(\d+)$/.exec(datasetId);
  if (match) return `ds_${match[1]}_${match[2]}`;

  return datasetId;
}

/**
 * Devuelve ambas representaciones del dataset para evitar duplicar reglas de
 * normalización en componentes y adapters.
 */
export function buildDatasetIdBridge(datasetId: string): {
  uiDatasetId: string;
  backendDatasetId: string;
} {
  return {
    uiDatasetId: normalizeDatasetIdForUi(datasetId),
    backendDatasetId: normalizeDatasetIdForBackend(datasetId),
  };
}
