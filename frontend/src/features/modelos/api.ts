// frontend/src/features/modelos/api.ts
// =============================================================================
// NeuroCampus — Feature Modelos: API wrapper estable para la UI
// =============================================================================
//
// Este wrapper expone funciones de alto nivel para la pestaña Modelos,
// encapsulando:
// - llamadas HTTP (`src/services/modelos.ts`)
// - compatibilidad legacy (endpoints/schemas antiguos)
// - mapeo DTO -> UI (mappers)
//
// Principio clave:
// - La UI del prototipo NO debe conocer la API real ni sus detalles.
// - La UI solo consume datos en la forma del prototipo (RunRecord, etc).
//
// Nota sobre documentación:
// - Comentarios JSDoc + secciones claras, pensando en documentación futura.
// - Los TODO indican contratos sugeridos para backend futuro (bundle/artifacts).

import * as modelosService from "@/services/modelos";
import {
  type ChampionInfoDto,
  type EntrenarRequestDto,
  type EstadoResponseDto,
  type ModelSweepRequestDto,
  type ReadinessResponseDto,
  type DatasetInfoDto,
  type RunDetailsDto,
  type RunSummaryDto,
  type PromoteChampionRequestDto,
  type PrepareFeaturePackRequestDto,
  type PrepareFeaturePackResponseDto,
  type BundleArtifactsDto,
  type Family,
  type ModeloName,
} from "./types";

import {
  extractPrimaryMetricValue,
  mapChampionToChampionRecord,
  mapChampionToResolvedModel,
  mapMetricsToRunMetrics,
  mapRunSummaryToRunRecord,
  mergeRunDetails,
  normalizeFamily,
} from "./mappers";

import {
  FAMILY_CONFIGS,
  type ChampionRecord,
  type ResolvedModel,
  type RunRecord,
  type SweepResult,
} from "@/components/models/mockData";

/**
 * Normaliza `hparams` sin perder tipos relevantes para el backend.
 *
 * El contrato actual de `/modelos/entrenar` acepta números, strings y booleanos.
 * Esto es especialmente importante para `dbm_manual`, que usa flags como
 * `use_pcd`, `exclude_id_like_features` y opciones de preprocesamiento como
 * `scale_mode`.
 */
function normalizeHparamsPayload(
  hparams: Record<string, number | string | boolean | null> | undefined
): Record<string, number | string | boolean | null> | undefined {
  if (!hparams) return undefined;

  const out: Record<string, number | string | boolean | null> = {};
  for (const [k, v] of Object.entries(hparams)) {
    if (v === null) {
      out[k] = null;
      continue;
    }
    if (typeof v === "number") {
      if (Number.isFinite(v)) out[k] = v;
      continue;
    }
    if (typeof v === "string" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normaliza un valor que en DTO puede ser `null` para ajustarse a un
 * contrato de servicio que espera `undefined` cuando no aplica.
 */
function nullToUndef<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convierte un valor arbitrario en número finito cuando es posible.
 *
 * Se usa en la normalización del summary de sweep porque el backend puede
 * devolver ``primary_metric_value`` como number, string o puede omitirlo en
 * summaries legacy donde la métrica debe derivarse desde ``metrics``.
 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Wrapper estable para consumirse desde hooks/UI.
 */
export const modelosApi = {
  /** Readiness del dataset (si artifacts existen). */
  async readiness(datasetId: string): Promise<ReadinessResponseDto> {
    return (await modelosService.getReadiness({ dataset_id: datasetId })) as unknown as ReadinessResponseDto;
  },

  /**
   * Construye manualmente el feature-pack desde la pestaña Modelos.
   *
   * Se usa para reemplazar la simulación visual por una llamada real al backend,
   * manteniendo fallback en la UI si el endpoint no estuviera disponible.
   */
  async prepareFeaturePack(request: PrepareFeaturePackRequestDto): Promise<PrepareFeaturePackResponseDto> {
    return (await modelosService.prepareFeaturePack(request as any)) as unknown as PrepareFeaturePackResponseDto;
  },

  /** Lista datasets detectados (para selector). */
  async listDatasets(): Promise<DatasetInfoDto[]> {
    return (await modelosService.listDatasets()) as unknown as DatasetInfoDto[];
  },
  /**
   * Lista runs como `RunRecord` (forma UI prototipo).
   *
   * @param datasetId dataset/periodo.
   * @param family family (Ruta 2).
   * @param modelName filtra por modelo si se desea.
   */
  async listRunsUI(params: {
    datasetId: string;
    family?: Family;
    modelName?: ModeloName;
  }): Promise<RunRecord[]> {
    const runs: RunSummaryDto[] = await modelosService.listRuns({
      dataset_id: params.datasetId,
      family: params.family,
      model_name: params.modelName,
    });

    return runs.map(mapRunSummaryToRunRecord);
  },

  /**
   * Obtiene detalle del run y devuelve `RunRecord` enriquecido.
   */
  async getRunDetailsUI(runId: string, base?: RunRecord): Promise<RunRecord> {
    const details: RunDetailsDto = await modelosService.getRunDetails(runId);

    const baseRecord = base ?? mapRunSummaryToRunRecord({
      run_id: details.run_id,
      model_name: (details as any).model_name ?? "rbm_general",
      dataset_id: details.dataset_id ?? "unknown",
      family: details.family ?? "sentiment_desempeno",
      task_type: details.task_type ?? null,
      input_level: details.input_level ?? null,
      target_col: details.target_col ?? null,
      data_plan: details.data_plan ?? null,
      data_source: details.data_source ?? null,
      created_at: new Date().toISOString(),
      metrics: details.metrics ?? {},
    });

    return mergeRunDetails(baseRecord, details);
  },

  /**
   * Obtiene detalle del run + artefactos del bundle en una sola llamada.
   *
   * Esto evita que la subpestaña Bundle dependa de mocks cuando el backend ya
   * expone predictor/metrics/job_meta/preprocess reales.
   */
  async getRunBundleUI(runId: string, base?: RunRecord): Promise<{
    run: RunRecord;
    artifacts: BundleArtifactsDto | null;
  }> {
    const details: RunDetailsDto = await modelosService.getRunDetails(runId);

    const baseRecord = base ?? mapRunSummaryToRunRecord({
      run_id: details.run_id,
      model_name: (details as any).model_name ?? "rbm_general",
      dataset_id: details.dataset_id ?? "unknown",
      family: details.family ?? "sentiment_desempeno",
      task_type: details.task_type ?? null,
      input_level: details.input_level ?? null,
      target_col: details.target_col ?? null,
      data_plan: details.data_plan ?? null,
      data_source: details.data_source ?? null,
      created_at: new Date().toISOString(),
      metrics: details.metrics ?? {},
    });

    return {
      run: mergeRunDetails(baseRecord, details),
      artifacts: details.bundle_artifacts ?? null,
    };
  },

  /**
   * Obtiene champion actual y lo devuelve en dos formas:
   * - `resolved` (para header)
   * - `record` (para UI champion tab)
   */
  async getChampionUI(params: {
    datasetId: string;
    family?: Family;
    modelName?: ModeloName;
  }): Promise<{ resolved: ResolvedModel; record: ChampionRecord; raw: ChampionInfoDto }> {
    const raw = (await modelosService.getChampion({
      dataset_id: params.datasetId,
      family: params.family,
      model_name: params.modelName,
    })) as unknown as ChampionInfoDto;

    return {
      raw,
      resolved: mapChampionToResolvedModel(raw),
      record: mapChampionToChampionRecord(raw),
    };
  },

  /**
   * Entrena un modelo y retorna el `job_id` para polling.
   *
   * Nota:
   * - La UI del prototipo simula; aquí solo enviamos request.
   */
  async train(request: EntrenarRequestDto): Promise<{ jobId: string }> {
    const resp = await modelosService.entrenar({
      ...request,
      hparams: normalizeHparamsPayload(request.hparams),
    } as any);
    return { jobId: resp.job_id };
  },

  /**
   * Polling del estado del job (train o sweep legacy).
   */
  async getJobStatus(jobId: string): Promise<EstadoResponseDto> {
    return (await modelosService.estado(jobId)) as unknown as EstadoResponseDto;
  },

  /**
   * Promueve un run a champion.
   */
  async promote(request: PromoteChampionRequestDto): Promise<{ ok: boolean }> {
    await modelosService.promoteChampion(request);
    return { ok: true };
  },

  /**
   * Ejecuta sweep:
   * - preferido: `POST /modelos/sweep` (sync o semi-sync)
   * - fallback: `/modelos/entrenar/sweep` (legacy async), si existe.
   *
   * Retorna `SweepResult` con candidates listos para UI.
   */
  async sweep(params: ModelSweepRequestDto): Promise<{
    sweep_id: string;
    requiresPolling: boolean;
    summary?: modelosService.SweepResp;
  }> {
    const req: any = {
      ...params,
      warm_start_from: nullToUndef(params.warm_start_from),
      warm_start_run_id: nullToUndef(params.warm_start_run_id),
    };

    const data = await modelosService.sweep(req);

    // Endpoint nuevo: devuelve el summary completo en la respuesta.
    if (Array.isArray((data as any)?.candidates)) {
      return {
        sweep_id: String((data as any).sweep_id ?? crypto.randomUUID()),
        requiresPolling: false,
        summary: data as modelosService.SweepResp,
      };
    }

    // Fallback legacy: solo devuelve sweep_id y hay que consultar /estado + /sweeps/:id.
    return {
      sweep_id: String((data as any)?.sweep_id),
      requiresPolling: true,
    };
  },

  /**
   * Transforma el payload final de /modelos/sweeps/:sweepId a SweepResult
   */
  mapSweepSummaryToResult(resp: any, fallbackFamily: Family): SweepResult {
    const family = normalizeFamily(resp.family ?? fallbackFamily);
    const fc = FAMILY_CONFIGS[family];
    const primaryMetric = String(resp.primary_metric ?? fc.primaryMetric);
    const primaryMetricMode = String(resp.primary_metric_mode ?? fc.metricMode);

    const rawCandidates = Array.isArray(resp.candidates) && resp.candidates.length > 0
      ? resp.candidates
      : Object.values(resp.best_by_model ?? {});

    const candidates = rawCandidates.map((c: any) => {
      const metrics = (c.metrics ?? {}) as Record<string, unknown>;
      const record = mapRunSummaryToRunRecord({
        run_id: c.run_id ?? `sweep_${String(c.model_name)}_unknown`,
        model_name: String(c.model_name ?? "rbm_general"),
        dataset_id: resp.dataset_id,
        family,
        task_type: null,
        input_level: null,
        target_col: null,
        data_plan: null,
        data_source: null,
        created_at: new Date().toISOString(),
        metrics: metrics as any,
      });

      const explicitPmv = toFiniteNumber(c.primary_metric_value);
      const derivedPmv = extractPrimaryMetricValue(metrics, primaryMetric);
      const finalPmv = explicitPmv ?? derivedPmv;

      return {
        ...record,
        primary_metric: primaryMetric,
        metric_mode: primaryMetricMode,
        primary_metric_value: finalPmv,
        metrics: mapMetricsToRunMetrics(metrics),
        status: c.status === "failed" ? "failed" : "completed",
      } as RunRecord;
    });

    const sortedCandidates = [...candidates].sort((a, b) => {
      if (primaryMetricMode === "min") {
        if (a.primary_metric_value !== b.primary_metric_value) {
          return a.primary_metric_value - b.primary_metric_value;
        }
      } else if (a.primary_metric_value !== b.primary_metric_value) {
        return b.primary_metric_value - a.primary_metric_value;
      }
      if (a.model_name !== b.model_name) {
        return String(a.model_name).localeCompare(String(b.model_name));
      }
      return String(a.run_id).localeCompare(String(b.run_id));
    });

    const bestId = String(
      resp.best?.run_id
      ?? resp.best_overall?.run_id
      ?? sortedCandidates[0]?.run_id
      ?? "unknown"
    );

    return {
      candidates,
      winner_run_id: bestId,
      winner_reason: `Best candidate selected by ${primaryMetric} (${primaryMetricMode})`,
      auto_promoted: Boolean(resp.champion_promoted ?? resp.champion_updated),
    };
  },

  /**
   * Recupera summary del sweep (si el backend lo expone).
   */
  async getSweepSummary(sweepId: string): Promise<modelosService.SweepSummaryResp> {
    return modelosService.getSweepSummary(sweepId);
  },
};
