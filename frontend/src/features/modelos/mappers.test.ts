// frontend/src/features/modelos/mappers.test.ts
// =============================================================================
// NeuroCampus — tests de mappers de Modelos
// =============================================================================
//
// Se validan dos comportamientos críticos del detalle de runs:
// - que la serie por época se reconstruya desde `metrics.history` cuando el
//   backend trae métricas supervisadas más ricas (p. ej. val_rmse);
// - que la serie previa se conserve cuando el detalle no aporta historial.

import { describe, expect, it } from "vitest";

import { mergeRunDetails, mapRunSummaryToRunRecord } from "./mappers";
import type { RunDetailsDto, RunSummaryDto } from "./types";

describe("features/modelos/mappers.mergeRunDetails", () => {
  it("reemplaza la serie preliminar cuando el detalle trae val_rmse/train_rmse", () => {
    const summary: RunSummaryDto = {
      run_id: "run-dbmhist-1",
      model_name: "dbm_manual",
      dataset_id: "2025-1",
      family: "score_docente",
      task_type: "regression",
      input_level: "pair",
      target_col: "target_score",
      data_source: "pair_matrix",
      created_at: "2026-03-06T19:12:50Z",
      metrics: {
        val_rmse: 1.6184,
        primary_metric: "val_rmse",
      },
    };

    const base = mapRunSummaryToRunRecord(summary);
    base.epochs_data = [
      { epoch: 1, train_loss: 0.0114, val_loss: null, train_metric: null, val_metric: null },
      { epoch: 2, train_loss: 0.0115, val_loss: null, train_metric: null, val_metric: null },
    ];

    const details: RunDetailsDto = {
      run_id: "run-dbmhist-1",
      dataset_id: "2025-1",
      family: "score_docente",
      task_type: "regression",
      input_level: "pair",
      target_col: "target_score",
      data_source: "pair_matrix",
      metrics: {
        primary_metric: "val_rmse",
        history: [
          { epoch: 1, loss: 0.0114, train_rmse: 1.0217, val_rmse: 1.3144 },
          { epoch: 2, loss: 0.0115, train_rmse: 1.0111, val_rmse: 1.2996 },
        ],
        val_rmse: 1.2996,
      },
      config: null,
      artifact_path: "artifacts/runs/run-dbmhist-1",
    };

    const merged = mergeRunDetails(base, details);

    expect(merged.epochs_data).toHaveLength(2);
    expect(merged.epochs_data[0].train_loss).toBe(0.0114);
    expect(merged.epochs_data[0].train_metric).toBe(1.0217);
    expect(merged.epochs_data[0].val_metric).toBe(1.3144);
    expect(merged.epochs_data[1].train_metric).toBe(1.0111);
    expect(merged.epochs_data[1].val_metric).toBe(1.2996);
  });

  it("conserva la serie existente cuando el detalle no trae history", () => {
    const summary: RunSummaryDto = {
      run_id: "run-dbmhist-2",
      model_name: "dbm_manual",
      dataset_id: "2025-1",
      family: "score_docente",
      task_type: "regression",
      input_level: "pair",
      target_col: "target_score",
      data_source: "pair_matrix",
      created_at: "2026-03-06T19:12:50Z",
      metrics: {
        val_rmse: 1.6184,
        primary_metric: "val_rmse",
      },
    };

    const base = mapRunSummaryToRunRecord(summary);
    base.epochs_data = [
      { epoch: 1, train_loss: 0.02, val_loss: null, train_metric: 1.5, val_metric: 1.7 },
    ];

    const details: RunDetailsDto = {
      run_id: "run-dbmhist-2",
      dataset_id: "2025-1",
      family: "score_docente",
      task_type: "regression",
      input_level: "pair",
      target_col: "target_score",
      data_source: "pair_matrix",
      metrics: {
        primary_metric: "val_rmse",
        val_rmse: 1.6184,
      },
      config: null,
      artifact_path: "artifacts/runs/run-dbmhist-2",
    };

    const merged = mergeRunDetails(base, details);

    expect(merged.epochs_data).toEqual(base.epochs_data);
  });
});
