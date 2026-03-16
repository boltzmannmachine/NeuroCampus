// frontend/src/features/datos/hooks/useDataUnifyJob.ts
import { useEffect, useRef, useState } from "react";
import type { DataUnifyJob } from "@/services/jobs";
import { jobsApi } from "@/features/datos/api";
import { errMsg } from "./_utils";

/**
 * Hook de React para hacer polling periódico sobre un proceso (job) asíncrono
 * encargado de la "Unificación Histórica" de datasets (`historico/*`).
 *
 * Emplea el mismo patrón subyacente que `useBetoPreprocJob`. Actualiza el estado
 * local repetidamente hasta que el job alcance un estado terminal ("completed" o "failed").
 *
 * @param jobId - ID del job a monitorear. Si es nulo, no inicia peticiones a red.
 * @param opts.intervalMs - Frecuencia de chequeo HTTP en milisegundos (por defecto 2000).
 * @returns Objeto de estado actual del trabajo, estado de carga (loading) y mensaje de error si aplica.
 */
export function useDataUnifyJob(jobId: string | null, opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 2000;

  const [job, setJob] = useState<DataUnifyJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Si no hay job activo, limpiamos el estado para evitar mostrar
    // información obsoleta al cambiar de dataset o reiniciar el flujo.
    if (!jobId) {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = jobId; // <- Narrowing explícito para TypeScript

    let alive = true;

    async function tick() {
      setLoading(true);
      setError(null);
      try {
        const res = await jobsApi.getDataUnifyJob(id);
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
