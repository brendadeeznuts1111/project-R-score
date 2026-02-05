import { useState, useEffect, useCallback, useRef } from 'react';

export type ProbeStatus = 'idle' | 'probing' | 'online' | 'offline';

export interface ProbeResult {
  status: ProbeStatus;
  latency: number | null;
  error: string | null;
  timestamp: number;
}

export interface UseOptimisticProbeOptions {
  hostId: string;
  timeout?: number;
}

export interface UseOptimisticProbeResult {
  status: ProbeStatus;
  latency: number | null;
  error: string | null;
  isProbing: boolean;
  probe: () => Promise<void>;
  lastProbe: ProbeResult | null;
}

export function useOptimisticProbe(
  options: UseOptimisticProbeOptions
): UseOptimisticProbeResult {
  const { hostId, timeout = 5000 } = options;

  const [status, setStatus] = useState<ProbeStatus>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [lastProbe, setLastProbe] = useState<ProbeResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const probe = useCallback(async () => {
    if (isProbing) return;

    setIsProbing(true);
    setStatus('probing');
    setLatency(null);
    setError(null);

    abortRef.current = new AbortController();
    const startTime = performance.now();

    try {
      const proc = Bun.spawn(
        ['ping', '-c', '1', '-W', String(Math.min(timeout / 1000, 10)), hostId],
        {
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const elapsed = performance.now() - startTime;
      const match = output.match(/time[=<]([\d.]+)\s*ms/);

      if (match) {
        const measuredLatency = parseFloat(match[1]);
        setLatency(measuredLatency);
        setStatus('online');
      } else {
        setStatus('offline');
        setError('No ping response received');
      }

      setLastProbe({
        status: status,
        latency: latency,
        error: error,
        timestamp: Date.now(),
      });
    } catch (err) {
      const elapsed = performance.now() - startTime;
      setStatus('offline');
      setError(err instanceof Error ? err.message : 'Probe failed');
      setLatency(null);
    } finally {
      setIsProbing(false);
      abortRef.current = null;
    }
  }, [hostId, timeout, isProbing, status, latency, error]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    status,
    latency,
    error,
    isProbing,
    probe,
    lastProbe,
  };
}

export function useBatchProbe(
  hosts: string[],
  options: Omit<UseOptimisticProbeOptions, 'hostId'> = {}
): UseOptimisticProbeResult[] {
  return hosts.map((hostId) => useOptimisticProbe({ ...options, hostId }));
}

export function useContinuousProbe(
  hostId: string,
  interval: number = 30000
): UseOptimisticProbeResult & { stop: () => void } {
  const result = useOptimisticProbe({ hostId });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      result.probe();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hostId, interval, result.probe]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return { ...result, stop };
}
