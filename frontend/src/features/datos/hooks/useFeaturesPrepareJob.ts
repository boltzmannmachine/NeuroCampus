// frontend/src/features/datos/hooks/useFeaturesPrepareJob.ts
import { useEffect, useRef, useState } from "react";
import type { FeaturesPrepareJob } from "@/services/jobs";
import { jobsApi } from "@/features/datos/api";
import { errMsg } from "./_utils";

/**
 * Hook de React para hacer polling periódico sobre un trabajo en segundo plano (job)
 * de construcción de "feature-packs" para ML.
 * Un feature-pack típicamente genera:
 * `artifacts/features/<dataset_id>/train_matrix.parquet`
 *
 * Reutiliza la misma lógica de consultas periódicas, finalizando cuando
 * el servidor devuelve "completed" o "failed".
 *
 * @param jobId - El identificador del proceso de "prepare_features". Nulo para saltar el polling.
 * @param opts.intervalMs - Frecuencia de los ciclos HTTP de chequeo en milisegundos.
 * @returns El estado más reciente del job, con sus indicadores de progreso y errores eventuales.
 */
export function useFeaturesPrepareJob(jobId: string | null, opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 2000;

  const [job, setJob] = useState<FeaturesPrepareJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const id = jobId; // <- Narrowing explícito para TypeScript

    let alive = true;

    async function tick() {
      setLoading(true);
      setError(null);
      try {
        const res = await jobsApi.getFeaturesPrepareJob(id);
        if (!alive) return;

        setJob(res);

        if (res.status === "done" || res.status === "failed") {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (e) {
        if (!alive) return;
        setError(errMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void tick();
    timerRef.current = window.setInterval(() => void tick(), intervalMs);

    return () => {
      alive = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [jobId, intervalMs]);


  return { job, loading, error };
}
