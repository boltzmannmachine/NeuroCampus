import pytest
import os
import json
import numpy as np
from pathlib import Path
from neurocampus.models.strategies.dbm_manual_strategy import DBMManualPlantillaStrategy
from neurocampus.models.dbm_manual import DBMManual
from neurocampus.utils.warm_start import resolve_warm_start_path

def test_dbm_warm_start_flow(tmp_path):
    # Simulate an artifacts directory and a run_id
    artifacts_dir = tmp_path / "artifacts"
    run_id = "test_dbm_run_123"
    model_dir = artifacts_dir / "runs" / run_id / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    # Save a fake DBM manual model
    dbm = DBMManual(n_visible=12, n_hidden1=5, n_hidden2=3)
    dbm.save(str(model_dir))

    # Validate the backend resolve logic finds it
    ws_path, trace = resolve_warm_start_path(
        artifacts_dir=artifacts_dir,
        dataset_id="ds_1",
        family="sentiment_desempeno",
        model_name="dbm_manual",
        warm_start_from="run_id",
        warm_start_run_id=run_id
    )
    assert ws_path is not None
    assert str(model_dir) in str(ws_path)

    # Load via Strategy
    strategy = DBMManualPlantillaStrategy()

    # Fake setup data
    import pandas as pd
    df = pd.DataFrame(np.random.rand(10, 10), columns=[f"feat_{i}" for i in range(10)])
    # Add a target to prevent empty df failures
    df["y_sentimiento"] = np.random.randint(0, 3, size=10)
    df["calif_1"] = np.random.rand(10)
    dummy_csv = tmp_path / "dummy.csv"
    df.to_csv(dummy_csv, index=False)


    # Setup should trigger warm_start
    strategy.setup(str(dummy_csv), {
        "warm_start_path": str(ws_path),
        "warm_start_from": "run_id",
        "epochs": 1,
        "n_hidden1": 5,
        "n_hidden2": 3
    })

    assert strategy._warm_start_info_["warm_start"] == "ok"
    assert strategy.model.n_visible == 12



def test_dbm_warm_start_skips_incompatible_champion_dimensions(tmp_path):
    """El warm start implícito debe degradar a skipped cuando cambian las dimensiones."""
    model_dir = tmp_path / "artifacts" / "runs" / "warm_src" / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    dbm = DBMManual(n_visible=12, n_hidden1=5, n_hidden2=3)
    dbm.save(str(model_dir))

    strategy = DBMManualPlantillaStrategy()

    import pandas as pd
    df = pd.DataFrame(np.random.rand(10, 10), columns=[f"feat_{i}" for i in range(10)])
    df["target_score"] = np.random.rand(10)
    dummy_csv = tmp_path / "dummy_reg.csv"
    df.to_csv(dummy_csv, index=False)

    strategy.setup(str(dummy_csv), {
        "warm_start_path": str(model_dir),
        "warm_start_from": "champion",
        "task_type": "regression",
        "target_col": "target_score",
        "n_hidden1": 5,
        "n_hidden2": 3,
        "scale_mode": "minmax",
    })

    assert strategy._warm_start_info_["warm_start"] == "skipped"
    assert strategy._warm_start_info_["reason"] == "incompatible_dimensions"
    assert strategy._warm_start_info_["mismatched_dims"] == ["n_visible"]



def test_dbm_warm_start_run_id_remains_strict_on_incompatible_dimensions(tmp_path):
    """Un warm start explícito por run_id debe fallar si el modelo fuente es incompatible."""
    model_dir = tmp_path / "artifacts" / "runs" / "warm_src_strict" / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    dbm = DBMManual(n_visible=12, n_hidden1=5, n_hidden2=3)
    dbm.save(str(model_dir))

    strategy = DBMManualPlantillaStrategy()

    import pandas as pd
    df = pd.DataFrame(np.random.rand(10, 10), columns=[f"feat_{i}" for i in range(10)])
    df["target_score"] = np.random.rand(10)
    dummy_csv = tmp_path / "dummy_reg_strict.csv"
    df.to_csv(dummy_csv, index=False)

    with pytest.raises(ValueError):
        strategy.setup(str(dummy_csv), {
            "warm_start_path": str(model_dir),
            "warm_start_from": "run_id",
            "task_type": "regression",
            "target_col": "target_score",
            "n_hidden1": 5,
            "n_hidden2": 3,
            "scale_mode": "minmax",
        })
