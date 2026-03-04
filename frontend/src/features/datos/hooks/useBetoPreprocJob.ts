// frontend/src/features/datos/hooks/useBetoPreprocJob.ts
import { useEffect, useRef, useState } from "react";
import type { BetoPreprocJob } from "@/services/jobs";
import { jobsApi } from "@/features/datos/api";
import { errMsg } from "./_utils";

/**
 * Hook de React para consultar periódicamente de manera asíncrona (polling)
 * el estado y progreso de un proceso (Job) en segundo plano para el
 * preprocesamiento con el modelo BETO.
 *
 * @param jobId - ID del job a rastrear. Si es `null`, la consulta no se ejecuta.
 * @param opts.intervalMs - Frecuencia de actualización en milisegundos (por defecto 2000ms).
 * @returns Un objeto que contiene:
 *  - `job`: Metadatos y el estado más reciente devuelto por el servidor (incluyendo errores o progreso).
 *  - `loading`: Flag verdadero cuando hay una solicitud HTTP en curso.
 *  - `error`: Mensaje textual si hubo un fallo a nivel de red o parseo.
 */
export function useBetoPreprocJob(jobId: string | null, opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 2000;
  const [job, setJob] = useState<BetoPreprocJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // `jobId` puede llegar como null mientras no haya job en curso.
    // Si es null, limpiamos estado y no iniciamos polling.
    if (!jobId) {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    // TypeScript no mantiene el narrowing de `jobId` dentro de funciones anidadas
    // (por análisis de flujo). Capturamos el valor en una constante para que
    // `jobsApi.getBetoJob` reciba siempre un string.
    const id = jobId;

    let alive = true;

    async function tick() {
      setLoading(true);
      setError(null);
      try {
        const res = await jobsApi.getBetoJob(id);
        if (!alive) return;
        setJob(res);

        // detener polling si finalizó
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
