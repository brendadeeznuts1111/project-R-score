import { useState, useEffect, useCallback } from "react";
import type { AnomalyResult, AnomalySeverity, DetectionResult, AnomalyModelInfo } from "../../types";

interface AnomalyPanelProps {
  refreshInterval?: number; // ms, default 10000
  onAnomalyDetected?: (severity: AnomalySeverity) => void;
}

interface AnomalyData extends DetectionResult {
  metrics: Record<string, number>;
}

const severityConfig: Record<AnomalySeverity, { color: string; bg: string; icon: string; label: string }> = {
  none: { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: "check", label: "Normal" },
  low: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: "info", label: "Low" },
  medium: { color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", icon: "alert", label: "Medium" },
  high: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: "warning", label: "High" },
  critical: { color: "text-red-700", bg: "bg-red-200 dark:bg-red-900/50", icon: "critical", label: "Critical" },
};

const metricLabels: Record<string, string> = {
  cpu_usage: "CPU Usage",
  memory_usage: "Memory Usage",
  heap_used: "Heap Used",
  rss: "RSS Memory",
  load_avg_1m: "Load (1m)",
  load_avg_5m: "Load (5m)",
  process_count: "Processes",
  request_count: "Requests",
  error_count: "Errors",
  success_rate: "Success Rate",
  avg_latency: "Avg Latency",
};

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes("usage") || metric === "success_rate") {
    return `${value.toFixed(1)}%`;
  }
  if (metric.includes("latency")) {
    return `${value.toFixed(1)}ms`;
  }
  if (metric.includes("heap") || metric === "rss") {
    // Format as MB
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (metric.includes("load")) {
    return value.toFixed(2);
  }
  return value.toLocaleString();
}

function SeverityIcon({ severity }: { severity: AnomalySeverity }) {
  const config = severityConfig[severity];

  if (config.icon === "check") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (config.icon === "info") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (config.icon === "alert") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  // warning or critical
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function DeviationBar({ result }: { result: AnomalyResult }) {
  const { value, thresholds, isAnomaly } = result;
  const { mean, lowerBound, upperBound } = thresholds;

  // Calculate position as percentage within bounds (with some margin)
  const range = upperBound - lowerBound;
  const margin = range * 0.2; // 20% margin on each side
  const min = lowerBound - margin;
  const max = upperBound + margin;
  const fullRange = max - min;

  const valuePos = Math.max(0, Math.min(100, ((value - min) / fullRange) * 100));
  const meanPos = ((mean - min) / fullRange) * 100;
  const lowerPos = ((lowerBound - min) / fullRange) * 100;
  const upperPos = ((upperBound - min) / fullRange) * 100;

  return (
    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      {/* Normal range highlight */}
      <div
        className="absolute h-full bg-green-200 dark:bg-green-900/50"
        style={{ left: `${lowerPos}%`, width: `${upperPos - lowerPos}%` }}
      />
      {/* Mean marker */}
      <div
        className="absolute h-full w-0.5 bg-gray-400 dark:bg-gray-500"
        style={{ left: `${meanPos}%` }}
      />
      {/* Current value marker */}
      <div
        className={`absolute h-full w-2 rounded-full ${isAnomaly ? "bg-red-500" : "bg-blue-500"}`}
        style={{ left: `${Math.max(0, valuePos - 1)}%` }}
      />
    </div>
  );
}

function MetricCard({ result }: { result: AnomalyResult }) {
  const { metric, value, isAnomaly, reason, zScore, deviation, thresholds } = result;
  const label = metricLabels[metric] || metric;

  return (
    <div className={`p-4 rounded-lg border ${isAnomaly ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {isAnomaly && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
            {reason === "both" ? "Z + IQR" : reason === "z_score" ? "Z-Score" : "IQR"}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-2xl font-bold ${isAnomaly ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
          {formatMetricValue(metric, value)}
        </span>
        {zScore !== undefined && zScore > 2 && (
          <span className="text-xs text-gray-500">Z: {zScore.toFixed(2)}</span>
        )}
      </div>

      <DeviationBar result={result} />

      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Min: {formatMetricValue(metric, thresholds.lowerBound)}</span>
        <span>Mean: {formatMetricValue(metric, thresholds.mean)}</span>
        <span>Max: {formatMetricValue(metric, thresholds.upperBound)}</span>
      </div>

      {isAnomaly && deviation && deviation.fromMean !== 0 && (
        <div className="mt-2 text-xs">
          <span className={deviation.fromMean > 0 ? "text-red-500" : "text-blue-500"}>
            {deviation.fromMean > 0 ? "+" : ""}{formatMetricValue(metric, deviation.fromMean)} from mean
          </span>
        </div>
      )}
    </div>
  );
}

function ModelInfoCard({ modelInfo }: { modelInfo: AnomalyModelInfo }) {
  if (!modelInfo.loaded) {
    return (
      <div className="p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            No Model Loaded
          </span>
        </div>
        <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          Run <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">bun run train-anomaly</code> to train the model.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Model Info</span>
        <span className="text-xs text-gray-500">v{modelInfo.version}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <span className="text-gray-500">Trained:</span>{" "}
          {modelInfo.trainedAt ? new Date(modelInfo.trainedAt).toLocaleDateString() : "Unknown"}
        </div>
        <div>
          <span className="text-gray-500">Samples:</span>{" "}
          {modelInfo.sampleCount?.toLocaleString() || 0}
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Metrics:</span>{" "}
          {modelInfo.metrics?.length || 0} tracked
        </div>
      </div>
    </div>
  );
}

export function AnomalyPanel({ refreshInterval = 10000, onAnomalyDetected }: AnomalyPanelProps) {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [modelInfo, setModelInfo] = useState<AnomalyModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [detectRes, modelRes] = await Promise.all([
        fetch("/api/anomalies/detect"),
        fetch("/api/anomalies/model"),
      ]);

      if (!detectRes.ok || !modelRes.ok) {
        throw new Error("Failed to fetch anomaly data");
      }

      const detectJson = await detectRes.json();
      const modelJson = await modelRes.json();

      setData(detectJson.data);
      setModelInfo(modelJson.data);
      setLastUpdate(new Date());
      setError(null);

      // Notify parent of severity
      if (onAnomalyDetected && detectJson.data.severity !== "none") {
        onAnomalyDetected(detectJson.data.severity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [onAnomalyDetected]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Error loading anomaly data</span>
        </div>
        <p className="mt-2 text-sm text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const severity = data?.severity || "none";
  const config = severityConfig[severity];
  const anomalies = data?.anomalies.filter(a => a.isAnomaly) || [];
  const normalMetrics = data?.anomalies.filter(a => !a.isAnomaly) || [];

  return (
    <div className="space-y-4">
      {/* Header with severity badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color}`}>
            <SeverityIcon severity={severity} />
            <span className="font-medium">{config.label}</span>
          </div>
          {data?.hasAnomalies && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} detected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {lastUpdate && (
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Anomalous metrics */}
      {anomalies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Anomalous Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {anomalies.map(result => (
              <MetricCard key={result.metric} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Normal metrics (collapsed by default) */}
      {normalMetrics.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Normal Metrics ({normalMetrics.length})
            <svg className="inline-block w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {normalMetrics.map(result => (
              <MetricCard key={result.metric} result={result} />
            ))}
          </div>
        </details>
      )}

      {/* Model info */}
      {modelInfo && <ModelInfoCard modelInfo={modelInfo} />}
    </div>
  );
}
