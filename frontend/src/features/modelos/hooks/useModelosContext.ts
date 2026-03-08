// =============================================================================
// NeuroCampus — Feature Modelos: Hook de contexto (dataset/family/model)
// =============================================================================
//
// Este hook centraliza el estado de selección que la pestaña Modelos necesita
// (dataset_id, family, model_name) y lo sincroniza con el store global real.
//
// Principios:
// - Mantener la UI legacy de Modelos operando con IDs tipo `ds_2025_1`.
// - Mantener el store global en formato canónico backend (`2025-1`) para que
//   Predicciones y otras vistas compartan el mismo contrato.
// - Encapsular la traducción entre ambos formatos en un solo lugar.

import { useCallback, useEffect, useMemo } from "react";

import { getAppFilters, setAppFilters, useAppFilters } from "@/state/appFilters.store";

import { normalizeDatasetIdForBackend, normalizeDatasetIdForUi } from "../utils/datasetId";
import { type Family, type ModeloName } from "../types";

/**
 * Contrato mínimo del store global que este hook necesita.
 *
 * Se expone como API imperativa para mantener desacoplados los componentes de
 * UI y permitir que el hook siga siendo el único punto de sincronización.
 */
interface GlobalFiltersLike {
  getActiveDatasetId: () => string | null;
  setActiveDatasetId: (id: string) => void;

  getActiveFamily: () => Family | null;
  setActiveFamily: (family: Family) => void;

  getActiveModelName: () => ModeloName | null;
  setActiveModelName: (name: ModeloName) => void;
}

/**
 * Enlaza la pestaña Modelos con el store global real del proyecto.
 */
function bindGlobalFilters(): GlobalFiltersLike {
  return {
    getActiveDatasetId: () => getAppFilters().activeDatasetId,
    setActiveDatasetId: (id: string) => setAppFilters({ activeDatasetId: id }),

    getActiveFamily: () => (getAppFilters().selectedModelFamily as Family | null) ?? null,
    setActiveFamily: (family: Family) => setAppFilters({ selectedModelFamily: family }),

    getActiveModelName: () => (getAppFilters().selectedModelName as ModeloName | null) ?? null,
    setActiveModelName: (name: ModeloName) => setAppFilters({ selectedModelName: name }),
  };
}

/**
 * Estado expuesto por el hook de contexto de Modelos.
 */
export interface ModelosContextState {
  datasetId: string;
  family: Family;
  modelName: ModeloName;

  setDatasetId: (id: string) => void;
  setFamily: (family: Family) => void;
  setModelName: (name: ModeloName) => void;
}

/**
 * Hook para manejar dataset/family/model seleccionados en la pestaña Modelos.
 *
 * @param initialDatasetId dataset inicial (fallback).
 * @param initialFamily family inicial (fallback).
 * @param initialModelName modelo inicial (fallback).
 */
export function useModelosContext(params?: {
  initialDatasetId?: string;
  initialFamily?: Family;
  initialModelName?: ModeloName;
}): ModelosContextState {
  const global = useMemo(() => bindGlobalFilters(), []);

  const defaultDatasetId = normalizeDatasetIdForUi(params?.initialDatasetId ?? "2024-2");
  const defaultFamily: Family = params?.initialFamily ?? "sentiment_desempeno";
  const defaultModel: ModeloName = params?.initialModelName ?? "rbm_general";

  const globalDatasetId = useAppFilters((state) => state.activeDatasetId);
  const globalFamily = useAppFilters((state) => state.selectedModelFamily);
  const globalModelName = useAppFilters((state) => state.selectedModelName);

  const datasetId = normalizeDatasetIdForUi(globalDatasetId ?? defaultDatasetId);
  const family = (globalFamily as Family | null) ?? defaultFamily;
  const modelName = (globalModelName as ModeloName | null) ?? defaultModel;

  /**
   * Inicializa el store compartido una sola vez con defaults conservadores.
   *
   * Con esto evitamos que Modelos opere aislado de Predicciones cuando el
   * usuario entra directo a `/models` con el store vacío.
   */
  useEffect(() => {
    const patch: Record<string, string> = {};

    if (!global.getActiveDatasetId()) {
      patch.activeDatasetId = normalizeDatasetIdForBackend(defaultDatasetId);
    }
    if (!global.getActiveFamily()) {
      patch.selectedModelFamily = defaultFamily;
    }
    if (!global.getActiveModelName()) {
      patch.selectedModelName = defaultModel;
    }

    if (Object.keys(patch).length > 0) {
      setAppFilters(patch);
    }
  }, [defaultDatasetId, defaultFamily, defaultModel, global]);

  const setDatasetId = useCallback(
    (id: string) => {
      global.setActiveDatasetId(normalizeDatasetIdForBackend(id));
    },
    [global],
  );

  const setFamily = useCallback(
    (nextFamily: Family) => {
      global.setActiveFamily(nextFamily);
    },
    [global],
  );

  const setModelName = useCallback(
    (nextModelName: ModeloName) => {
      global.setActiveModelName(nextModelName);
    },
    [global],
  );

  return {
    datasetId,
    family,
    modelName,
    setDatasetId,
    setFamily,
    setModelName,
  };
}
