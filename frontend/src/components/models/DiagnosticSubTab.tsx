// ============================================================
// NeuroCampus — Diagnóstico Sub-Tab
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  RefreshCw, Copy, CheckCircle2, AlertTriangle, XCircle,
  Heart, FileCheck, Activity,
} from 'lucide-react';
import { motion } from 'motion/react';
import { modelosApi } from '@/features/modelos/api';
import { buildDiagnosticsSnapshot } from '@/features/modelos/diagnostics';
import { buildDatasetIdBridge } from '@/features/modelos/utils/datasetId';
import {
  MOCK_CHAMPIONS,
  MOCK_RUNS,
  type Family,
  type DiagnosticCheck,
} from './mockData';
import { DiagnosticIcon } from './SharedBadges';

interface DiagnosticSubTabProps {
  family: Family;
  datasetId: string;
}

export function DiagnosticSubTab({ family, datasetId }: DiagnosticSubTabProps) {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastCheck, setLastCheck] = useState(new Date().toISOString());
  const [dataSource, setDataSource] = useState<'api' | 'mock'>('mock');

  /**
   * Recalcula el snapshot de diagnóstico.
   *
   * Estrategia:
   * 1) Intentar datos reales del backend (`runs` + `champion`).
   * 2) Si la API no responde, usar los mocks del prototipo sin romper la UI.
   */
  const loadDiagnostics = useCallback(async () => {
    const { backendDatasetId, uiDatasetId } = buildDatasetIdBridge(datasetId);

    try {
      const [runs, championResult] = await Promise.all([
        modelosApi.listRunsUI({ datasetId: backendDatasetId, family }),
        modelosApi.getChampionUI({ datasetId: backendDatasetId, family }).catch(() => null),
      ]);

      const uiRuns = runs.map((run) => ({ ...run, dataset_id: uiDatasetId }));
      const snapshot = buildDiagnosticsSnapshot({
        family,
        datasetId: uiDatasetId,
        runs: uiRuns,
        champion: championResult?.record ? { ...championResult.record, dataset_id: uiDatasetId } : null,
      });

      setChecks(snapshot.checks);
      setWarnings(snapshot.warnings);
      setDataSource('api');
      setLastCheck(new Date().toISOString());
      return;
    } catch {
      const champKey = `${family}__${datasetId}`;
      const snapshot = buildDiagnosticsSnapshot({
        family,
        datasetId,
        runs: MOCK_RUNS,
        champion: MOCK_CHAMPIONS[champKey] ?? null,
      });

      setChecks(snapshot.checks);
      setWarnings(snapshot.warnings);
      setDataSource('mock');
      setLastCheck(new Date().toISOString());
    }
  }, [datasetId, family]);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  const healthLabel = useMemo(() => {
    if (failCount > 0) return 'Unhealthy';
    if (warnCount > 0) return 'Degraded';
    return 'Healthy';
  }, [failCount, warnCount]);

  const handleCopyReport = () => {
    const report = [
      'NeuroCampus Diagnostic Report',
      `Family: ${family}`,
      `Dataset: ${datasetId}`,
      `Date: ${new Date().toISOString()}`,
      `Source: ${dataSource === 'api' ? 'backend' : 'mock-fallback'}`,
      '',
      '--- Checks ---',
      ...checks.map(c => `[${c.status.toUpperCase()}] ${c.name}: ${c.message}`),
      '',
      '--- Warnings ---',
      ...warnings.map(w => `⚠ ${w}`),
      '',
      `Summary: ${passCount} pass, ${warnCount} warn, ${failCount} fail`,
    ].join('\n');
    navigator.clipboard.writeText(report).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-[#1a1f2e] border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Health</p>
            </div>
            <p className={`text-2xl ${failCount > 0 ? 'text-red-400' : warnCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {healthLabel}
            </p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-[#1a1f2e] border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Pass</p>
            </div>
            <p className="text-green-400 text-2xl">{passCount}</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-[#1a1f2e] border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="text-xs text-gray-400">Warn</p>
            </div>
            <p className="text-yellow-400 text-2xl">{warnCount}</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-[#1a1f2e] border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-gray-400">Fail</p>
            </div>
            <p className="text-red-400 text-2xl">{failCount}</p>
          </Card>
        </motion.div>
      </div>

      {/* Contract Checks */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="text-white">Contract Checks</h4>
            <Badge className={`text-xs ${dataSource === 'api' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
              {dataSource === 'api' ? 'Backend real' : 'Fallback prototipo'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1 text-xs"
              onClick={() => void loadDiagnostics()}
            >
              <RefreshCw className="w-3 h-3" /> Revalidar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1 text-xs"
              onClick={handleCopyReport}
            >
              <Copy className="w-3 h-3" /> Copiar Reporte
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                check.status === 'pass'
                  ? 'border-green-500/20 bg-green-500/5'
                  : check.status === 'warn'
                  ? 'border-yellow-500/20 bg-yellow-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <DiagnosticIcon status={check.status} />
              <div className="flex-1">
                <p className="text-sm text-white">{check.name}</p>
                <p className="text-xs text-gray-400">{check.message}</p>
              </div>
              <Badge
                className={`text-xs ${
                  check.status === 'pass'
                    ? 'bg-green-500/20 text-green-400 border-green-500/40'
                    : check.status === 'warn'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {check.status}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Última validación: {new Date(lastCheck).toLocaleString('es-ES')} · fuente: {dataSource === 'api' ? 'backend real' : 'fallback mock'}
        </p>
      </Card>

      {/* Warnings */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-yellow-400" />
          <h4 className="text-white">Advertencias</h4>
        </div>
        {warnings.length > 0 ? (
          <div className="space-y-2">
            {warnings.map((w, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-sm text-yellow-300">{w}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Sin advertencias activas.
          </div>
        )}
      </Card>

      {/* Error message specs */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-5">
        <h4 className="text-white mb-3">Especificación de Errores (referencia)</h4>
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <p className="text-red-400">404 — No existe</p>
            <p className="text-xs text-gray-400 mt-1">
              "No existe champion para este dataset/family."
            </p>
            <p className="text-xs text-gray-500">CTA: Entrenar ahora · Seleccionar otro run</p>
          </div>
          <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-yellow-400">422 — Incompleto/Inválido</p>
            <p className="text-xs text-gray-400 mt-1">
              "Champion existe pero no tiene source_run_id." · "Bundle incompleto: falta model/ para inferencia." · "Warm start inválido: mismatch de features."
            </p>
            <p className="text-xs text-gray-500">CTA: Ver artefactos · Reentrenar sin warm start · Preparar feature-pack</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
