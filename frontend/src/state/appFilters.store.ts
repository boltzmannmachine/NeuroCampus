// frontend/src/state/appFilters.store.ts
import { useSyncExternalStore } from "react";

/**
 * Fuente lógica solicitada por la pestaña Predicciones.
 *
 * Nota de producto:
 * - El backend actual resuelve inferencia usando el champion activo.
 * - Aun así, conservamos el run seleccionado en Modelos como trazabilidad
 *   para que Predicciones pueda mostrar contexto al usuario.
 */
export type PredictionSource = "champion" | "run";

export type AppFiltersState = {
  activeDatasetId: string | null;
  activePeriodo: string | null;

  /**
   * Rango de periodos para consultas históricas.
   *
   * Se mantiene opcional para compatibilidad con pantallas que solo necesitan
   * `activePeriodo`.
   */
  periodoFrom: string | null;
  periodoTo: string | null;

  // Filtros opcionales (se activan cuando dashboard lo requiera)
  programa: string | null;
  asignatura: string | null;
  docente: string | null;

  /**
   * Contexto compartido entre Modelos y Predicciones.
   *
   * Estos campos no reemplazan la resolución real del backend; sirven para
   * transportar intención de navegación, trazabilidad y defaults de UI.
   */
  selectedModelFamily: string | null;
  selectedModelName: string | null;
  requestedPredictionRunId: string | null;
  predictionSource: PredictionSource | null;
};

const STORAGE_KEY = "NC_APP_FILTERS_V1";

const defaultState: AppFiltersState = {
  activeDatasetId: null,
  activePeriodo: null,
  periodoFrom: null,
  periodoTo: null,
  programa: null,
  asignatura: null,
  docente: null,
  selectedModelFamily: null,
  selectedModelName: null,
  requestedPredictionRunId: null,
  predictionSource: null,
};

function safeParse(json: string | null): AppFiltersState | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;
    return {
      ...defaultState,
      ...obj,
    } as AppFiltersState;
  } catch {
    return null;
  }
}

function loadInitial(): AppFiltersState {
  try {
    const fromStorage = safeParse(localStorage.getItem(STORAGE_KEY));
    return fromStorage ?? defaultState;
  } catch {
    return defaultState;
  }
}

let state: AppFiltersState = loadInitial();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getAppFilters(): AppFiltersState {
  return state;
}

export function setAppFilters(patch: Partial<AppFiltersState>) {
  state = { ...state, ...patch };
  emit();
}

export function resetAppFilters() {
  state = { ...defaultState };
  emit();
}

export function subscribeAppFilters(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Hook de lectura (con selector opcional).
 * Ej:
 *  const datasetId = useAppFilters(s => s.activeDatasetId)
 */
export function useAppFilters<T = AppFiltersState>(
  selector?: (s: AppFiltersState) => T,
): T {
  const getSnapshot = () => (selector ? selector(state) : (state as unknown as T));
  const getServerSnapshot = () =>
    selector ? selector(defaultState) : (defaultState as unknown as T);

  return useSyncExternalStore(subscribeAppFilters, getSnapshot, getServerSnapshot);
}
