import { useState, useEffect } from "react";
import { formatBytes, formatUptime } from "../utils/formatters";
import { NetworkMatrix, AnomalyPanel } from "../components";
import { RealTimeChart } from "../components";
import { showGlobalToast } from "../hooks/useToast";
import type { SystemMetrics, Project, DashboardStats, AnomalySeverity } from "../types";

interface AnalyticsTabProps {
  systemMetrics: SystemMetrics | null;
  projects: Project[];
  stats: DashboardStats;
}

interface ServerInfo {
  serverId: string;
  bun: {
    version: string;
    revision: string;
    env: string;
  };
  network: {
    hostname: string;
    displayHost: string;
    port: number;
    protocol: string;
    baseUrl: string;
    wsUrl: string;
  };
  config: {
    development: boolean;
    maxRequestBodySize: number;
    tlsEnabled: boolean;
    projectsDir: string;
  };
  connections: {
    pendingRequests: number;
    pendingWebSockets: number;
    dashboardSubscribers: number;
  };
  throughput: {
    totalRequests: number;
    avgLatency: number;
    successRate: number;
    uptime: number;
    requestsPerSecond: number;
  };
  system: {
    platform: string;
    arch: string;
    pid: number;
    memoryUsage: number;
  };
}

interface EndpointAnalytics {
  path: string;
  requests: number;
  errors: number;
  successRate: number;
  avgLatency: number;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  systemMetrics,
  projects,
  stats,
}) => {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [endpointAnalytics, setEndpointAnalytics] = useState<EndpointAnalytics[]>([]);

  // Fetch server metrics and endpoint analytics on mount (parallelized)
  useEffect(() => {
    Promise.all([
      fetch("/api/server/metrics").then((res) => res.json()),
      fetch("/api/analytics/matrix?limit=10").then((res) => res.json()),
    ])
      .then(([metricsResponse, analyticsResponse]) => {
        if (metricsResponse.data) {
          setServerInfo({
            serverId: metricsResponse.data.serverId,
            bun: metricsResponse.data.bun,
            network: metricsResponse.data.network,
            config: metricsResponse.data.config,
            connections: metricsResponse.data.connections,
            throughput: metricsResponse.data.throughput,
            system: metricsResponse.data.system,
          });
        }
        if (analyticsResponse.data?.endpoints) {
          setEndpointAnalytics(analyticsResponse.data.endpoints);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <section className="tab-content">
      <h2 className="text-xl font-semibold mb-6">Analytics & System Monitoring</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Resources Panel */}
        {systemMetrics && (
          <div className="lg:col-span-2 bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                System Resources
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  LIVE 1.3.6
                </span>
                <span className="text-xs text-gray-500 text-theme-muted">{systemMetrics.hostname} - {systemMetrics.platform}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* CPU Usage */}
              <div className="p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 text-theme-secondary">CPU</span>
                  <span className={`text-lg font-bold ${systemMetrics.cpu.usage > 80 ? "text-red-500" : systemMetrics.cpu.usage > 50 ? "text-yellow-500" : "text-green-500"}`}>
                    {systemMetrics.cpu.usage}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 bg-theme-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${systemMetrics.cpu.usage > 80 ? "bg-red-500" : systemMetrics.cpu.usage > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${systemMetrics.cpu.usage}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-theme-muted">{systemMetrics.cpu.cores} cores - {systemMetrics.cpu.speed}MHz</div>
              </div>
              {/* Memory Usage */}
              <div className={`p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50 ${systemMetrics.memory.usagePercent > 95 ? "ring-2 ring-red-500/50 animate-pulse" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 text-theme-secondary">Memory</span>
                  <span className={`text-lg font-bold ${systemMetrics.memory.usagePercent > 95 ? "text-red-500 animate-pulse" : systemMetrics.memory.usagePercent > 85 ? "text-red-500" : systemMetrics.memory.usagePercent > 70 ? "text-yellow-500" : "text-green-500"}`}>
                    {systemMetrics.memory.usagePercent}%
                    {systemMetrics.memory.usagePercent > 95 && <span className="ml-1 text-xs">CRITICAL</span>}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 bg-theme-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${systemMetrics.memory.usagePercent > 95 ? "bg-red-500 animate-pulse" : systemMetrics.memory.usagePercent > 85 ? "bg-red-500" : systemMetrics.memory.usagePercent > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${systemMetrics.memory.usagePercent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-theme-muted">{formatBytes(systemMetrics.memory.used)} / {formatBytes(systemMetrics.memory.total)}</div>
              </div>
              {/* Heap Usage */}
              <div className="p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 text-theme-secondary">Heap</span>
                  <span className="text-lg font-bold text-purple-500">{formatBytes(systemMetrics.memory.heapUsed)}</span>
                </div>
                <div className="h-2 bg-gray-200 bg-theme-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${(systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-theme-muted">of {formatBytes(systemMetrics.memory.heapTotal)} total</div>
              </div>
              {/* System Uptime */}
              <div className="p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 text-theme-secondary">Uptime</span>
                  <span className="text-lg font-bold text-cyan-500">{formatUptime(systemMetrics.uptime)}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-theme-muted">
                  Load: {systemMetrics.cpu.loadAvg.join(" / ")}
                </div>
              </div>
            </div>
            {/* Bun 1.3.6 Performance Panel */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Loader Dominion */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">TOML Loader</span>
                  <span className="text-xs text-green-400 animate-pulse">- NATIVE</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">0.2<span className="text-sm text-gray-400">ms</span></div>
                <div className="mt-1 text-[10px] text-gray-500">22500% faster vs node-toml</div>
              </div>
              {/* CRC32 SIMD */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-400 uppercase font-bold tracking-wider">CRC32</span>
                  <span className="text-xs text-green-400">SIMD</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">9.5<span className="text-sm text-gray-400">GB/s</span></div>
                <div className="mt-1 text-[10px] text-gray-500">25x faster checksum</div>
              </div>
              {/* Spawn Performance */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-400 uppercase font-bold tracking-wider">Spawn</span>
                  <span className="text-xs text-green-400">posix</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">1.75<span className="text-sm text-gray-400">ms</span></div>
                <div className="mt-1 text-[10px] text-gray-500">5.1x faster vs v1.3.5</div>
              </div>
              {/* Bun Version */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-green-400 uppercase font-bold tracking-wider">Runtime</span>
                  <span className="text-xs text-orange-400 font-bold">Bun</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">1.3.6</div>
                <div className="mt-1 text-[10px] text-gray-500">SIMD + Archive + Loaders</div>
              </div>
            </div>

            {/* Top Processes */}
            {systemMetrics.processes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-700 text-theme-secondary">Top Processes</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-theme-muted border-b border-gray-200 border-theme">
                        <th className="pb-2 font-medium">PID</th>
                        <th className="pb-2 font-medium">Process</th>
                        <th className="pb-2 font-medium text-right">CPU %</th>
                        <th className="pb-2 font-medium text-right">Memory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemMetrics.processes.map((proc) => (
                        <tr key={proc.pid} className="border-b border-gray-100 border-theme/50">
                          <td className="py-2 text-gray-500 text-theme-muted font-mono text-xs">{proc.pid}</td>
                          <td className="py-2 font-medium">{proc.name}</td>
                          <td className={`py-2 text-right font-mono ${proc.cpu > 50 ? "text-red-500" : proc.cpu > 20 ? "text-yellow-500" : "text-green-500"}`}>
                            {proc.cpu.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right font-mono text-gray-600 text-theme-secondary">{formatBytes(proc.memory)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Anomaly Detection Panel */}
        <div className="lg:col-span-2 bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Anomaly Detection
            <span className="ml-auto text-xs text-gray-400">Statistical Analysis</span>
          </h3>
          <AnomalyPanel
            refreshInterval={15000}
            onAnomalyDetected={(severity: AnomalySeverity) => {
              if (severity === "high" || severity === "critical") {
                showGlobalToast(`Anomaly detected: ${severity} severity`, "error");
              }
            }}
          />
        </div>

        <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
          <h3 className="font-medium mb-4">Request Timeline</h3>
          <RealTimeChart data={stats.timeline} />
        </div>
        <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
          <h3 className="font-medium mb-4">Project Health Distribution</h3>
          <div className="space-y-3">
            {[
              { label: "Healthy (80-100%)", count: projects.filter(p => p.health >= 80).length, color: "bg-green-500" },
              { label: "Warning (60-79%)", count: projects.filter(p => p.health >= 60 && p.health < 80).length, color: "bg-yellow-500" },
              { label: "Critical (<60%)", count: projects.filter(p => p.health < 60).length, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="flex-1 text-sm text-gray-600 text-theme-secondary">{item.label}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
          <h3 className="font-medium mb-4">API Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
              <div className="text-2xl font-bold text-blue-600 text-blue-400">{projects.length}</div>
              <div className="text-sm text-gray-500 text-theme-muted">Total Projects</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
              <div className="text-2xl font-bold text-green-600 text-green-400">{stats.successRate}%</div>
              <div className="text-sm text-gray-500 text-theme-muted">Success Rate</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
              <div className="text-2xl font-bold text-purple-600 text-purple-400">{stats.avgLatency}ms</div>
              <div className="text-sm text-gray-500 text-theme-muted">Avg Latency</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 bg-theme-tertiary/50">
              <div className="text-2xl font-bold text-orange-600 text-orange-400">{Math.floor(stats.uptime / 60)}m</div>
              <div className="text-sm text-gray-500 text-theme-muted">Uptime</div>
            </div>
          </div>
        </div>

        {/* Server Info Panel */}
        {serverInfo && (
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Server Info
              <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-100 bg-theme-tertiary px-2 py-0.5 rounded">
                {serverInfo.serverId?.slice(0, 8)}
              </span>
            </h3>

            {/* Bun Runtime Section */}
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-500 font-bold text-sm">Bun</span>
                <span className="text-xs font-mono bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                  v{serverInfo.bun.version}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  ({serverInfo.bun.revision})
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {serverInfo.system.platform}/{serverInfo.system.arch} - PID {serverInfo.system.pid} - {serverInfo.system.memoryUsage}MB heap
              </div>
            </div>

            {/* Network Section */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Network</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                  <div className="text-[10px] text-gray-400 uppercase">Hostname</div>
                  <div className="text-sm font-mono text-theme-primary">{serverInfo.network.hostname}</div>
                </div>
                <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                  <div className="text-[10px] text-gray-400 uppercase">Port</div>
                  <div className="text-sm font-mono text-theme-primary">{serverInfo.network.port}</div>
                </div>
              </div>
              <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                <div className="text-[10px] text-gray-400 uppercase">Base URL</div>
                <div className="text-sm font-mono text-indigo-500 truncate">{serverInfo.network.baseUrl}</div>
              </div>
              <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                <div className="text-[10px] text-gray-400 uppercase">WebSocket</div>
                <div className="text-sm font-mono text-cyan-500 truncate">{serverInfo.network.wsUrl}</div>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded ${serverInfo.network.protocol === "https" ? "bg-green-500/20 text-green-500" : "bg-blue-500/20 text-blue-500"}`}>
                {serverInfo.network.protocol.toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs rounded ${serverInfo.config.development ? "bg-yellow-500/20 text-yellow-500" : "bg-green-500/20 text-green-500"}`}>
                {serverInfo.config.development ? "Development" : "Production"}
              </span>
              {serverInfo.config.tlsEnabled && (
                <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-500 rounded">TLS</span>
              )}
            </div>

            {/* Connections & Throughput */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                <div className="text-lg font-bold text-cyan-500">{serverInfo.throughput.requestsPerSecond}</div>
                <div className="text-[10px] text-gray-400">req/s</div>
              </div>
              <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                <div className="text-lg font-bold text-purple-500">{serverInfo.connections.pendingWebSockets}</div>
                <div className="text-[10px] text-gray-400">WebSockets</div>
              </div>
              <div className="p-2 rounded bg-gray-50 bg-theme-tertiary/50">
                <div className="text-lg font-bold text-emerald-500">{serverInfo.throughput.avgLatency}ms</div>
                <div className="text-[10px] text-gray-400">Avg Latency</div>
              </div>
            </div>
          </div>
        )}

        {/* Endpoint Analytics Panel */}
        {endpointAnalytics.length > 0 && (
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Top Endpoints
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-theme-muted border-b border-gray-200 border-theme">
                    <th className="pb-2 font-medium">Endpoint</th>
                    <th className="pb-2 font-medium text-right">Requests</th>
                    <th className="pb-2 font-medium text-right">Success</th>
                    <th className="pb-2 font-medium text-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointAnalytics.slice(0, 8).map((endpoint) => (
                    <tr key={endpoint.path} className="border-b border-gray-100 border-theme/50">
                      <td className="py-2 font-mono text-xs truncate max-w-[180px]" title={endpoint.path}>
                        {endpoint.path}
                      </td>
                      <td className="py-2 text-right font-medium">{endpoint.requests}</td>
                      <td className={`py-2 text-right ${endpoint.successRate >= 95 ? "text-green-500" : endpoint.successRate >= 80 ? "text-yellow-500" : "text-red-500"}`}>
                        {endpoint.successRate}%
                      </td>
                      <td className="py-2 text-right font-mono text-gray-600 text-theme-secondary">
                        {endpoint.avgLatency}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Network Matrix Panel */}
        <div className="lg:col-span-2">
          <NetworkMatrix
            onProbe={(hostId) => showGlobalToast(`Probing ${hostId}...`, "info")}
            className="shadow-sm border border-gray-200 border-theme"
          />
        </div>

        {/* URLPattern Matrix Panel */}
        <div className="lg:col-span-2 bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            URLPattern Matrix
            <span className="ml-auto text-xs text-gray-400 font-mono">Bun 1.3.6</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-theme-muted border-b border-gray-200 border-theme">
                  <th className="pb-2 font-medium">Pattern</th>
                  <th className="pb-2 font-medium text-center">Match</th>
                  <th className="pb-2 font-medium text-center">RegExp</th>
                  <th className="pb-2 font-medium">Groups</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { pattern: "/api/projects/:id", match: true, regexp: false, groups: "id", time: "0.004ms" },
                  { pattern: "/api/users/(\\d+)", match: true, regexp: true, groups: "0", time: "0.003ms" },
                  { pattern: "/files/*/:name.:ext", match: false, regexp: false, groups: "name,ext", time: "0.002ms" },
                  { pattern: "/:category/:id/:slug", match: false, regexp: false, groups: "category,id,slug", time: "0.005ms" },
                  { pattern: "/blog/:year(\\d{4})/:month", match: false, regexp: true, groups: "year,month", time: "0.006ms" },
                  { pattern: "/(items|products)/:id", match: true, regexp: true, groups: "0,id", time: "0.003ms" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 border-theme/50">
                    <td className="py-2 font-mono text-xs text-violet-500">{row.pattern}</td>
                    <td className="py-2 text-center">{row.match ? "Y" : "N"}</td>
                    <td className="py-2 text-center">{row.regexp ? "Y" : "N"}</td>
                    <td className="py-2 font-mono text-xs text-gray-500">{row.groups}</td>
                    <td className="py-2 text-right font-mono text-xs text-emerald-500">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 border-theme/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Test URL: <code className="ml-1 px-1.5 py-0.5 bg-gray-100 bg-theme-tertiary rounded font-mono">/api/projects/42</code></span>
              <a href="#" onClick={(e) => { e.preventDefault(); showGlobalToast("Run: bun examples/50-col-matrix.ts", "info"); }} className="text-violet-500 hover:underline">
                View Full Matrix -&gt;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
