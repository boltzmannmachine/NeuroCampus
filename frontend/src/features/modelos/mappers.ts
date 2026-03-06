// frontend/src/features/modelos/mappers.ts
// =============================================================================
// NeuroCampus — Feature Modelos: mappers (DTO backend -> tipos UI)
// =============================================================================
//
// Este módulo contiene funciones puras para transformar respuestas del backend
// (`/modelos`) en estructuras consumidas por la UI del prototipo (Modelos Tab).
//
// Principio clave:
// - La UI no debería conocer detalles del backend ni de compatibilidad legacy.
// - Cualquier "fallback" o heurística para campos faltantes vive aquí.
//
// Documentación:
// - Comentarios estilo JSDoc para facilitar documentación futura.
// - Cada mapper declara supuestos y fallbacks explícitamente.

import {
  type ChampionInfoDto,
  type Family,
  type ModeloName,
  type RunDetailsDto,
  type RunSummaryDto,
  type ReadinessResponseDto,
} from "./types";

import {
  FAMILY_CONFIGS,
  type BundleChecklist,
  type BundleStatus,
  type ChampionRecord,
  type EpochData,
  type ResolvedModel,
  type RunMetrics,
  type RunRecord,
} from "@/components/models/mockData";

/**
 * Convierte un valor desconocido en número (o retorna `null`).
 */
function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Devuelve string seguro (o `null`).
 */
function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}

/**
 * Normaliza family cuando venga incompleta o legacy.
 *
 * - Si `family` está ausente: default "sentiment_desempeno".
 * - Si viene un valor desconocido: default "sentiment_desempeno".
 */
export function normalizeFamily(family: unknown): Family {
  if (family === "sentiment_desempeno" || family === "score_docente") return family;
  return "sentiment_desempeno";
}

/** Normaliza warm_start_from a un conjunto cerrado. */
function normalizeWarmStartFrom(value: unknown): "none" | "champion" | "run_id" {
  const v = typeof value === "string" ? value : "";
  if (v === "champion" || v === "run_id" || v === "none") return v;
  return "none";
}

/**
 * Extrae señales de warm-start desde el dict de métricas del backend.
 *
 * Convención (backend P2 Parte 2/3):
 * - warm_start_resolved: bool
 * - warm_started: bool (aplicado realmente)
 * - warm_start_from, warm_start_source_run_id, warm_start_path
 * - warm_start: { warm_start: 'ok'|'skipped'|'error', reason?: str }
 */
function parseWarmStartForUI(metrics: Record<string, unknown> | null | undefined): {
  warm_started: boolean;
  warm_start_resolved: boolean;
  warm_start_from: "none" | "champion" | "run_id";
  warm_start_source_run_id: string | null;
  warm_start_path: string | null;
  warm_start_result: "ok" | "skipped" | "error" | null;
  warm_start_reason: string | null;
} {
  const m = metrics ?? {};

  const warm_start_path = toStringOrNull(m["warm_start_path"]);
  const resolvedRaw = m["warm_start_resolved"];
  const warm_start_resolved = typeof resolvedRaw === "boolean" ? resolvedRaw : Boolean(warm_start_path);

  const warm_start_from = normalizeWarmStartFrom(m["warm_start_from"]);
  const warm_start_source_run_id = toStringOrNull(m["warm_start_source_run_id"]);

  let warm_start_result: "ok" | "skipped" | "error" | null = null;
  let warm_start_reason: string | null = null;

  const wsObj = (m as any)["warm_start"];
  if (wsObj && typeof wsObj === "object") {
    const r = String((wsObj as any)["warm_start"] ?? "").toLowerCase();
    if (r === "ok" || r === "skipped" || r === "error") warm_start_result = r as any;
    warm_start_reason = toStringOrNull((wsObj as any)["reason"]);
  }

  const startedRaw = m["warm_started"];
  const warm_started = typeof startedRaw === "boolean" ? startedRaw : warm_start_result === "ok";

  // -----------------------------------------------------------------------
  // Fallback visual para runs históricos o estrategias que no persisten el
  // objeto anidado ``warm_start`` en métricas finales.
  //
  // Caso observado:
  // - DBM puede persistir ``warm_started=true`` y la trazabilidad de origen,
  //   pero omitir ``warm_start: { warm_start: "ok" }`` en el resumen final.
  // - Sin este fallback, la UI muestra ``WS:Champ`` sin ``(ok)`` aunque el
  //   warm-start se haya aplicado correctamente.
  // -----------------------------------------------------------------------
  if (warm_start_result == null) {
    if (warm_started) {
      warm_start_result = "ok";
    } else if (warm_start_resolved) {
      warm_start_result = "skipped";
    }
  }

  return {
    warm_started,
    warm_start_resolved,
    warm_start_from,
    warm_start_source_run_id,
    warm_start_path,
    warm_start_result,
    warm_start_reason,
  };
}

/**
 * Determina el status del bundle con heurística:
 * - Si el backend provee `artifact_path` y el run está completed => "complete".
 * - Si el backend no provee nada => "incomplete" (conservador).
 *
 * Nota:
 * - Esto se reemplazará cuando exista `GET /modelos/runs/{run_id}/bundle`.
 */
export function computeBundleStatus(details: RunDetailsDto | null | undefined): BundleStatus {
  if (!details) return "incomplete";
  const hasArtifactPath = Boolean(details.artifact_path && details.artifact_path.length > 0);
  return hasArtifactPath ? "complete" : "incomplete";
}

/**
 * Construye un checklist de bundle (placeholder) a partir de señales mínimas.
 *
 * Importante:
 * - La UI del prototipo renderiza un checklist; hoy no existe endpoint para
 *   conocer estado real de cada artefacto.
 * - Por eso devolvemos un checklist "optimista" cuando hay artifact_path.
 */
export function computeBundleChecklist(details: RunDetailsDto | null | undefined): BundleChecklist {
  const complete = computeBundleStatus(details) === "complete";
  return {
    "predictor.json": complete,
    "metrics.json": complete,
    "job_meta.json": complete,
    "preprocess.json": complete,
    "model/": complete,
  };
}

/**
 * Extrae "primary metric value" desde un dict genérico de métricas.
 *
 * Fallback:
 * - Si no existe `primaryMetric` en el dict, intenta claves comunes
 *   ("val_f1_macro", "val_rmse", "val_accuracy", etc).
 */
export function extractPrimaryMetricValue(
  metrics: Record<string, unknown> | null | undefined,
  primaryMetric: string
): number {
  const m = metrics ?? {};
  const direct = toNumber(m[primaryMetric]);
  if (direct != null) return direct;

  // Fallbacks comunes
  const candidates = [
    "primary_metric_value",
    "val_f1_macro",
    "val_accuracy",
    "val_rmse",
    "val_mae",
    "val_r2",
  ];
  for (const k of candidates) {
    const v = toNumber(m[k]);
    if (v != null) return v;
  }
  return 0;
}

/**
 * Convierte un dict de métricas del backend a `RunMetrics` del prototipo.
 *
 * Nota:
 * - Se conserva el dict completo en la medida de lo posible.
 * - Se mapea un subconjunto esperado por la UI a campos tipados.
 */
export function mapMetricsToRunMetrics(metrics: Record<string, unknown> | null | undefined): RunMetrics {
  const m = metrics ?? {};
  const out: RunMetrics = {};

  // Campos comunes UI (si existen)
  const val_f1_macro = toNumber(m["val_f1_macro"]);
  const val_accuracy = toNumber(m["val_accuracy"]);
  const val_rmse = toNumber(m["val_rmse"]);
  const val_mae = toNumber(m["val_mae"]);
  const val_r2 = toNumber(m["val_r2"]);

  if (val_f1_macro != null) out.val_f1_macro = val_f1_macro;
  if (val_accuracy != null) out.val_accuracy = val_accuracy;
  if (val_rmse != null) out.val_rmse = val_rmse;
  if (val_mae != null) out.val_mae = val_mae;
  if (val_r2 != null) out.val_r2 = val_r2;

  // Copiar numéricos adicionales
  for (const [k, v] of Object.entries(m)) {
    const num = toNumber(v);
    if (num != null) out[k] = num;
  }

  return out;
}

/**
 * Mapea `RunSummaryDto` (listado) -> `RunRecord` (UI prototipo).
 *
 * Importante:
 * - `RunRecord` tiene MUCHOS campos; aquí poblamos lo esencial.
 * - Campos no disponibles se inicializan con defaults seguros sin romper la UI.
 *
 * Nota:
 * - Cuando exista endpoint estable de `run_details`, se completarán más campos.
 */
export function mapRunSummaryToRunRecord(summary: RunSummaryDto): RunRecord {
  const family = normalizeFamily(summary.family);
  const fc = FAMILY_CONFIGS[family];

  const metrics = mapMetricsToRunMetrics(summary.metrics);
  const primaryMetricValue = extractPrimaryMetricValue(summary.metrics, fc.primaryMetric);

  const createdAt = summary.created_at ?? new Date(0).toISOString();

  const ws = parseWarmStartForUI(summary.metrics);

  return {
    run_id: summary.run_id,
    dataset_id: summary.dataset_id ?? "unknown",
    family,
    model_name: (summary.model_name as ModeloName) ?? "rbm_general",
    task_type: summary.task_type ?? fc.taskType,
    input_level: summary.input_level ?? fc.inputLevel,
    data_source: (summary.data_source as any) ?? fc.dataSource,
    target_col: summary.target_col ?? (family === "sentiment_desempeno" ? "sentiment_label" : "score_final"),
    primary_metric: fc.primaryMetric,
    metric_mode: fc.metricMode,
    primary_metric_value: primaryMetricValue,
    metrics,

    // Estado:
    status: "completed",

    // Bundle (placeholder)
    bundle_version: "2.1.0",
    bundle_status: "incomplete",
    bundle_checklist: {
      "predictor.json": false,
      "metrics.json": false,
      "job_meta.json": false,
      "preprocess.json": false,
      "model/": false,
    },

    // Warm-start (desde métricas; trazabilidad P2)
    warm_started: ws.warm_started,
    warm_start_resolved: ws.warm_start_resolved,
    warm_start_from: ws.warm_start_from,
    warm_start_source_run_id: ws.warm_start_source_run_id,
    warm_start_path: ws.warm_start_path,
    warm_start_result: ws.warm_start_result,
    warm_start_reason: ws.warm_start_reason,

    // Features (placeholder)
    n_feat_total: 0,
    n_feat_text: 0,
    text_feat_cols: [],

    // Training curve (placeholder)
    epochs_data: [] as EpochData[],

    // metadata
    created_at: createdAt,
    duration_seconds: 0,
    seed: 0,
    epochs: 0,
  };
}

/**
 * Construye la serie por época consumida por las gráficas del prototipo.
 *
 * Este helper traduce el `metrics.history` del backend a `EpochData`, usando la
 * métrica primaria real del run (`val_rmse`, `val_f1_macro`, etc.) y su par de
 * entrenamiento (`train_rmse`, `train_f1_macro`, ...).
 *
 * @param historyArr historial crudo por época proveniente del backend.
 * @param primaryMetricKey clave de validación a graficar, por ejemplo `val_rmse`.
 * @returns serie normalizada apta para Recharts.
 */
function buildEpochSeriesFromHistory(historyArr: unknown[], primaryMetricKey: string): EpochData[] {
  const valKey = primaryMetricKey.startsWith("val_") ? primaryMetricKey : `val_${primaryMetricKey}`;
  const trainKey = valKey.startsWith("val_") ? `train_${valKey.slice(4)}` : `train_${valKey}`;

  return historyArr
    .map((item, idx) => {
      const h = (item ?? {}) as Record<string, unknown>;
      const epoch = toNumber(h["epoch"]) ?? idx + 1;
      const val_metric = toNumber(h[valKey]);
      const train_metric = toNumber(h[trainKey]);
      const train_loss = toNumber(h["train_loss"]) ?? toNumber(h["loss"]);
      const val_loss = toNumber(h["val_loss"]);
      return { epoch, train_loss, val_loss, train_metric, val_metric };
    })
    .filter(
      (point) =>
        point.val_metric !== null ||
        point.train_metric !== null ||
        point.train_loss !== null ||
        point.val_loss !== null
    );
}

/**
 * Resume la "riqueza" de una serie por época.
 *
 * La UI puede abrir un run con una serie preliminar proveniente del polling del
 * job o del listado. En esos casos a menudo solo existe `loss`, mientras que el
 * detalle del run ya trae `train_rmse`/`val_rmse` completos. Este contador nos
 * permite decidir cuándo reemplazar la serie preliminar por la serie rica.
 */
function summarizeEpochSeries(series: EpochData[]): {
  epochs: number;
  trainMetricPoints: number;
  valMetricPoints: number;
  trainLossPoints: number;
  valLossPoints: number;
} {
  return series.reduce(
    (acc, point) => {
      acc.epochs += 1;
      if (point.train_metric !== null) acc.trainMetricPoints += 1;
      if (point.val_metric !== null) acc.valMetricPoints += 1;
      if (point.train_loss !== null) acc.trainLossPoints += 1;
      if (point.val_loss !== null) acc.valLossPoints += 1;
      return acc;
    },
    {
      epochs: 0,
      trainMetricPoints: 0,
      valMetricPoints: 0,
      trainLossPoints: 0,
      valLossPoints: 0,
    }
  );
}

/**
 * Decide si conviene reemplazar la serie preliminar por la reconstruida desde el
 * detalle del backend.
 *
 * Regla principal:
 * - si el detalle trae más puntos de métrica (`train_metric`/`val_metric`) que
 *   la serie actual, debemos usar el detalle;
 * - si ambas series son equivalentes, se conserva la existente para no alterar
 *   innecesariamente la UI.
 */
function shouldPreferDetailedEpochSeries(existing: EpochData[], rebuilt: EpochData[]): boolean {
  if (!rebuilt.length) return false;
  if (!existing.length) return true;

  const current = summarizeEpochSeries(existing);
  const detailed = summarizeEpochSeries(rebuilt);

  if (detailed.valMetricPoints > current.valMetricPoints) return true;
  if (detailed.trainMetricPoints > current.trainMetricPoints) return true;

  const currentHasOnlyLoss = current.valMetricPoints === 0 && current.trainMetricPoints === 0;
  const detailedHasMetrics = detailed.valMetricPoints > 0 || detailed.trainMetricPoints > 0;
  if (currentHasOnlyLoss && detailedHasMetrics) return true;

  if (detailed.epochs > current.epochs && detailedHasMetrics) return true;
  if (detailed.trainLossPoints > current.trainLossPoints && current.trainLossPoints === 0) return true;
  if (detailed.valLossPoints > current.valLossPoints && current.valLossPoints === 0) return true;

  return false;
}

/**
 * Enriquecer un `RunRecord` con señales del detalle del run.
 *
 * Nota:
 * - Este mapper NO cambia estructura ni estética; solo llena datos.
 * - Si el detalle trae un `metrics.history` más rico que la serie ya presente en
 *   el `record`, se reemplaza la serie previa para que las gráficas reflejen las
 *   métricas reales del entrenamiento (incluyendo warm-start desde `run_id`).
 */
export function mergeRunDetails(record: RunRecord, details: RunDetailsDto): RunRecord {
  const family = normalizeFamily(details.family ?? record.family);
  const fc = FAMILY_CONFIGS[family];

  const bundleStatus = computeBundleStatus(details);
  const bundleChecklist = computeBundleChecklist(details);

  const history = (details.metrics as any)?.history;
  const historyArr: unknown[] = Array.isArray(history) ? history : [];
  const primaryMetricKey = toStringOrNull((details.metrics as any)?.primary_metric) ?? record.primary_metric ?? fc.primaryMetric;
  const rebuiltEpochsData = buildEpochSeriesFromHistory(historyArr, primaryMetricKey);
  const currentEpochsData = Array.isArray(record.epochs_data) ? record.epochs_data : [];
  const epochsData = shouldPreferDetailedEpochSeries(currentEpochsData, rebuiltEpochsData)
    ? rebuiltEpochsData
    : currentEpochsData;

  const epochsFromSeries = epochsData.length ? Math.max(...epochsData.map((p) => p.epoch)) : record.epochs;

  const ws = parseWarmStartForUI(details.metrics ?? record.metrics);

  return {
    ...record,
    family,
    task_type: details.task_type ?? record.task_type ?? fc.taskType,
    input_level: details.input_level ?? record.input_level ?? fc.inputLevel,
    target_col: details.target_col ?? record.target_col,
    data_source: (details.data_source as any) ?? record.data_source,
    metrics: mapMetricsToRunMetrics(details.metrics ?? record.metrics),

    epochs: epochsFromSeries,
    epochs_data: epochsData,

    primary_metric: fc.primaryMetric,
    metric_mode: fc.metricMode,
    primary_metric_value: extractPrimaryMetricValue(details.metrics, fc.primaryMetric),

    bundle_status: bundleStatus,
    bundle_checklist: bundleChecklist,

    warm_started: ws.warm_started,
    warm_start_resolved: ws.warm_start_resolved,
    warm_start_from: ws.warm_start_from,
    warm_start_source_run_id: ws.warm_start_source_run_id,
    warm_start_path: ws.warm_start_path,
    warm_start_result: ws.warm_start_result,
    warm_start_reason: ws.warm_start_reason,
  };
}

/**
 * Mapea Champion del backend a `ResolvedModel` (UI).
 *
 * Fallbacks:
 * - `source_run_id` puede venir `null` -> usar `metrics.run_id` si existe.
 * - `model_name` puede venir ausente -> fallback "rbm_general".
 */
export function mapChampionToResolvedModel(champion: ChampionInfoDto): ResolvedModel {
  const family = normalizeFamily(champion.family);
  const fc = FAMILY_CONFIGS[family];

  const metrics = champion.metrics ?? {};
  const sourceRunId =
    champion.source_run_id ??
    toStringOrNull((metrics as any)["run_id"]) ??
    "unknown";

  const modelName = (champion.model_name as ModeloName) ?? "rbm_general";

  const pmv = extractPrimaryMetricValue(metrics as any, fc.primaryMetric);

  return {
    resolved_run_id: sourceRunId,
    source: "champion",
    bundle_status: champion.path ? "complete" : "incomplete",
    primary_metric: fc.primaryMetric,
    primary_metric_value: pmv,
    model_name: modelName,
    family,
    dataset_id: champion.dataset_id ?? "unknown",
  };
}

/**
 * Mapea Champion del backend a `ChampionRecord` (UI prototipo).
 */
export function mapChampionToChampionRecord(champion: ChampionInfoDto): ChampionRecord {
  const resolved = mapChampionToResolvedModel(champion);
  const fc = FAMILY_CONFIGS[resolved.family];

  return {
    run_id: resolved.resolved_run_id,
    model_name: resolved.model_name,
    primary_metric_value: resolved.primary_metric_value,
    primary_metric: fc.primaryMetric,
    metric_mode: fc.metricMode,
    family: resolved.family,
    dataset_id: resolved.dataset_id,
    promoted_at: new Date().toISOString(),
  };
}

/**
 * Mapea readiness del backend a un set de checks simples.
 *
 * Nota:
 * - El prototipo incluye un diagnóstico más amplio; aquí retornamos señales base.
 * - Los checks finales de `DiagnosticSubTab` se alimentarán con este readiness.
 */
export function mapReadinessToFlags(readiness: ReadinessResponseDto): {
  hasLabeled: boolean;
  hasUnifiedLabeled: boolean;
  hasFeaturePack: boolean;
  hasPairMatrix: boolean;
} {
  return {
    hasLabeled: Boolean(readiness.labeled_exists),
    hasUnifiedLabeled: Boolean(readiness.unified_labeled_exists),
    hasFeaturePack: Boolean(readiness.feature_pack_exists),
    hasPairMatrix: Boolean(readiness.pair_matrix_exists),
  };
}
