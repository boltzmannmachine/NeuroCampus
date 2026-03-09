// ============================================================
// NeuroCampus — Utilidades puras para diagnóstico de Modelos
// ============================================================
import {
  FAMILY_CONFIGS,
  type ChampionRecord,
  type DiagnosticCheck,
  type Family,
  type RunRecord,
} from '@/components/models/mockData';

/**
 * Entrada mínima para construir un snapshot de diagnóstico.
 *
 * La intención es mantener esta utilidad completamente pura para que
 * pueda reutilizarse desde la UI, tests unitarios y futura documentación
 * técnica sin depender de React ni de side effects.
 */
export interface BuildDiagnosticsSnapshotParams {
  family: Family;
  datasetId: string;
  runs: RunRecord[];
  champion: ChampionRecord | null;
}

/**
 * Resultado consolidado del diagnóstico.
 */
export interface DiagnosticsSnapshot {
  checks: DiagnosticCheck[];
  warnings: string[];
}

/**
 * Construye un snapshot de diagnóstico usando evidencia real derivada de
 * runs y champion. Cuando la UI no logra obtener datos del backend, esta
 * misma función puede reutilizarse con mocks para mantener el mismo
 * contrato visual.
 */
export function buildDiagnosticsSnapshot({
  family,
  datasetId,
  runs,
  champion,
}: BuildDiagnosticsSnapshotParams): DiagnosticsSnapshot {
  const checks: DiagnosticCheck[] = [];
  const warnings: string[] = [];
  const familyConfig = FAMILY_CONFIGS[family];
  const scopedRuns = runs.filter((run) => run.family === family && run.dataset_id === datasetId);
  const championRun = champion ? scopedRuns.find((run) => run.run_id === champion.run_id) ?? null : null;

  if (champion) {
    checks.push({
      name: 'Champion exists',
      status: 'pass',
      message: `Champion ${champion.run_id} found`,
    });
  } else {
    checks.push({
      name: 'Champion exists',
      status: 'fail',
      message: 'No champion for this dataset/family',
    });
  }

  if (championRun) {
    checks.push({
      name: 'Bundle completeness',
      status: championRun.bundle_status === 'complete' ? 'pass' : 'warn',
      message:
        championRun.bundle_status === 'complete'
          ? 'All bundle artifacts present'
          : 'Some bundle artifacts are still missing',
    });

    checks.push({
      name: 'Primary metric available',
      status: Number.isFinite(championRun.primary_metric_value) ? 'pass' : 'fail',
      message: Number.isFinite(championRun.primary_metric_value)
        ? `${championRun.primary_metric}: ${championRun.primary_metric_value}`
        : 'No primary metric value available',
    });

    checks.push({
      name: 'Text features',
      status: championRun.n_feat_text > 0 ? 'pass' : 'warn',
      message:
        championRun.n_feat_text > 0
          ? `${championRun.n_feat_text} text features detected`
          : 'No text features detected — TF-IDF may be missing',
    });

    checks.push({
      name: 'Prediction compatibility',
      status: family === 'score_docente' ? 'pass' : 'warn',
      message:
        family === 'score_docente'
          ? 'This family is consumable from Predictions when the champion is active'
          : 'Predictions currently consumes the active champion for score_docente',
    });
  } else if (champion) {
    checks.push({
      name: 'Champion traceability',
      status: 'warn',
      message: 'Champion exists but the associated run was not found in the current runs list',
    });
  }

  const legacyRuns = scopedRuns.filter((run) => run.bundle_version === '1.0.0');
  checks.push({
    name: 'Legacy runs',
    status: legacyRuns.length > 0 ? 'warn' : 'pass',
    message:
      legacyRuns.length > 0
        ? `${legacyRuns.length} runs with legacy bundle_version`
        : 'No legacy runs detected',
  });

  const completedRuns = scopedRuns.filter((run) => run.status === 'completed');
  const incompleteBundles = completedRuns.filter((run) => run.bundle_status !== 'complete');
  if (incompleteBundles.length > 0) {
    warnings.push(`${incompleteBundles.length} completed runs still have an incomplete bundle`);
  }

  const missingBundleVersion = scopedRuns.filter((run) => !run.bundle_version);
  if (missingBundleVersion.length > 0) {
    warnings.push(`${missingBundleVersion.length} runs do not declare bundle_version`);
  }

  const noTextRuns = completedRuns.filter((run) => run.n_feat_text === 0);
  if (noTextRuns.length > 0) {
    warnings.push(`${noTextRuns.length} completed runs do not expose TF-IDF features`);
  }

  checks.push({
    name: 'Contract stability',
    status: 'pass',
    message: `${familyConfig.primaryMetric} contract available for ${familyConfig.family}`,
  });

  return { checks, warnings };
}
