"""
tests/unit/test_dbm_strategy_preprocessing.py

Pruebas unitarias para validar el preprocesamiento específico del DBM manual.

Objetivos cubiertos por este módulo
-----------------------------------
- Verificar que la estrategia excluye identificadores numéricos crudos.
- Verificar que las features se escalan a [0, 1] antes del preentrenamiento.
- Verificar que el export del modelo persiste el scaler para inferencia.
- Verificar que el escalado corrige el patrón de pérdida plana en datos con
  magnitudes mayores a 1.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from neurocampus.models.strategies.dbm_manual_strategy import DBMManualPlantillaStrategy



def _make_regression_csv(tmp_path: Path) -> Path:
    """Crea un dataset sintético de regresión con columnas id-like y features en 0..50."""
    rng = np.random.default_rng(123)
    n = 48
    df = pd.DataFrame(
        {
            "periodo": [f"2025-{1 if i < n // 2 else 2}" for i in range(n)],
            "teacher_id": np.arange(1000, 1000 + n),
            "materia_id": np.arange(2000, 2000 + n),
            "score_media": rng.uniform(5.0, 45.0, size=n),
            "score_std": rng.uniform(0.1, 8.0, size=n),
            "sent_neg": rng.uniform(0.0, 15.0, size=n),
            "target": rng.uniform(10.0, 45.0, size=n),
        }
    )
    out = tmp_path / "dbm_regression.csv"
    df.to_csv(out, index=False)
    return out



def test_dbm_setup_excludes_id_columns_and_scales_inputs(tmp_path: Path):
    """El setup del DBM debe excluir IDs numéricos y escalar features a [0, 1]."""
    data_ref = _make_regression_csv(tmp_path)
    strategy = DBMManualPlantillaStrategy()

    strategy.setup(
        str(data_ref),
        {
            "task_type": "regression",
            "target_col": "target",
            "target_scale": 50.0,
            "split_mode": "temporal",
            "val_ratio": 0.25,
            "seed": 7,
        },
    )

    assert "teacher_id" not in strategy.feat_cols_
    assert "materia_id" not in strategy.feat_cols_
    assert strategy.scale_mode_ == "minmax"
    assert strategy.X_tr is not None and strategy.X_va is not None
    assert float(np.min(strategy.X_tr)) >= 0.0
    assert float(np.max(strategy.X_tr)) <= 1.0
    assert float(np.min(strategy.X_va)) >= 0.0
    assert float(np.max(strategy.X_va)) <= 1.0



def test_dbm_save_persists_input_scaler_for_inference(tmp_path: Path):
    """El export del DBM debe incluir el scaler de entrada cuando el modelo usa minmax."""
    data_ref = _make_regression_csv(tmp_path)
    strategy = DBMManualPlantillaStrategy()
    strategy.setup(
        str(data_ref),
        {
            "task_type": "regression",
            "target_col": "target",
            "target_scale": 50.0,
            "seed": 11,
        },
    )

    out_dir = tmp_path / "model"
    strategy.save(str(out_dir))

    assert (out_dir / "input_scaler.npz").exists()
    meta = pd.read_json(out_dir / "meta.json", typ="series")
    assert meta["scale_mode"] == "minmax"
    assert meta["exclude_id_like_features"] is True
    assert "teacher_id" in meta["excluded_numeric_cols"]



def test_dbm_minmax_scaling_reduces_reconstruction_loss_on_large_ranges(tmp_path: Path):
    """El escalado minmax debe evitar una pérdida de reconstrucción artificialmente plana."""
    data_ref = _make_regression_csv(tmp_path)

    raw_strategy = DBMManualPlantillaStrategy()
    raw_strategy.setup(
        str(data_ref),
        {
            "task_type": "regression",
            "target_col": "target",
            "target_scale": 50.0,
            "seed": 13,
            "scale_mode": "none",
            "exclude_id_like_features": True,
            "internal_epochs": 1,
        },
    )
    raw_metrics = raw_strategy.train_step(epoch=1, hparams={})

    scaled_strategy = DBMManualPlantillaStrategy()
    scaled_strategy.setup(
        str(data_ref),
        {
            "task_type": "regression",
            "target_col": "target",
            "target_scale": 50.0,
            "seed": 13,
            "scale_mode": "minmax",
            "exclude_id_like_features": True,
            "internal_epochs": 1,
        },
    )
    scaled_metrics = scaled_strategy.train_step(epoch=1, hparams={})

    assert float(raw_metrics["loss"]) > 1.0
    assert float(scaled_metrics["loss"]) < float(raw_metrics["loss"]) * 0.1
