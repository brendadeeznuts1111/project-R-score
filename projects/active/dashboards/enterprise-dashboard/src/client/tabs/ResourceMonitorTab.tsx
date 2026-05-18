import { useState, useEffect, useCallback, useRef } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { ApiResponse } from "../types";

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
    rss: number;
    usagePercent: number;
  };
  processes: ProcessInfo[];
  disk?: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
  timestamp: string;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  uptime: number;
  status: string;
}

export function ResourceMonitorTab() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<{ time: number; cpu: number; memory: number }[]>([]);
  const [sortBy, setSortBy] = useState<"cpu" | "memory" | "name">("cpu");
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [isPaused, setIsPaused] = useState(false);
  const historyRef = useRef<{ time: number; cpu: number; memory: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (isPaused) return;
    try {
      const res = await fetch("/api/system/enhanced");
      const data: ApiResponse<SystemMetrics> = await res.json();
      if (data.data) {
        setMetrics(data.data);
        const now = Date.now();
        historyRef.current.push({
          time: now,
          cpu: data.data.cpu.usage,
          memory: data.data.memory.usagePercent,
        });
        if (historyRef.current.length > 60) {
          historyRef.current.shift();
        }
        setHistory([...historyRef.current]);
      }
    } catch (error: any) {
      console.error("Failed to fetch metrics:", error);
    }
  }, [isPaused]);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics, refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
  };

  const sortedProcesses = metrics?.processes
    .slice()
    .sort((a, b) => {
      if (sortBy === "cpu") return b.cpu - a.cpu;
      if (sortBy === "memory") return b.memory - a.memory;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20) || [];

  const maxHistory = Math.max(...history.map((h) => Math.max(h.cpu, h.memory)), 1);

  return (
    <section className="tab-content space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Resource Monitor</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isPaused
                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1.5 rounded bg-gray-700 text-white text-sm border border-gray-600"
          >
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">CPU Usage</span>
            <span className="text-2xl font-bold">{metrics?.cpu.usage.toFixed(1)}%</span>
          </div>
          <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-full ${
                (metrics?.cpu.usage || 0) > 80
                  ? "bg-red-500"
                  : (metrics?.cpu.usage || 0) > 50
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${metrics?.cpu.usage || 0}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>{metrics?.cpu.cores} cores</span>
            <span>Load: {metrics?.cpu.loadAvg[0]?.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Memory Usage</span>
            <span className="text-2xl font-bold">{metrics?.memory.usagePercent.toFixed(1)}%</span>
          </div>
          <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-full ${
                (metrics?.memory.usagePercent || 0) > 80
                  ? "bg-red-500"
                  : (metrics?.memory.usagePercent || 0) > 50
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${metrics?.memory.usagePercent || 0}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>{formatBytes(metrics?.memory.used || 0)}</span>
            <span>{formatBytes(metrics?.memory.total || 0)}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Heap / RSS</span>
            <span className="text-2xl font-bold font-mono text-xs">
              {(metrics?.memory.heapUsed || 0) > 0 ? formatBytes(metrics?.memory.heapUsed || 0) : "N/A"}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Heap Used</span>
              <span className="font-mono">{formatBytes(metrics?.memory.heapUsed || 0)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>RSS</span>
              <span className="font-mono">{formatBytes(metrics?.memory.rss || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-semibold mb-4">Resource History (60 samples)</h3>
        <div className="h-32 flex items-end gap-0.5">
          {history.map((point, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end gap-px"
            >
              <div
                className="w-full bg-blue-500/60 rounded-t transition-all duration-300"
                style={{ height: `${(point.cpu / maxHistory) * 100}%` }}
                title={`CPU: ${point.cpu.toFixed(1)}%`}
              />
              <div
                className="w-full bg-purple-500/60 rounded-b transition-all duration-300"
                style={{ height: `${(point.memory / maxHistory) * 100}%` }}
                title={`Memory: ${point.memory.toFixed(1)}%`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/60 rounded" />
            <span>CPU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500/60 rounded" />
            <span>Memory</span>
          </div>
          <span className="ml-auto">{history.length} samples</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="font-semibold">Top Processes</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <button
              onClick={() => setSortBy("cpu")}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === "cpu" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setSortBy("memory")}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === "memory" ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white"
              }`}
            >
              Memory
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === "name" ? "bg-green-500/20 text-green-400" : "text-gray-400 hover:text-white"
              }`}
            >
              Name
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-750">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-2 font-medium">PID</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium text-right">CPU %</th>
                <th className="px-4 py-2 font-medium text-right">Memory</th>
                <th className="px-4 py-2 font-medium text-right">Uptime</th>
                <th className="px-4 py-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedProcesses.map((proc) => (
                <tr key={proc.pid} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-2 font-mono text-gray-400">{proc.pid}</td>
                  <td className="px-4 py-2 font-medium truncate max-w-[200px]">{proc.name}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`font-mono ${
                        proc.cpu > 50 ? "text-red-400" : proc.cpu > 20 ? "text-yellow-400" : "text-green-400"
                      }`}
                    >
                      {proc.cpu.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-300">{formatBytes(proc.memory)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-400">{formatUptime(proc.uptime)}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        proc.status === "running"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-600/20 text-gray-400"
                      }`}
                    >
                      {proc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics?.disk && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Disk Usage</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (metrics.disk.usagePercent || 0) > 80
                        ? "bg-red-500"
                        : (metrics.disk.usagePercent || 0) > 50
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${metrics.disk.usagePercent || 0}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-mono">{metrics.disk.usagePercent.toFixed(1)}%</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>{formatBytes(metrics.disk.used)} used</span>
              <span>{formatBytes(metrics.disk.total)} total</span>
            </div>
          </div>
        )}

        {metrics?.network && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Network</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Bytes In</span>
                <div className="font-mono text-lg">{formatBytes(metrics.network.bytesIn)}</div>
              </div>
              <div>
                <span className="text-gray-500">Bytes Out</span>
                <div className="font-mono text-lg">{formatBytes(metrics.network.bytesOut)}</div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Connections</span>
                <div className="font-mono text-lg">{metrics.network.connections}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
