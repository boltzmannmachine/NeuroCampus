from __future__ import annotations

"""Pruebas del contrato estable de summaries de sweep.

Estas pruebas validan que `GET /modelos/sweeps/{sweep_id}` normalice el summary
legacy para que el frontend pueda:
- leer `primary_metric` / `primary_metric_mode`,
- obtener `best` como alias de `best_overall`,
- renderizar `primary_metric_value` por candidato aunque el summary persistido
  solo contenga `metrics`.
"""

import json
from pathlib import Path


def test_get_sweep_summary_normalizes_legacy_payload(tmp_path: Path, monkeypatch) -> None:
    from neurocampus.app.routers import modelos as m

    monkeypatch.setattr(m, "ARTIFACTS_DIR", tmp_path / "artifacts")

    sweep_id = "sweep_legacy_contract"
    summary_path = (m.ARTIFACTS_DIR / "sweeps" / sweep_id / "summary.json")
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(
        json.dumps(
            {
                "sweep_id": sweep_id,
                "dataset_id": "2024-2",
                "family": "score_docente",
                "status": "completed",
                "best_overall": {
                    "model_name": "dbm_manual",
                    "run_id": "run_best",
                    "status": "completed",
                    "metrics": {"val_rmse": 2.52, "primary_metric_value": 2.52},
                    "score": [2, -2.52],
                },
                "best_by_model": {
                    "dbm_manual": {
                        "model_name": "dbm_manual",
                        "run_id": "run_best",
                        "status": "completed",
                        "metrics": {"val_rmse": 2.52, "primary_metric_value": 2.52},
                        "score": [2, -2.52],
                    }
                },
                "candidates": [
                    {
                        "model_name": "dbm_manual",
                        "run_id": "run_best",
                        "status": "completed",
                        "metrics": {"val_rmse": 2.52, "primary_metric_value": 2.52},
                        "score": [2, -2.52],
                    },
                    {
                        "model_name": "rbm_general",
                        "run_id": "run_other",
                        "status": "completed",
                        "metrics": {"val_rmse": 4.51},
                        "score": [1, -4.51],
                    },
                ],
            }
        ),
        encoding="utf-8",
    )

    result = m.get_sweep_summary(sweep_id)

    assert result.primary_metric == "val_rmse"
    assert result.primary_metric_mode == "min"
    assert result.best is not None
    assert result.best.run_id == "run_best"
    assert len(result.candidates) == 2
    assert result.candidates[0].primary_metric_value == 2.52
    assert result.candidates[1].primary_metric_value == 4.51
