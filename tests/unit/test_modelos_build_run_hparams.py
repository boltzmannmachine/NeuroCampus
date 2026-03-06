"""Tests de consolidación de hparams para entrenamientos de modelos."""
from __future__ import annotations

from neurocampus.app.schemas.modelos import EntrenarRequest
from neurocampus.app.routers.modelos import _build_run_hparams



def test_build_run_hparams_prioritizes_explicit_top_level_seed_over_nested_hparams():
    """La semilla top-level debe ganar cuando el cliente la envía explícitamente."""
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



def test_build_run_hparams_preserves_nested_seed_when_top_level_seed_is_implicit_default():
    """El default del schema no debe pisar un hparams.seed personalizado."""
    req = EntrenarRequest(
        modelo="dbm_manual",
        dataset_id="2025-1",
        family="score_docente",
        hparams={"seed": 123, "lr": 0.02, "use_pcd": True},
    )

    out = _build_run_hparams(req, job_id="job-seed-002")

    assert out["seed"] == 123
    assert out["lr"] == 0.02
    assert out["use_pcd"] is True
