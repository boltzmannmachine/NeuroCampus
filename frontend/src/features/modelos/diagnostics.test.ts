import { describe, expect, it } from 'vitest';
import { buildDiagnosticsSnapshot } from './diagnostics';
import type { ChampionRecord, Family, RunRecord } from '@/components/models/mockData';

function buildRun(overrides: Partial<RunRecord> = {}): RunRecord {
  const family = (overrides.family ?? 'score_docente') as Family;
  return {
    run_id: overrides.run_id ?? 'run_test_001',
    dataset_id: overrides.dataset_id ?? 'ds_2025_1',
    family,
    model_name: overrides.model_name ?? 'dbm_manual',
    task_type: overrides.task_type ?? (family === 'score_docente' ? 'regression' : 'classification'),
    input_level: overrides.input_level ?? (family === 'score_docente' ? 'pair' : 'row'),
    data_source: overrides.data_source ?? (family === 'score_docente' ? 'pair_matrix' : 'feature_pack'),
    target_col: overrides.target_col ?? 'target',
    primary_metric: overrides.primary_metric ?? (family === 'score_docente' ? 'val_rmse' : 'val_f1_macro'),
    metric_mode: overrides.metric_mode ?? (family === 'score_docente' ? 'min' : 'max'),
    primary_metric_value: overrides.primary_metric_value ?? 0.1234,
    metrics: overrides.metrics ?? {},
    status: overrides.status ?? 'completed',
    bundle_version: overrides.bundle_version ?? '2.1.0',
    bundle_status: overrides.bundle_status ?? 'complete',
    bundle_checklist: overrides.bundle_checklist ?? {
      'predictor.json': true,
      'metrics.json': true,
      'job_meta.json': true,
      'preprocess.json': true,
      'model/': true,
    },
    warm_started: overrides.warm_started ?? false,
    warm_start_from: overrides.warm_start_from ?? 'none',
    warm_start_source_run_id: overrides.warm_start_source_run_id ?? null,
    warm_start_path: overrides.warm_start_path ?? null,
    warm_start_result: overrides.warm_start_result ?? null,
    n_feat_total: overrides.n_feat_total ?? 12,
    n_feat_text: overrides.n_feat_text ?? 4,
    text_feat_cols: overrides.text_feat_cols ?? ['tfidf_a', 'tfidf_b'],
    epochs_data: overrides.epochs_data ?? [],
    created_at: overrides.created_at ?? '2026-03-08T00:00:00Z',
    duration_seconds: overrides.duration_seconds ?? 120,
    seed: overrides.seed ?? 42,
    epochs: overrides.epochs ?? 10,
    confusion_matrix: overrides.confusion_matrix,
    residuals: overrides.residuals,
  };
}

function buildChampion(overrides: Partial<ChampionRecord> = {}): ChampionRecord {
  return {
    run_id: overrides.run_id ?? 'run_test_001',
    model_name: overrides.model_name ?? 'dbm_manual',
    primary_metric_value: overrides.primary_metric_value ?? 0.1234,
    primary_metric: overrides.primary_metric ?? 'val_rmse',
    metric_mode: overrides.metric_mode ?? 'min',
    family: overrides.family ?? 'score_docente',
    dataset_id: overrides.dataset_id ?? 'ds_2025_1',
    promoted_at: overrides.promoted_at ?? '2026-03-08T00:00:00Z',
  };
}

describe('buildDiagnosticsSnapshot', () => {
  it('marca fail cuando no existe champion', () => {
    const snapshot = buildDiagnosticsSnapshot({
      family: 'score_docente',
      datasetId: 'ds_2025_1',
      runs: [],
      champion: null,
    });

    expect(snapshot.checks.find((check) => check.name === 'Champion exists')?.status).toBe('fail');
  });

  it('marca pass cuando existe champion con bundle completo', () => {
    const run = buildRun();
    const champion = buildChampion();

    const snapshot = buildDiagnosticsSnapshot({
      family: 'score_docente',
      datasetId: 'ds_2025_1',
      runs: [run],
      champion,
    });

    expect(snapshot.checks.find((check) => check.name === 'Champion exists')?.status).toBe('pass');
    expect(snapshot.checks.find((check) => check.name === 'Bundle completeness')?.status).toBe('pass');
    expect(snapshot.checks.find((check) => check.name === 'Prediction compatibility')?.status).toBe('pass');
  });

  it('genera warnings para runs legacy y sin features de texto', () => {
    const run = buildRun({
      bundle_version: '1.0.0',
      n_feat_text: 0,
    });

    const snapshot = buildDiagnosticsSnapshot({
      family: 'score_docente',
      datasetId: 'ds_2025_1',
      runs: [run],
      champion: buildChampion(),
    });

    expect(snapshot.checks.find((check) => check.name === 'Legacy runs')?.status).toBe('warn');
    expect(snapshot.warnings.some((warning) => warning.includes('TF-IDF'))).toBe(true);
  });
});
