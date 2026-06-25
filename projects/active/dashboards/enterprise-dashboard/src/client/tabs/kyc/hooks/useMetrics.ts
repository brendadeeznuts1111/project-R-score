/**
 * useMetrics - Hook for fetching and managing KYC metrics
 */

import { useState, useCallback } from "react";
import type { KYCMetrics } from "../types";

interface UseMetricsReturn {
  metrics: KYCMetrics | null;
  loading: boolean;
  fetchMetrics: () => Promise<void>;
}

export function useMetrics(): UseMetricsReturn {
  const [metrics, setMetrics] = useState<KYCMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/kyc/metrics");
      const data = await response.json();
      if (data.data) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    loading,
    fetchMetrics,
  };
}
