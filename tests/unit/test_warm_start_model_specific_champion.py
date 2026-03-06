from __future__ import annotations

"""Pruebas unitarias para la resolución de warm start por champion del mismo modelo.

Este módulo verifica la regla nueva: cuando `warm_start_from="champion"`, el
resolver solo puede reutilizar el champion del mismo `model_name`. Si existe un
champion global de otra arquitectura, debe ignorarse y el entrenamiento debe
continuar sin warm start.
"""

import json
from pathlib import Path

from neurocampus.models.dbm_manual import DBMManual
from neurocampus.utils.warm_start import resolve_warm_start_path


def _write_dbm_run(artifacts_dir: Path, run_id: str, *, n_visible: int = 8) -> Path:
    """Crea un run DBM mínimo persistido para pruebas de warm start."""
    model_dir = artifacts_dir / "runs" / run_id / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    DBMManual(n_visible=n_visible, n_hidden1=4, n_hidden2=2).save(str(model_dir))
    return model_dir


def _write_champion(
    artifacts_dir: Path,
    *,
    dataset_id: str,
    family: str,
    run_id: str,
    model_name: str | None,
) -> Path:
    """Escribe un `champion.json` en el layout nuevo o legacy requerido por el test."""
    if model_name:
        path = artifacts_dir / "champions" / family / dataset_id / model_name / "champion.json"
    else:
        path = artifacts_dir / "champions" / family / dataset_id / "champion.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"source_run_id": run_id}), encoding="utf-8")
    return path


def test_resolve_warm_start_prefers_model_specific_champion(tmp_path: Path) -> None:
    """Debe resolver el champion del mismo modelo cuando existe."""
    artifacts_dir = tmp_path / "artifacts"
    _write_dbm_run(artifacts_dir, "run_dbm")
    _write_dbm_run(artifacts_dir, "run_global")
    _write_champion(
        artifacts_dir,
        dataset_id="2024-2",
        family="score_docente",
        run_id="run_dbm",
        model_name="dbm_manual",
    )
    _write_champion(
        artifacts_dir,
        dataset_id="2024-2",
        family="score_docente",
        run_id="run_global",
        model_name=None,
    )

    ws_path, trace = resolve_warm_start_path(
        artifacts_dir=artifacts_dir,
        dataset_id="2024-2",
        family="score_docente",
        model_name="dbm_manual",
        warm_start_from="champion",
    )

    assert ws_path is not None
    assert ws_path.name == "model"
    assert trace["warm_started"] is True
    assert trace["warm_start_source_run_id"] == "run_dbm"
    assert trace["warm_start_from"] == "champion"


def test_resolve_warm_start_ignores_cross_model_global_champion(tmp_path: Path) -> None:
    """Si no existe champion del mismo modelo, debe ignorar el champion global ajeno."""
    artifacts_dir = tmp_path / "artifacts"
    _write_dbm_run(artifacts_dir, "run_global")
    _write_champion(
        artifacts_dir,
        dataset_id="2024-2",
        family="score_docente",
        run_id="run_global",
        model_name=None,
    )

    ws_path, trace = resolve_warm_start_path(
        artifacts_dir=artifacts_dir,
        dataset_id="2024-2",
        family="score_docente",
        model_name="dbm_manual",
        warm_start_from="champion",
    )

    assert ws_path is None
    assert trace["warm_started"] is False
    assert trace["warm_start_reason"] == "cross_model_champion_ignored"
    assert trace["warm_start_cross_model_candidate"].endswith("champion.json")
