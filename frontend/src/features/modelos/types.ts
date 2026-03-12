// frontend/src/features/modelos/types.ts
// =============================================================================
// NeuroCampus — Feature Modelos: tipos (DTO backend + tipos UI)
// =============================================================================
//
// Este módulo define **contratos TypeScript** para integrar el frontend con la API
// `/modelos` (FastAPI) y, además, expone tipos UI usados por la pestaña Modelos.
//
// Importante (paridad visual):
// - Estos tipos NO deben cambiar la UI. La UI debe permanecer 1:1 con el prototipo.
// - La capa de "adapter" (mappers/hooks) es quien traduce DTO -> UI.
//
// Nota sobre documentación:
// - Aunque Sphinx es del ecosistema Python, aquí usamos comentarios estilo JSDoc
//   y secciones claras para mantener trazabilidad y facilitar documentación futura.

/** Nombre lógico de un modelo soportado por /modelos (backend). */
export type ModeloName = "rbm_general" | "rbm_restringida" | "dbm_manual";

/** Familia de modelos (Ruta 2). */
export type Family = "sentiment_desempeno" | "score_docente";

/** Tipo de tarea; puede derivarse desde `family` en backend. */
export type TaskType = "classification" | "regression";

/** Nivel de entrada del modelo (row/pair). */
export type InputLevel = "row" | "pair";

/**
 * Fuente de datos para entrenamiento.
 *
 * - feature_pack: artifact reproducible (recomendado).
 * - pair_matrix: artifact pair-level (Ruta 2).
 * - labeled/unified_labeled: legacy / fallback.
 */
export type DataSource = "feature_pack" | "pair_matrix" | "labeled" | "unified_labeled";

/** Modo del target (backend); depende de family y del dataset disponible. */
export type TargetMode = "sentiment_probs" | "sentiment_label" | "score_only";

/** Estrategia de split train/val para evaluar métricas de validación. */
export type SplitMode = "temporal" | "stratified" | "random";

/** Metodología legacy para seleccionar datos del histórico. */
export type Metodologia = "periodo_actual" | "acumulado" | "ventana";

/** Plan de datos incremental (principalmente para `score_docente`). */
export type DataPlan = "dataset_only" | "recent_window" | "recent_window_plus_replay";

/** Estrategia de muestreo del histórico para replay. */
export type ReplayStrategy = "uniform" | "by_period";

/** Origen de warm start. */
export type WarmStartFrom = "none" | "champion" | "run_id";

/** Estado reportado por jobs de entrenamiento/sweep. */
export type JobStatus = "queued" | "running" | "completed" | "failed" | "unknown";

/** Modo para representar docente/materia cuando se incluyen como features. */
export type TeacherMateriaMode = "embed" | "onehot" | "none";

/**
 * Item del historial por época.
 * En backend se llama `EpochItem`.
 */
export interface EpochItemDto {
  epoch: number;
  loss?: number;
  recon_error?: number;
  time_epoch_ms?: number;

  /**
   * Campos opcionales si el backend expone métricas supervisadas por época.
   *
   * Nota:
   * - Para regresión suelen venir `train_rmse`, `val_rmse`, `train_mae`, etc.
   * - Para clasificación pueden venir `train_accuracy`, `val_f1_macro`, etc.
   * - Se mantiene una firma abierta para no perder métricas nuevas del backend.
   */
  train_metric?: number;
  val_metric?: number;
  train_loss?: number;
  val_loss?: number;
  train_rmse?: number;
  val_rmse?: number;
  train_mae?: number;
  val_mae?: number;
  train_r2?: number;
  val_r2?: number;
  train_accuracy?: number;
  val_accuracy?: number;
  train_f1_macro?: number;
  val_f1_macro?: number;
  [key: string]: number | string | null | undefined;
}

/**
 * Request del endpoint `POST /modelos/entrenar`.
 *
 * Compatibilidad:
 * - backend acepta alias para `modelo` (model_name/model), pero en frontend
 *   mantenemos `modelo` como canonical.
 * - `dataset_id` y `periodo_actual` se sincronizan en backend.
 */
export interface EntrenarRequestDto {
  /** Nombre lógico del modelo. */
  modelo: ModeloName;

  /** Dataset/periodo activo (ej. "2024-2"). */
  dataset_id?: string;

  /** Campo legacy (equivalente a dataset_id). */
  periodo_actual?: string;

  /** Metodología legacy de selección. */
  metodologia?: Metodologia;

  /** Ventana N si metodologia="ventana". */
  ventana_n?: number;

  /** Family (Ruta 2). */
  family?: Family;

  /** Derivables desde family (se pueden omitir). */
  task_type?: TaskType;
  input_level?: InputLevel;

  /** Target explícito (si aplica). */
  target_col?: string;

  /** Fuente de datos recomendada. */
  data_source?: DataSource;

  /** Ruta manual legacy/debug. */
  data_ref?: string;

  /** Modo del target; default backend: sentiment_probs. */
  target_mode?: TargetMode;

  /** Incluir features docente/materia. */
  include_teacher_materia?: boolean;

  /** Representación docente/materia. */
  teacher_materia_mode?: TeacherMateriaMode;

  /** Si true, backend intenta preparar artifacts faltantes cuando sea viable. */
  auto_prepare?: boolean;

  /** Split train/val para métricas reales. */
  split_mode?: SplitMode;
  val_ratio?: number;

  /** epochs del entrenamiento. */
  epochs?: number;

  /** Semilla. */
  seed?: number;

  /** Hparams flexibles (lr, batch_size, etc). */
  hparams?: Record<string, number | string | boolean | null>;
}

/** Response de `POST /modelos/entrenar`. */
export interface EntrenarResponseDto {
  job_id: string;
  status: JobStatus | string;
}

/**
 * Response de `GET /modelos/estado/{job_id}`.
 * Incluye progresos, métricas y trazabilidad.
 */
export interface EstadoResponseDto {
  job_id: string;
  status: JobStatus;
  progress?: number;

  /** Modelo efectivamente ejecutado (útil para auditoría). */
  model?: string;

  /** Parámetros efectivos del job (dict flexible). */
  params?: Record<string, unknown>;

  /** Métricas globales (dict flexible). */
  metrics?: Record<string, unknown>;

  /** Historial por época (si el backend lo expone). */
  history?: EpochItemDto[];

  /** run_id generado al completar (si aplica). */
  run_id?: string;

  /** Ruta del directorio de artifacts del run (debug). */
  artifact_path?: string;

  /** True si el run fue promovido automáticamente a champion. */
  champion_promoted?: boolean;

  /** Tiempo total del job (ms). */
  time_total_ms?: number;

  // Sweep (opcional)
  job_type?: "train" | "sweep";
  sweep_summary_path?: string;
  sweep_best_overall?: Record<string, unknown>;
  sweep_best_by_model?: Record<string, unknown>;

  /** Mensaje de error si falló. */
  error?: string;

  /** Trazabilidad del warm-start (cuando aplica). */
  warm_start_trace?: Record<string, unknown>;
}

/** Resumen ligero de un run para listados (`GET /modelos/runs`). */
export interface RunSummaryDto {
  run_id: string;
  model_name: string;
  dataset_id?: string | null;

  /** Ruta 2: contexto (puede venir backfilled por fill_context()). */
  family?: Family | null;
  task_type?: TaskType | null;
  input_level?: InputLevel | null;
  target_col?: string | null;
  data_plan?: DataPlan | null;
  data_source?: string | null;

  created_at: string;
  metrics: Record<string, unknown>;
}

/** Artefactos JSON del bundle expuestos por `GET /modelos/runs/{run_id}`. */
export interface BundleArtifactsDto {
  predictor?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  job_meta?: Record<string, unknown> | null;
  preprocess?: Record<string, unknown> | null;
  paths?: Record<string, string> | null;
}

/** Detalle completo de un run (`GET /modelos/runs/{run_id}`). */
export interface RunDetailsDto {
  run_id: string;
  dataset_id?: string | null;
  model_name?: string | null;

  family?: Family | null;
  task_type?: TaskType | null;
  input_level?: InputLevel | null;
  target_col?: string | null;
  data_plan?: DataPlan | null;
  data_source?: string | null;

  metrics: Record<string, unknown>;
  config?: Record<string, unknown> | null;
  artifact_path?: string | null;

  /** Estado explícito del bundle expuesto por backend. */
  bundle_status?: "complete" | "incomplete" | null;
  bundle_checklist?: Record<string, boolean> | null;
  bundle_artifacts?: BundleArtifactsDto | null;
}

/**
 * Champion actual (`GET /modelos/champion`).
 *
 * Nota (P2 Parte 1):
 * - Existe un bug observado donde el backend puede ignorar `model_name` del query.
 *   La UI debe tratarlo como "1 champion por family" mientras se corrige backend.
 */
export interface ChampionInfoDto {
  model_name?: ModeloName | null;
  dataset_id: string;

  family?: Family | null;

  task_type?: TaskType | null;
  input_level?: InputLevel | null;
  target_col?: string | null;
  data_plan?: DataPlan | null;
  data_source?: DataSource | null;

  /** run fuente del champion (champion.json o fallback metrics.run_id). */
  source_run_id?: string | null;

  metrics?: Record<string, unknown> | null;
  path: string;
}

/** Request para construir manualmente el feature-pack desde Modelos. */
export interface PrepareFeaturePackRequestDto {
  dataset_id: string;
  input_uri?: string;
  force?: boolean;
  text_feats_mode?: "none" | "tfidf_lsa";
  text_col?: string;
  text_n_components?: number;
  text_min_df?: number;
  text_max_features?: number;
}

/** Response del endpoint `POST /modelos/feature-pack/prepare`. */
export interface PrepareFeaturePackResponseDto {
  dataset_id?: string;
  input_uri?: string;
  train_matrix?: string;
  pair_matrix?: string;
  meta?: string;
  pair_meta?: string;
  teacher_index?: string;
  materia_index?: string;
  [key: string]: string | undefined;
}

/** Readiness (`GET /modelos/readiness`). */
export interface ReadinessResponseDto {
  dataset_id: string;
  labeled_exists: boolean;
  unified_labeled_exists: boolean;
  feature_pack_exists: boolean;

  /** Ruta 2: artifacts pair-level. */
  pair_matrix_exists?: boolean | null;

  /** Columna objetivo detectada. */
  score_col?: string | null;

  /** Metadata extra (si existe). */
  pair_meta?: Record<string, unknown> | null;
  labeled_score_meta?: Record<string, unknown> | null;

  /** Rutas (debug / diagnóstico). */
  paths?: Record<string, string>;
}

/** Request para promover manualmente un run a champion (`POST /modelos/promote`). */
export interface PromoteChampionRequestDto {
  dataset_id: string;
  run_id: string;
  model_name: ModeloName;

  family?: Family | null;
  task_type?: TaskType | null;
  input_level?: InputLevel | null;
  target_col?: string | null;
  data_plan?: DataPlan | null;
  data_source?: DataSource | null;
}

/** Resultado de un candidato individual en el sweep. */
export interface ModelSweepCandidateResultDto {
  model_name: ModeloName | string;
  run_id?: string | null;
  status: JobStatus;
  primary_metric_value?: number | null;
  metrics?: Record<string, unknown> | null;
  error?: string | null;
}

/** Request del sweep determinístico (`POST /modelos/sweep`). */
export interface ModelSweepRequestDto {
  dataset_id: string;
  family?: Family;
  data_source?: DataSource;
  seed?: number;
  epochs?: number;
  auto_prepare?: boolean;

  /** Selección explícita (default backend: los 3 modelos). */
  models?: ModeloName[];

  /** Overrides de hparams por modelo (dict flexible). */
  hparams_overrides?: Record<string, Record<string, unknown>>;

  /** Hparams base (para todos). */
  base_hparams?: Record<string, unknown>;

  /** Incremental (score_docente). */
  data_plan?: DataPlan | null;
  window_k?: number | null;
  replay_size?: number | null;
  replay_strategy?: ReplayStrategy;

  /** Warm start. */
  warm_start_from?: WarmStartFrom | null;
  warm_start_run_id?: string | null;

  /** Comportamiento. */
  auto_promote_champion?: boolean;
  max_candidates?: number;
}

/** Response del sweep determinístico (`POST /modelos/sweep`). */
export interface ModelSweepResponseDto {
  sweep_id: string;
  status?: JobStatus;
  dataset_id: string;
  family: string;

  primary_metric: string;
  primary_metric_mode: string; // "max" | "min"

  candidates: ModelSweepCandidateResultDto[];
  best?: ModelSweepCandidateResultDto | null;

  champion_promoted?: boolean;
  champion_run_id?: string | null;

  n_completed?: number;
  n_failed?: number;

  summary_path?: string | null;
  elapsed_s?: number | null;
}

/**
 * Tipos UI exportados (prototipo):
 * - Se re-exportan como `type` (no runtime) para que la capa adapter pueda
 *   producir exactamente la forma de datos que la UI del prototipo espera.
 *
 * Nota: estos tipos viven hoy en `components/models/mockData.ts` (Paso 1).
 * En una refactorización futura, se pueden mover a esta carpeta de Feature.
 */
export type {
  RunRecord,
  ChampionRecord,
  ResolvedModel,
  SweepResult,
  DiagnosticCheck,
} from "@/components/models/mockData";


// =============================================================================
// Datasets listing (`GET /modelos/datasets`)
// =============================================================================

export interface DatasetInfoDto {
  dataset_id: string;

  /**
   * Etiqueta opcional enviada por backend para presentar datasets especiales
   * (por ejemplo el histórico unificado) sin acoplar la UI al `dataset_id`.
   */
  display_name?: string | null;

  /**
   * Marca datasets sintéticos o derivados. Se usa para etiquetar el histórico
   * sin introducir reglas ad-hoc en cada subpestaña.
   */
  is_historical?: boolean | null;

  /**
   * URI de origen del dataset cuando backend la expone. Útil para auditoría y
   * documentación posterior del flujo de datos.
   */
  source_uri?: string | null;

  has_train_matrix: boolean;
  has_pair_matrix: boolean;
  has_labeled: boolean;
  has_processed: boolean;
  has_raw_dataset: boolean;

  n_rows?: number | null;
  n_pairs?: number | null;
  created_at?: string | null;

  has_champion_sentiment?: boolean;
  has_champion_score?: boolean;
}
