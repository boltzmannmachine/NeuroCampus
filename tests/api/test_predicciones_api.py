from __future__ import annotations

import json
from pathlib import Path

import pytest

from neurocampus.predictions.bundle import build_predictor_manifest, bundle_paths, write_json
from neurocampus.utils.paths import artifacts_dir


class DummyPickleModel:
    """Modelo mínimo (picklable) para tests de inferencia P2.4.

    Implementa el subset de API que espera `predictions_service`:
    - predict_proba_df(df) -> np.ndarray (n, 3)
    - predict_df(df) -> List[str]

    Nota: se define a nivel de módulo para que pickle funcione en Windows.
    """

    labels = ["neg", "neu", "pos"]

    def predict_proba_df(self, df):
        import numpy as np

        n = int(len(df))
        proba = np.zeros((n, 3), dtype=float)
        proba[:, 1] = 1.0  # siempre 'neu'
        return proba

    def predict_df(self, df):
        return ["neu"] * int(len(df))


class DummyRegressionPickleModel:
    """Modelo mínimo de regresión 0-50 para tests de score_docente."""

    task_type = "regression"

    def predict_score_df(self, df):
        import numpy as np

        return np.full(int(len(df)), 41.0, dtype=float)

    def predict_df(self, df):
        return [41.0] * int(len(df))


def _write_pickled_run_bundle(base: Path, *, run_id: str, dataset_id: str = "ds") -> Path:
    """Crea un run_dir con predictor.json + model.bin pickled (listo para inferencia)."""
    import pickle

    run_dir = base / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    bp = bundle_paths(run_dir)

    manifest = build_predictor_manifest(
        run_id=run_id,
        dataset_id=dataset_id,
        model_name="rbm_general",
        task_type="classification",
        input_level="row",
        target_col="y_sentimiento",
        extra={"family": "sentiment_desempeno"},
    )
    write_json(bp.predictor_json, manifest)
    write_json(bp.preprocess_json, {"schema_version": 1, "notes": "test"})

    with open(bp.model_bin, "wb") as fh:
        pickle.dump(DummyPickleModel(), fh)

    return run_dir


def _write_pickled_score_run_bundle(base: Path, *, run_id: str, dataset_id: str) -> Path:
    """Crea un run_dir pickled apto para score_docente (regresión)."""
    import pickle

    run_dir = base / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    bp = bundle_paths(run_dir)

    manifest = build_predictor_manifest(
        run_id=run_id,
        dataset_id=dataset_id,
        model_name="dbm_manual",
        task_type="regression",
        input_level="pair",
        target_col="score_total_0_50",
        extra={"family": "score_docente"},
    )
    write_json(bp.predictor_json, manifest)
    write_json(bp.preprocess_json, {"schema_version": 1, "notes": "score test"})

    with open(bp.model_bin, "wb") as fh:
        pickle.dump(DummyRegressionPickleModel(), fh)

    return run_dir


def _write_real_run_bundle(base: Path, *, run_id: str, dataset_id: str = "ds", family: str = "sentiment_desempeno") -> Path:
    """Crea un run_dir con predictor.json + model.bin 'real' (no placeholder)."""
    run_dir = base / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    bp = bundle_paths(run_dir)

    manifest = build_predictor_manifest(
        run_id=run_id,
        dataset_id=dataset_id,
        model_name="rbm_general",
        task_type="classification",
        input_level="row",
        target_col="y_sentimiento",
        extra={"family": family},
    )
    write_json(bp.predictor_json, manifest)
    write_json(bp.preprocess_json, {"schema_version": 1, "notes": "test"})
    bp.model_bin.write_bytes(b"REAL_MODEL_BYTES_v1")

    return run_dir


def _write_placeholder_run_bundle(base: Path, *, run_id: str) -> Path:
    """Crea un run_dir con model.bin placeholder (P2.1)."""
    run_dir = base / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    bp = bundle_paths(run_dir)

    manifest = build_predictor_manifest(
        run_id=run_id,
        dataset_id="ds",
        model_name="rbm_general",
        task_type="classification",
        input_level="row",
        target_col="y",
    )
    write_json(bp.predictor_json, manifest)
    bp.model_bin.write_bytes(b"PLACEHOLDER_MODEL_BIN_P2_1")
    return run_dir



def _write_legacy_run_bundle_with_unknowns(
    base: Path,
    *,
    run_id: str,
    dataset_id: str,
    family: str,
    model_name: str = "rbm_general",
) -> Path:
    """Crea un run_dir "legacy" con predictor.json incompleto/unknown.

    Se acompaña con metrics.json que incluye params.req con el contexto correcto.
    Esto valida el backfill P2.1 en /predicciones/model-info y /predicciones/predict.
    """
    run_dir = base / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    bp = bundle_paths(run_dir)

    legacy_manifest = {
        "run_id": run_id,
        "dataset_id": dataset_id,
        "model_name": model_name,
        "task_type": "unknown",
        "input_level": None,
        "target_col": None,
        "extra": {"family": family},
    }
    write_json(bp.predictor_json, legacy_manifest)
    write_json(bp.preprocess_json, {"schema_version": 1, "notes": "legacy test"})
    bp.model_bin.write_bytes(b"REAL_MODEL_BYTES_v1")

    metrics = {
        "run_id": run_id,
        "dataset_id": dataset_id,
        "model_name": model_name,
        "family": family,
        "params": {
            "req": {
                "dataset_id": dataset_id,
                "family": family,
                "model_name": model_name,
                "task_type": "classification",
                "input_level": "row",
                "target_col": "y_sentimiento",
                "data_source": "feature_pack",
            }
        },
    }
    write_json(run_dir / "metrics.json", metrics)
    return run_dir

def _write_champion(base: Path, *, family: str, dataset_id: str, run_id: str) -> Path:
    champ = base / "champions" / family / dataset_id / "champion.json"
    champ.parent.mkdir(parents=True, exist_ok=True)
    champ.write_text(json.dumps({"source_run_id": run_id}, indent=2), encoding="utf-8")
    return champ


def test_predicciones_health_ok(client):
    r = client.get("/predicciones/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "ok"
    assert "artifacts_dir" in data


def test_predicciones_predict_by_run_id_ok(client, artifacts_dir: Path, monkeypatch):
    # Asegura que el router use este artifacts_dir
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_real"
    _write_real_run_bundle(base, run_id=run_id, dataset_id="ds_api")

    r = client.post("/predicciones/predict", json={"run_id": run_id})
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["resolved_from"] == "run_id"
    assert body["resolved_run_id"] == run_id
    assert body["predictor"]["run_id"] == run_id


def test_predicciones_predict_by_champion_ok(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_real_champ"
    dataset_id = "ds_champ"
    family = "sentiment_desempeno"

    _write_real_run_bundle(base, run_id=run_id, dataset_id=dataset_id, family=family)
    _write_champion(base, family=family, dataset_id=dataset_id, run_id=run_id)

    r = client.post(
        "/predicciones/predict",
        json={"use_champion": True, "dataset_id": dataset_id, "family": family},
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["resolved_from"] == "champion"
    assert body["resolved_run_id"] == run_id


def test_predicciones_predict_champion_not_found_404(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))

    r = client.post(
        "/predicciones/predict",
        json={"use_champion": True, "dataset_id": "missing_ds", "family": "sentiment_desempeno"},
    )
    assert r.status_code == 404, r.text


def test_predicciones_predict_placeholder_422(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_placeholder"
    _write_placeholder_run_bundle(base, run_id=run_id)

    r = client.post("/predicciones/predict", json={"run_id": run_id})
    assert r.status_code == 422, r.text


def test_predicciones_predict_run_not_found_404(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))

    run_id = "run_missing_bundle"
    r = client.post("/predicciones/predict", json={"run_id": run_id})

    assert r.status_code == 404, r.text
    detail = r.json().get("detail", "")
    assert run_id in detail


def test_predicciones_predict_champion_points_to_missing_run_404(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_missing_bundle_champ"
    dataset_id = "ds_champ_missing_bundle"
    family = "sentiment_desempeno"

    _write_champion(base, family=family, dataset_id=dataset_id, run_id=run_id)

    r = client.post(
        "/predicciones/predict",
        json={"use_champion": True, "dataset_id": dataset_id, "family": family},
    )

    assert r.status_code == 404, r.text
    detail = r.json().get("detail", "")
    assert run_id in detail


def test_predicciones_predict_champion_missing_source_run_id_422(client, artifacts_dir: Path, monkeypatch):
    """Si champion.json existe pero no incluye source_run_id, debe ser 422 (PredictorNotReadyError)."""
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    dataset_id = "ds_champ_missing_source_run_id"
    family = "sentiment_desempeno"

    champ = base / "champions" / family / dataset_id / "champion.json"
    champ.parent.mkdir(parents=True, exist_ok=True)
    champ.write_text(json.dumps({"note": "missing source_run_id"}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/predict",
        json={"use_champion": True, "dataset_id": dataset_id, "family": family},
    )

    assert r.status_code == 422, r.text


def test_predicciones_model_info_by_run_id_ok(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_model_info_ok"
    _write_real_run_bundle(base, run_id=run_id, dataset_id="ds_model_info")

    r = client.get("/predicciones/model-info", params={"run_id": run_id})
    assert r.status_code == 200, r.text

    payload = r.json()
    assert payload["resolved_run_id"] == run_id
    assert payload["resolved_from"] == "run_id"
    assert "predictor" in payload
    assert "preprocess" in payload



def test_predicciones_backfill_context_from_metrics_req(client, artifacts_dir: Path, monkeypatch):
    """Si predictor.json trae unknown/null pero metrics.params.req trae el contexto, la API debe backfillear."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_legacy_unknown_ctx"
    dataset_id = "ds_legacy_ctx"
    family = "sentiment_desempeno"

    _write_legacy_run_bundle_with_unknowns(base, run_id=run_id, dataset_id=dataset_id, family=family)

    # model-info
    r1 = client.get("/predicciones/model-info", params={"run_id": run_id})
    assert r1.status_code == 200, r1.text
    payload = r1.json()
    pred = payload["predictor"]

    assert pred.get("task_type") == "classification"
    assert pred.get("input_level") == "row"
    assert pred.get("target_col") == "y_sentimiento"
    assert pred.get("extra", {}).get("family") == family
    assert pred.get("extra", {}).get("data_source") == "feature_pack"

    # predict (resolve/validate)
    r2 = client.post("/predicciones/predict", json={"run_id": run_id})
    assert r2.status_code == 200, r2.text
    body = r2.json()
    pred2 = body["predictor"]

    assert pred2.get("task_type") == "classification"
    assert pred2.get("input_level") == "row"
    assert pred2.get("target_col") == "y_sentimiento"
    assert pred2.get("extra", {}).get("family") == family
    assert pred2.get("extra", {}).get("data_source") == "feature_pack"
def test_predicciones_model_info_by_champion_ok(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_model_info_champion_ok"
    dataset_id = "ds_model_info_champ"
    family = "sentiment_desempeno"

    _write_real_run_bundle(base, run_id=run_id, dataset_id=dataset_id, family=family)
    _write_champion(base, family=family, dataset_id=dataset_id, run_id=run_id)

    r = client.get(
        "/predicciones/model-info",
        params={"use_champion": True, "dataset_id": dataset_id, "family": family},
    )
    assert r.status_code == 200, r.text

    payload = r.json()
    assert payload["resolved_run_id"] == run_id
    assert payload["resolved_from"] == "champion"


def test_predicciones_model_info_champion_missing_source_run_id_422(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    dataset_id = "ds_model_info_missing_source"
    family = "sentiment_desempeno"

    champ = base / "champions" / family / dataset_id / "champion.json"
    champ.parent.mkdir(parents=True, exist_ok=True)
    champ.write_text(json.dumps({"note": "missing source_run_id"}, indent=2), encoding="utf-8")

    r = client.get(
        "/predicciones/model-info",
        params={"use_champion": True, "dataset_id": dataset_id, "family": family},
    )
    assert r.status_code == 422, r.text


def test_predicciones_model_info_run_not_found_404(client, artifacts_dir: Path, monkeypatch):
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))

    run_id = "run_model_info_missing_bundle"
    r = client.get("/predicciones/model-info", params={"run_id": run_id})

    assert r.status_code == 404, r.text


def test_predicciones_cache_isolated_by_artifacts_dir(client, artifacts_dir: Path, monkeypatch):
    """El cache LRU debe aislarse por NC_ARTIFACTS_DIR.

    Si cambiamos NC_ARTIFACTS_DIR entre requests, no debe re-usar el bundle
    cacheado del directorio anterior.
    """

    # artifacts A
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base_a = artifacts_dir

    run_id = "run_cache_isolation"
    _write_real_run_bundle(base_a, run_id=run_id, dataset_id="ds_cache")

    r1 = client.post("/predicciones/predict", json={"run_id": run_id})
    assert r1.status_code == 200, r1.text

    # artifacts B (vacío)
    base_b = artifacts_dir.parent / "artifacts_b"
    base_b.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(base_b))

    r2 = client.post("/predicciones/predict", json={"run_id": run_id})
    assert r2.status_code == 404, r2.text


def test_predicciones_predict_feature_pack_inference_ok(client, artifacts_dir: Path, monkeypatch):
    """Smoke test P2.4: inferencia opt-in desde feature_pack (train_matrix.parquet)."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_pickle_infer"
    dataset_id = "ds_infer"

    _write_pickled_run_bundle(base, run_id=run_id, dataset_id=dataset_id)

    # Crear feature_pack mínimo
    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    import pandas as pd

    df = pd.DataFrame(
        {
            "teacher_id": [1, 2, 3],
            "materia_id": [10, 20, 30],
            **{f"calif_{i+1}": [1, 2, 3] for i in range(10)},
        }
    )
    df.to_parquet(feat_dir / "train_matrix.parquet", index=False)
    (feat_dir / "meta.json").write_text(json.dumps({"dataset_id": dataset_id}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/predict",
        json={
            "run_id": run_id,
            "do_inference": True,
            "input_uri": "feature_pack",
            "limit": 2,
            "offset": 1,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["resolved_run_id"] == run_id
    assert body.get("predictions") is not None
    assert len(body["predictions"]) == 2

    # DummyPickleModel siempre retorna 'neu'
    assert body["predictions"][0]["label"] == "neu"
    assert "proba" in body["predictions"][0]


def test_predicciones_predict_feature_pack_inference_persist_ok(client, artifacts_dir: Path, monkeypatch):
    """P2.4-C: persistencia opt-in de predictions.parquet."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_pickle_infer_persist"
    dataset_id = "ds_infer_persist"
    family = "sentiment_desempeno"

    _write_pickled_run_bundle(base, run_id=run_id, dataset_id=dataset_id)

    # Crear feature_pack mínimo
    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    import pandas as pd

    df = pd.DataFrame(
        {
            "teacher_id": [1, 2, 3],
            "materia_id": [10, 20, 30],
            **{f"calif_{i+1}": [1, 2, 3] for i in range(10)},
        }
    )
    df.to_parquet(feat_dir / "train_matrix.parquet", index=False)
    (feat_dir / "meta.json").write_text(json.dumps({"dataset_id": dataset_id}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/predict",
        json={
            "run_id": run_id,
            "do_inference": True,
            "input_uri": "feature_pack",
            "persist": True,
            "family": family,
            "limit": 1,
            "offset": 0,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body.get("predictions") is not None
    assert len(body["predictions"]) == 1

    uri = body.get("predictions_uri")
    assert uri, body

    # Verificar en disco que se escribió el parquet
    from neurocampus.utils.paths import abs_artifact_path

    parquet_path = abs_artifact_path(uri)
    assert parquet_path.exists(), f"No existe: {parquet_path} (uri={uri})"

    out_df = pd.read_parquet(parquet_path)
    assert len(out_df) == 1
    assert "label" in out_df.columns

    # schema.json opcional (pero recomendado) debe existir
    schema_path = parquet_path.parent / "schema.json"
    assert schema_path.exists(), f"No existe schema.json: {schema_path}"



def test_predicciones_predict_persist_requires_inference_422(client, artifacts_dir: Path, monkeypatch):
    """Si persist=true pero do_inference=false, debe ser 422."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_test_pickle_persist_requires_infer"
    dataset_id = "ds_persist_requires_infer"

    _write_pickled_run_bundle(base, run_id=run_id, dataset_id=dataset_id)

    r = client.post(
        "/predicciones/predict",
        json={
            "run_id": run_id,
            "persist": True,
        },
    )
    assert r.status_code == 422, r.text

def test_predicciones_outputs_preview_ok(client, artifacts_dir: Path, monkeypatch):
    """P2.4-E: preview JSON de predictions.parquet persistido."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_outputs_preview"
    dataset_id = "ds_outputs_preview"
    family = "sentiment_desempeno"

    _write_pickled_run_bundle(base, run_id=run_id, dataset_id=dataset_id)

    # Crear feature_pack mínimo
    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    import pandas as pd

    df = pd.DataFrame(
        {
            "teacher_id": [1, 2],
            "materia_id": [10, 20],
            **{f"calif_{i+1}": [1, 2] for i in range(10)},
        }
    )
    df.to_parquet(feat_dir / "train_matrix.parquet", index=False)
    (feat_dir / "meta.json").write_text(json.dumps({"dataset_id": dataset_id}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/predict",
        json={
            "run_id": run_id,
            "do_inference": True,
            "input_uri": "feature_pack",
            "persist": True,
            "family": family,
            "limit": 2,
            "offset": 0,
        },
    )
    assert r.status_code == 200, r.text
    uri = r.json().get("predictions_uri")
    assert uri

    p = client.get("/predicciones/outputs/preview", params={"predictions_uri": uri, "limit": 1, "offset": 0})
    assert p.status_code == 200, p.text
    body = p.json()

    assert body["predictions_uri"] == uri
    assert isinstance(body["rows"], list)
    assert len(body["rows"]) == 1
    assert "label" in body["rows"][0]
    assert "label" in body["columns"]


def test_predicciones_outputs_file_ok(client, artifacts_dir: Path, monkeypatch):
    """P2.4-E: descarga de predictions.parquet persistido."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    run_id = "run_outputs_file"
    dataset_id = "ds_outputs_file"
    family = "sentiment_desempeno"

    _write_pickled_run_bundle(base, run_id=run_id, dataset_id=dataset_id)

    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    import pandas as pd

    df = pd.DataFrame(
        {
            "teacher_id": [1],
            "materia_id": [10],
            **{f"calif_{i+1}": [1] for i in range(10)},
        }
    )
    df.to_parquet(feat_dir / "train_matrix.parquet", index=False)
    (feat_dir / "meta.json").write_text(json.dumps({"dataset_id": dataset_id}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/predict",
        json={
            "run_id": run_id,
            "do_inference": True,
            "input_uri": "feature_pack",
            "persist": True,
            "family": family,
            "limit": 1,
            "offset": 0,
        },
    )
    assert r.status_code == 200, r.text
    uri = r.json().get("predictions_uri")
    assert uri

    f = client.get("/predicciones/outputs/file", params={"predictions_uri": uri})
    assert f.status_code == 200, f.text

    # Validar firma parquet (magic bytes)
    assert f.content[:4] == b"PAR1"


def test_predicciones_outputs_invalid_uri_422(client, artifacts_dir: Path, monkeypatch):
    """Si predictions_uri apunta fuera de artifacts/predictions, debe ser 422."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))

    bad_uri = "artifacts/runs/some_run/predictor.json"
    r = client.get("/predicciones/outputs/preview", params={"predictions_uri": bad_uri})
    assert r.status_code == 422, r.text


def test_predicciones_individual_existing_pair_uses_teacher_materia_context_for_high_confidence(
    client, artifacts_dir: Path, monkeypatch
):
    """Un par existente con poco n_par pero fuerte contexto no debe quedar en 7%-13%."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    import pandas as pd

    run_id = "run_score_context_high"
    dataset_id = "ds_score_context_high"

    _write_pickled_score_run_bundle(base, run_id=run_id, dataset_id=dataset_id)
    _write_champion(base, family="score_docente", dataset_id=dataset_id, run_id=run_id)

    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    rows = [
        {
            "teacher_key": "doc_a",
            "materia_key": "mat_target",
            "teacher_id": 1,
            "materia_id": 10,
            "periodo": "2025-1",
            "n_par": 1,
            "n_docente": 42,
            "n_materia": 35,
            "mean_score_total_0_50": 40.0,
            "std_score_total_0_50": 1.0,
        },
        {
            "teacher_key": "doc_a",
            "materia_key": "mat_other",
            "teacher_id": 1,
            "materia_id": 11,
            "periodo": "2025-1",
            "n_par": 12,
            "n_docente": 42,
            "n_materia": 8,
            "mean_score_total_0_50": 38.0,
            "std_score_total_0_50": 2.0,
        },
        {
            "teacher_key": "doc_b",
            "materia_key": "mat_target",
            "teacher_id": 2,
            "materia_id": 10,
            "periodo": "2025-1",
            "n_par": 10,
            "n_docente": 9,
            "n_materia": 35,
            "mean_score_total_0_50": 39.0,
            "std_score_total_0_50": 1.5,
        },
    ]
    for row in rows:
        for i in range(10):
            row[f"mean_calif_{i + 1}"] = 4.0

    pd.DataFrame(rows).to_parquet(feat_dir / "pair_matrix.parquet", index=False)
    (feat_dir / "teacher_index.json").write_text(json.dumps({"doc_a": 1, "doc_b": 2}, indent=2), encoding="utf-8")
    (feat_dir / "materia_index.json").write_text(
        json.dumps({"mat_target": 10, "mat_other": 11}, indent=2),
        encoding="utf-8",
    )

    r = client.post(
        "/predicciones/individual",
        json={
            "dataset_id": dataset_id,
            "teacher_key": "doc_a",
            "materia_key": "mat_target",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["cold_pair"] is False
    assert body["evidence"]["n_par"] == 1
    assert body["evidence"]["n_docente"] == 42
    assert body["evidence"]["n_materia"] == 35
    assert body["confidence"] == pytest.approx(0.85, abs=1e-4)


def test_predicciones_individual_allows_cold_pair_and_keeps_confidence_low_without_relation(
    client, artifacts_dir: Path, monkeypatch
):
    """Debe seguir permitiendo pares fríos si docente y materia existen, pero con confianza baja."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    import pandas as pd

    run_id = "run_score_cold_pair"
    dataset_id = "ds_score_cold_pair"

    _write_pickled_score_run_bundle(base, run_id=run_id, dataset_id=dataset_id)
    _write_champion(base, family="score_docente", dataset_id=dataset_id, run_id=run_id)

    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    rows = [
        {
            "teacher_key": "doc_a",
            "materia_key": "mat_seen",
            "teacher_id": 1,
            "materia_id": 10,
            "periodo": "2025-1",
            "n_par": 8,
            "n_docente": 18,
            "n_materia": 8,
            "mean_score_total_0_50": 37.0,
            "std_score_total_0_50": 3.0,
        },
        {
            "teacher_key": "doc_other",
            "materia_key": "mat_target",
            "teacher_id": 2,
            "materia_id": 11,
            "periodo": "2025-1",
            "n_par": 9,
            "n_docente": 9,
            "n_materia": 16,
            "mean_score_total_0_50": 39.0,
            "std_score_total_0_50": 4.0,
        },
    ]
    for row in rows:
        for i in range(10):
            row[f"mean_calif_{i + 1}"] = 4.0

    pd.DataFrame(rows).to_parquet(feat_dir / "pair_matrix.parquet", index=False)
    (feat_dir / "teacher_index.json").write_text(
        json.dumps({"doc_a": 1, "doc_other": 2}, indent=2),
        encoding="utf-8",
    )
    (feat_dir / "materia_index.json").write_text(
        json.dumps({"mat_seen": 10, "mat_target": 11}, indent=2),
        encoding="utf-8",
    )

    r = client.post(
        "/predicciones/individual",
        json={
            "dataset_id": dataset_id,
            "teacher_key": "doc_a",
            "materia_key": "mat_target",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["cold_pair"] is True
    assert body["evidence"]["n_par"] == 0
    assert body["evidence"]["n_docente"] == 18
    assert body["evidence"]["n_materia"] == 16
    assert 0.10 <= body["confidence"] <= 0.20


def test_predicciones_individual_uses_full_pair_history_for_confidence(client, artifacts_dir: Path, monkeypatch):
    """La confianza debe agregar la evidencia histórica de todos los periodos del par."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    import pandas as pd

    run_id = "run_score_history_conf"
    dataset_id = "ds_score_history_conf"
    teacher_key = "doc_1"
    materia_key = "mat_1"

    _write_pickled_score_run_bundle(base, run_id=run_id, dataset_id=dataset_id)
    _write_champion(base, family="score_docente", dataset_id=dataset_id, run_id=run_id)

    feat_dir = base / "features" / dataset_id
    feat_dir.mkdir(parents=True, exist_ok=True)

    base_row = {
        "teacher_key": teacher_key,
        "materia_key": materia_key,
        "teacher_id": 1,
        "materia_id": 10,
        "n_docente": 15,
        "n_materia": 20,
        "mean_score_total_0_50": 35.0,
        "std_score_total_0_50": 8.0,
    }
    for i in range(10):
        base_row[f"mean_calif_{i + 1}"] = 4.0

    rows = [
        {
            **base_row,
            "periodo": "2024-1",
            "n_par": 14,
        },
        {
            **base_row,
            "periodo": "2024-2",
            "n_par": 1,
        },
    ]
    pd.DataFrame(rows).to_parquet(feat_dir / "pair_matrix.parquet", index=False)

    r = client.post(
        "/predicciones/individual",
        json={
            "dataset_id": dataset_id,
            "teacher_key": teacher_key,
            "materia_key": materia_key,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["score_total_pred"] == 41.0
    assert body["evidence"]["n_par"] == 15
    assert body["historical"]["mean_score"] == 35.0
    assert body["historical"]["std_score"] == pytest.approx(7.71, abs=1e-2)
    assert body["confidence"] == pytest.approx(0.6917, abs=1e-4)
    assert body["timeline"][-1]["semester"] == "2024-2"
    assert body["timeline"][-1]["predicted"] == 41.0


def test_predicciones_historico_refreshes_legacy_pair_artifacts(client, artifacts_dir: Path, monkeypatch):
    """historico-unificado debe regenerarse desde feature-packs si el artifact es legacy."""

    monkeypatch.setenv("NC_ARTIFACTS_DIR", str(artifacts_dir))
    base = artifacts_dir

    import pandas as pd

    run_id = "run_score_historico_refresh"
    dataset_id = "historico-unificado"
    teacher_key = "doc_hist"
    materia_key = "mat_hist"

    _write_pickled_score_run_bundle(base, run_id=run_id, dataset_id=dataset_id)
    _write_champion(base, family="score_docente", dataset_id=dataset_id, run_id=run_id)

    def _pair_row(periodo: str, n_par: int, mean_score: float = 35.0, std_score: float = 2.0) -> dict:
        row = {
            "teacher_key": teacher_key,
            "materia_key": materia_key,
            "teacher_id": 1,
            "materia_id": 10,
            "periodo": periodo,
            "n_par": n_par,
            "n_docente": 30,
            "n_materia": 40,
            "mean_score_total_0_50": mean_score,
            "std_score_total_0_50": std_score,
        }
        for i in range(10):
            row[f"mean_calif_{i + 1}"] = 4.0
        return row

    for ds_name, n_par, mean_score in (("2024-2", 20, 35.0), ("2025-1", 22, 36.0)):
        feat_dir = base / "features" / ds_name
        feat_dir.mkdir(parents=True, exist_ok=True)
        pd.DataFrame([_pair_row(ds_name, n_par=n_par, mean_score=mean_score)]).to_parquet(
            feat_dir / "pair_matrix.parquet",
            index=False,
        )
        (feat_dir / "pair_meta.json").write_text(
            json.dumps({"dataset_id": ds_name, "target_col": "score_total_0_50"}, indent=2),
            encoding="utf-8",
        )

    # Artifact legacy que antes quedaba "congelado" y aplastaba la confianza.
    hist_dir = base / "features" / dataset_id
    hist_dir.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([_pair_row("2025-1", n_par=1, mean_score=35.5, std_score=0.0)]).to_parquet(
        hist_dir / "pair_matrix.parquet",
        index=False,
    )
    (hist_dir / "pair_meta.json").write_text(
        json.dumps(
            {
                "dataset_id": dataset_id,
                "input_uri": "historico/unificado_labeled.parquet",
                "row_granularity": "teacher-materia-periodo",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (hist_dir / "teacher_index.json").write_text(json.dumps({teacher_key: 1}, indent=2), encoding="utf-8")
    (hist_dir / "materia_index.json").write_text(json.dumps({materia_key: 10}, indent=2), encoding="utf-8")

    r = client.post(
        "/predicciones/individual",
        json={
            "dataset_id": dataset_id,
            "teacher_key": teacher_key,
            "materia_key": materia_key,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["evidence"]["n_par"] == 42
    assert body["confidence"] > 0.85

    pair_meta = json.loads((hist_dir / "pair_meta.json").read_text(encoding="utf-8"))
    assert pair_meta.get("derived_from_feature_packs") is True
