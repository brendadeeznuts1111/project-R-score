import React, { useState, useEffect } from 'react';

interface BunPerformanceMetrics {
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
  bunVersion: string;
  platform: string;
  arch: string;
}

export function useBunPerformance() {
  const [metrics, setMetrics] = useState<BunPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Simulate Bun-specific performance metrics
        // In a real Bun environment, you'd use Bun's native APIs
        const mockMetrics: BunPerformanceMetrics = {
          memoryUsage: {
            rss: Math.floor(Math.random() * 100000000) + 50000000,
            heapTotal: Math.floor(Math.random() * 50000000) + 20000000,
            heapUsed: Math.floor(Math.random() * 30000000) + 10000000,
            external: Math.floor(Math.random() * 10000000),
            arrayBuffers: Math.floor(Math.random() * 5000000)
          },
          cpuUsage: {
            user: Math.floor(Math.random() * 1000000),
            system: Math.floor(Math.random() * 500000)
          },
          uptime: Math.floor(Math.random() * 86400),
          bunVersion: '1.3.8',
          platform: navigator.platform,
          arch: 'x64'
        };

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Failed to fetch Bun performance metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCpuTime = (microseconds: number) => {
    return (microseconds / 1000000).toFixed(2) + 's';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return {
    metrics,
    isLoading,
    formatBytes,
    formatCpuTime,
    formatUptime
  };
}
