"""
neurocampus.utils.warm_start
============================

Helper de resolución de warm-start para modelos RBM entrenados vía API.

Expone:
    resolve_warm_start_path(...)
        Dada la configuración del request (warm_start_from, warm_start_run_id,
        dataset_id, family), devuelve:
        - el Path absoluto al directorio ``model/`` del run base, o None si
          warm_start_from == "none".
        - un dict de trazabilidad listo para guardar en metrics/job_meta.

Reglas de resolución
--------------------
- warm_start_from="none" → retorna (None, traza vacía).
- warm_start_from="run_id" → busca ``artifacts/runs/<warm_start_run_id>/model/``.
- warm_start_from="champion" → lee champion.json, extrae source_run_id y
  reutiliza la misma resolución que "run_id".

Errores
-------
- 404 si el run o el champion.json no existen.
- 422 si existen pero les falta el directorio ``model/`` o archivos mínimos.
- 422 si warm_start_from="run_id" pero warm_start_run_id está vacío.
- 422 si champion existe pero no tiene source_run_id.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
import datetime as dt
import numpy as np
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Archivos mínimos por familia de modelo
# RBM (pytorch): meta.json + al menos uno de rbm.pt / head.pt
_RBM_REQUIRED_FILES = {"meta.json"}
_RBM_WEIGHT_FILES   = {"rbm.pt", "head.pt"}

# DBM (numpy): meta.json + dbm_state.npz
_DBM_REQUIRED_FILES = {"meta.json", "dbm_state.npz"}


def _slug(s: str) -> str:
    return str(s).strip().lower().replace(" ", "_")

def _candidate_champion_paths(
    artifacts_dir: Path,
    dataset_id: str,
    family: Optional[str],
    model_name: Optional[str] = None,
    *,
    allow_cross_model_fallback: bool = False,
) -> list[Path]:
    """Construye, en orden de prioridad, las rutas candidatas de champion.

    Parámetros
    ----------
    artifacts_dir:
        Directorio raíz de artifacts.
    dataset_id:
        Dataset/periodo para el que se busca champion.
    family:
        Familia del modelo.
    model_name:
        Nombre lógico del modelo que se desea warm-start.
    allow_cross_model_fallback:
        Cuando es ``False`` y ``model_name`` está definido, la búsqueda se limita a
        champions del mismo modelo. Esto evita reutilizar un champion global de otra
        arquitectura durante warm start. Cuando es ``True``, se conservan los
        fallbacks legacy/globales para compatibilidad.
    """
    candidates: list[Path] = []
    ds = _slug(dataset_id)
    fam = _slug(family) if family else None
    mn = _slug(model_name) if model_name else None

    # Layout actual por familia/dataset/modelo.
    if fam and mn:
        candidates.append(artifacts_dir / "champions" / fam / ds / mn / "champion.json")
    # Layout legacy por dataset/modelo.
    if mn:
        candidates.append(artifacts_dir / "champions" / ds / mn / "champion.json")

    # Importante: el fallback global solo es válido cuando se permite mezclar
    # arquitecturas o cuando no conocemos el nombre del modelo destino.
    if allow_cross_model_fallback or not mn:
        if fam:
            candidates.append(artifacts_dir / "champions" / fam / ds / "champion.json")
        candidates.append(artifacts_dir / "champions" / ds / "champion.json")

    return candidates


def _find_champion_json(
    artifacts_dir: Path,
    dataset_id: str,
    family: Optional[str],
    model_name: Optional[str] = None,
    *,
    allow_cross_model_fallback: bool = False,
) -> Optional[Path]:
    """Resuelve el ``champion.json`` aplicando una política explícita de fallback.

    Por defecto, cuando ``model_name`` está definido, la búsqueda queda restringida
    al champion del mismo modelo. Esto evita warm starts cruzados entre modelos con
    arquitecturas distintas dentro de sweeps o entrenamientos secuenciales.
    """
    for p in _candidate_champion_paths(
        artifacts_dir,
        dataset_id,
        family,
        model_name=model_name,
        allow_cross_model_fallback=allow_cross_model_fallback,
    ):
        if p.is_file():
            return p
    return None

def _repair_dbm_meta_if_missing(model_dir: Path, *, run_id: str) -> bool:
    """
    Repara runs legacy DBM que tienen dbm_state.npz pero no meta.json.

    Retorna True si escribió meta.json, False si no hizo nada.
    """
    meta_path = model_dir / "meta.json"
    npz_path = model_dir / "dbm_state.npz"

    if meta_path.exists():
        return False
    if not npz_path.exists():
        return False

    try:
        with np.load(npz_path) as z:
            W1 = z.get("W1")
            W2 = z.get("W2")

        n_visible = int(W1.shape[0]) if W1 is not None and hasattr(W1, "shape") else None
        n_hidden1 = int(W1.shape[1]) if W1 is not None and hasattr(W1, "shape") else None
        n_hidden2 = int(W2.shape[1]) if W2 is not None and hasattr(W2, "shape") else None

        meta = {
            "schema_version": 1,
            "n_visible": n_visible,
            "n_hidden1": n_hidden1,
            "n_hidden2": n_hidden2,
            "hparams": {
                "lr": 0.01,
                "cd_k": 1,
                "seed": 42,
                "l2": 0.0,
                "clip_grad": 1.0,
                "binarize_input": False,
                "input_bin_threshold": 0.5,
                "use_pcd": False,
            },
            "legacy_repaired": True,
            "repaired_at": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "source_run_id": str(run_id),
        }

        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        logger.warning("warm_start: se reparó meta.json faltante (DBM legacy) run_id=%s dir=%s", run_id, model_dir)
        return True
    except Exception as exc:
        logger.warning("warm_start: no se pudo reparar meta.json DBM legacy run_id=%s (%s)", run_id, exc)
        return False


def _validate_model_dir(model_dir: Path, run_id: str) -> None:
    """Valida que un model_dir sea usable para warm-start.

    - Siempre inicializa `present` (evita UnboundLocalError).
    - Repara DBM legacy: si existe dbm_state.npz y falta meta.json, intenta crear meta.json.
    """
    if not model_dir.exists() or not model_dir.is_dir():
        raise HTTPException(
            status_code=422,
            detail=f"El model/ del run '{run_id}' no existe o no es directorio: {model_dir}",
        )

    # 1) Siempre definir present ANTES de usarlo
    present = {p.name for p in model_dir.iterdir() if p.is_file()}

    # 2) Reparación DBM legacy (meta.json faltante pero hay dbm_state.npz)
    if "meta.json" not in present and "dbm_state.npz" in present:
        if _repair_dbm_meta_if_missing(model_dir, run_id=run_id):
            present = {p.name for p in model_dir.iterdir() if p.is_file()}

    # 3) meta.json es obligatorio
    if "meta.json" not in present:
        raise HTTPException(
            status_code=422,
            detail=(
                f"El model/ del run '{run_id}' no contiene meta.json. "
                f"Presentes: {sorted(present)}."
            ),
        )

    # 4) Debe haber al menos un set de pesos reconocido
    has_any_weights = any(
        f in present
        for f in (
            "rbm.pt",          # RBM
            "head.pt",         # head clasif/reg
            "dbm_state.npz",   # DBM manual
            "model.bin",       # compat (si aplica)
        )
    )
    if not has_any_weights:
        raise HTTPException(
            status_code=422,
            detail=(
                f"El model/ del run '{run_id}' no contiene pesos reconocidos. "
                f"Presentes: {sorted(present)}."
            ),
        )


def resolve_warm_start_path(
    *,
    artifacts_dir: Path,
    dataset_id: str,
    family: Optional[str],
    model_name: str,
    warm_start_from: Optional[str],
    warm_start_run_id: Optional[str] = None,
) -> Tuple[Optional[Path], Dict[str, Any]]:
    """
    Resuelve el warm-start path para un entrenamiento RBM.

    Parámetros
    ----------
    artifacts_dir:
        Raíz de artifacts (NC_ARTIFACTS_DIR).
    dataset_id:
        Dataset/periodo del nuevo entrenamiento.
    family:
        Familia del modelo (p.ej. "sentiment_desempeno").
    model_name:
        Nombre lógico del modelo (p.ej. "rbm_general").
    warm_start_from:
        "none", "run_id" o "champion".
    warm_start_run_id:
        run_id base cuando warm_start_from="run_id".

    Retorna
    -------
    (warm_start_path, traza)
        - warm_start_path: Path al directorio model/ listo para cargar, o None.
        - traza: dict con campos de trazabilidad.

    Lanza
    -----
    HTTPException(404) si el run / champion.json no existe.
    HTTPException(422) si la configuración es inválida o el model/ está incompleto.
    """
    mode = (warm_start_from or "none").strip().lower()

    _empty_trace: Dict[str, Any] = {
        "warm_started": False,
        "warm_start_from": None,
        "warm_start_source_run_id": None,
        "warm_start_path": None,
    }

    if mode == "none":
        return None, _empty_trace

    # ---- Modo run_id -------------------------------------------------------
    if mode == "run_id":
        if not warm_start_run_id or not str(warm_start_run_id).strip():
            raise HTTPException(
                status_code=422,
                detail="warm_start_run_id es requerido cuando warm_start_from='run_id'.",
            )

        run_id = str(warm_start_run_id).strip()
        run_dir = (artifacts_dir / "runs" / run_id).resolve()

        if not run_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No existe el run '{run_id}' en artifacts/runs/.",
            )

        model_dir = run_dir / "model"
        _validate_model_dir(model_dir, run_id)

        trace: Dict[str, Any] = {
            "warm_started": True,
            "warm_start_from": "run_id",
            "warm_start_source_run_id": run_id,
            "warm_start_path": f"artifacts/runs/{run_id}/model",
        }
        logger.info(
            "warm_start resuelto [run_id]: run_id=%s model_dir=%s",
            run_id,
            model_dir,
        )
        return model_dir, trace

    # ---- Modo champion ------------------------------------------------------
    if mode == "champion":
        # Política actual: para warm start solo se acepta el champion del mismo
        # modelo. Si no existe, se degrada limpiamente a entrenamiento desde cero.
        same_model_candidates = _candidate_champion_paths(
            artifacts_dir,
            dataset_id,
            family,
            model_name=model_name,
            allow_cross_model_fallback=False,
        )
        champ_path = _find_champion_json(
            artifacts_dir,
            dataset_id,
            family,
            model_name=model_name,
            allow_cross_model_fallback=False,
        )

        if champ_path is None:
            cross_model_candidate = _find_champion_json(
                artifacts_dir,
                dataset_id,
                family,
                model_name=None,
                allow_cross_model_fallback=True,
            )
            trace = dict(_empty_trace)
            trace.update(
                {
                    "warm_started": False,
                    "warm_start_from": "champion",
                    "warm_start_reason": (
                        "cross_model_champion_ignored" if cross_model_candidate else "model_specific_champion_missing"
                    ),
                    "warm_start_error": (
                        f"No existe champion específico para model='{model_name}' en dataset_id='{dataset_id}', "
                        f"family='{family}'."
                    ),
                    "warm_start_model_name": str(model_name or ""),
                    "warm_start_model_specific_paths": [str(p) for p in same_model_candidates],
                    "warm_start_cross_model_candidate": str(cross_model_candidate) if cross_model_candidate else None,
                }
            )
            logger.info(
                "warm_start skip [champion]: no existe champion del mismo modelo model=%s dataset=%s family=%s cross_model_candidate=%s",
                model_name,
                dataset_id,
                family,
                cross_model_candidate,
            )
            return None, trace

        try:
            champ = json.loads(champ_path.read_text(encoding="utf-8"))
        except Exception as exc:
            trace = dict(_empty_trace)
            trace.update(
                {
                    "warm_started": False,
                    "warm_start_from": "champion",
                    "warm_start_reason": "champion_read_error",
                    "warm_start_error": f"No se pudo leer champion.json ({champ_path}): {exc}",
                }
            )
            logger.warning("warm_start skip [champion]: champion.json ilegible: %s", champ_path)
            return None, trace

        source_run_id = champ.get("source_run_id") or (champ.get("metrics") or {}).get("run_id")
        if not source_run_id:
            trace = dict(_empty_trace)
            trace.update(
                {
                    "warm_started": False,
                    "warm_start_from": "champion",
                    "warm_start_reason": "champion_missing_source_run_id",
                    "warm_start_error": (
                        f"champion.json existe ({champ_path}) pero no contiene source_run_id."
                    ),
                }
            )
            logger.warning("warm_start skip [champion]: champion sin source_run_id: %s", champ_path)
            return None, trace

        source_run_id = str(source_run_id).strip()
        run_dir = (artifacts_dir / "runs" / source_run_id).resolve()

        if not run_dir.exists():
            trace = dict(_empty_trace)
            trace.update(
                {
                    "warm_started": False,
                    "warm_start_from": "champion",
                    "warm_start_source_run_id": source_run_id,
                    "warm_start_reason": "champion_run_missing",
                    "warm_start_error": (
                        f"El champion apunta al run '{source_run_id}' pero no existe en artifacts/runs/."
                    ),
                }
            )
            logger.warning(
                "warm_start skip [champion]: run inexistente source_run_id=%s champion=%s",
                source_run_id,
                champ_path,
            )
            return None, trace

        model_dir = run_dir / "model"
        try:
            _validate_model_dir(model_dir, source_run_id)
        except HTTPException as exc:
            trace = dict(_empty_trace)
            trace.update(
                {
                    "warm_started": False,
                    "warm_start_from": "champion",
                    "warm_start_source_run_id": source_run_id,
                    "warm_start_reason": "invalid_champion_model_dir",
                    "warm_start_error": str(exc.detail),
                }
            )
            logger.warning(
                "warm_start skip [champion]: model_dir inválido source_run_id=%s model_dir=%s (%s)",
                source_run_id,
                model_dir,
                exc.detail,
            )
            return None, trace

        trace = {
            "warm_started": True,
            "warm_start_from": "champion",
            "warm_start_source_run_id": source_run_id,
            "warm_start_path": f"artifacts/runs/{source_run_id}/model",
        }
        logger.info(
            "warm_start resuelto [champion]: source_run_id=%s champion=%s",
            source_run_id,
            champ_path,
        )
        return model_dir, trace


    raise HTTPException(
        status_code=422,
        detail=f"warm_start_from='{warm_start_from}' no es válido. Use: none, run_id, champion.",
    )
