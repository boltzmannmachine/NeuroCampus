"""Tests de consolidación de hparams para entrenamientos de modelos."""
from __future__ import annotations

from neurocampus.app.schemas.modelos import EntrenarRequest
from neurocampus.app.routers.modelos import _build_run_hparams



def test_build_run_hparams_prioritizes_top_level_seed_over_nested_hparams():
    """La semilla visible del request debe prevalecer y quedar disponible en hparams."""
    req = EntrenarRequest(
        modelo="dbm_manual",
        dataset_id="2025-1",
        family="score_docente",
        seed=123,
        hparams={"seed": 999, "lr": 0.02, "use_pcd": True},
    )

    out = _build_run_hparams(req, job_id="job-seed-001")

    assert out["seed"] == 123
    assert out["lr"] == 0.02
    assert out["use_pcd"] is True
