import { DATASETS } from "@/components/models/mockData";

/**
 * Identificador canónico reservado para el dataset histórico unificado.
 *
 * Se usa como dataset sintético de primera clase tanto en Modelos como en
 * Predicciones. Mantenerlo centralizado evita que cada subpestaña implemente
 * excepciones distintas para resolver el histórico.
 */
export const HISTORICAL_DATASET_ID = "historico-unificado";

/**
 * Indica si un dataset representa al histórico unificado.
 *
 * Acepta tanto el identificador canónico actual como alias legacy razonables
 * para mantener compatibilidad durante la transición del frontend.
 */
export function isHistoricalDatasetId(datasetId: string): boolean {
  const normalized = datasetId.trim().toLowerCase();
  return normalized === HISTORICAL_DATASET_ID || normalized === "historico_unificado";
}

/**
 * Convierte el identificador de dataset usado por la UI legacy (`ds_2025_1`)
 * al identificador canónico consumido por backend (`2025-1`).
 *
 * Si el dataset ya está en formato backend, se devuelve sin cambios. El
 * dataset histórico se preserva siempre como `historico-unificado`.
 */
export function normalizeDatasetIdForBackend(datasetId: string): string {
  if (isHistoricalDatasetId(datasetId)) return HISTORICAL_DATASET_ID;

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
 * Para el histórico unificado se conserva el identificador canónico porque no
 * existe una contraparte en `mockData`.
 */
export function normalizeDatasetIdForUi(datasetId: string): string {
  if (isHistoricalDatasetId(datasetId)) return HISTORICAL_DATASET_ID;

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
