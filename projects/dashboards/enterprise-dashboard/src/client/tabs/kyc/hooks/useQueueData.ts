/**
 * useQueueData - Hook for fetching and managing KYC review queue data
 */

import { useState, useCallback, useEffect } from "react";
import type { ReviewQueueItem } from "../types";

interface UseQueueDataOptions {
  buildQueryParams: (filters: any) => URLSearchParams;
  filters: any;
}

interface UseQueueDataReturn {
  queue: ReviewQueueItem[];
  allQueue: ReviewQueueItem[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  fetchQueue: (isRetry?: boolean) => Promise<void>;
  fetchMetrics: () => Promise<void>;
}

export function useQueueData({ buildQueryParams, filters }: UseQueueDataOptions): UseQueueDataReturn {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [allQueue, setAllQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchQueue = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = buildQueryParams(filters);
      const url = `/api/kyc/review-queue?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch review queue: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.data) {
        const items = (data.data.queue || []).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
        }));
        setQueue(items);
        setAllQueue(items);
        if (isRetry) {
          setRetryCount(0); // Reset retry count on success
        }
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch review queue:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Failed to load review queue: ${errorMessage}`);

      // Auto-retry logic (up to 3 times with exponential backoff)
      if (retryCount < 3 && !isRetry) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchQueue(true);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryParams, retryCount]);

  // Note: fetchMetrics removed - use useMetrics hook instead

  return {
    queue,
    allQueue,
    loading,
    error,
    retryCount,
    fetchQueue,
    fetchMetrics,
  };
}
