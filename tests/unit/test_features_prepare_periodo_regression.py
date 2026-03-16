from __future__ import annotations

import importlib
import json
from pathlib import Path

import pandas as pd
import pytest

from neurocampus.data.features_prepare import prepare_feature_pack


# Este módulo escribe parquets reales; si no hay engine disponible no vale la
# pena fallar el entorno de evaluación por una dependencia opcional.
if importlib.util.find_spec('pyarrow') is None and importlib.util.find_spec('fastparquet') is None:
    pytest.skip('Parquet engine no disponible (pyarrow/fastparquet).', allow_module_level=True)


def _write_parquet(base_dir: Path, rel_path: str, df: pd.DataFrame) -> str:
    """Escribe un parquet y retorna la ruta relativa al base_dir."""
    p = (base_dir / rel_path).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(p, index=False)
    return str(p.relative_to(base_dir).as_posix())


def test_prepare_feature_pack_reinyecta_periodo_si_el_input_no_lo_trae(tmp_path: Path) -> None:
    """El pair_matrix debe exponer ``periodo`` aunque el parquet de entrada no lo tenga.

    Esta regresión cubre datasets mínimos de tests y cargas antiguas donde el
    parquet labeled/processed no incluía la columna ``periodo``.
    """
    base_dir = tmp_path
    dataset_id = '2025-1'

    df = pd.DataFrame(
        {
            'cedula_profesor': ['1', '1', '2', '2'],
            'codigo_materia': ['MAT', 'PHY', 'MAT', 'PHY'],
            'score_total_0_50': [10, 20, 30, 40],
            'p_neg': [0.1, 0.2, 0.3, 0.1],
            'p_neu': [0.2, 0.3, 0.2, 0.2],
            'p_pos': [0.7, 0.5, 0.5, 0.7],
        }
    )

    input_uri = _write_parquet(base_dir, 'data/labeled/2025-1_beto.parquet', df)
    out_dir = base_dir / 'artifacts' / 'features' / dataset_id

    prepare_feature_pack(
        base_dir=base_dir,
        dataset_id=dataset_id,
        input_uri=input_uri,
        output_dir=str(out_dir),
    )

    pair = pd.read_parquet(out_dir / 'pair_matrix.parquet')
    pair_meta = json.loads((out_dir / 'pair_meta.json').read_text(encoding='utf-8'))

    assert 'periodo' in pair.columns
    assert pair['periodo'].astype(str).tolist() == [dataset_id] * len(pair)
    assert pair_meta['has_periodo'] is True
    assert pair_meta['n_periodos'] == 1
    assert pair_meta['row_granularity'] == 'teacher-materia'


def test_prepare_feature_pack_preserva_periodo_en_dataset_de_un_solo_semestre(tmp_path: Path) -> None:
    """Aunque el input tenga un único periodo real, el artifact final debe conservarlo."""
    base_dir = tmp_path
    dataset_id = '2025-2'

    df = pd.DataFrame(
        {
            'periodo': [dataset_id] * 4,
            'cedula_profesor': ['1', '1', '2', '2'],
            'codigo_materia': ['MAT', 'PHY', 'MAT', 'PHY'],
            'score_total_0_50': [15, 25, 35, 45],
        }
    )

    input_uri = _write_parquet(base_dir, 'data/labeled/2025-2_beto.parquet', df)
    out_dir = base_dir / 'artifacts' / 'features' / dataset_id

    prepare_feature_pack(
        base_dir=base_dir,
        dataset_id=dataset_id,
        input_uri=input_uri,
        output_dir=str(out_dir),
    )

    pair = pd.read_parquet(out_dir / 'pair_matrix.parquet')
    assert 'periodo' in pair.columns
    assert pair['periodo'].astype(str).nunique() == 1
    assert pair['periodo'].astype(str).iloc[0] == dataset_id
