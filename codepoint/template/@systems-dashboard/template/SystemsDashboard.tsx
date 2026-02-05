import { useEffect, useState } from "react";

interface ServerMonitoringData {
  id: string;
  name: string;
  region: string;
  cpu: number;
  memory: number;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  connections: number;
  lastUpdate: Date;
}

interface APIEndpointInfo {
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  component: string;
  latency: number;
  auth: "none" | "required" | "optional";
  description: string;
  status: "active" | "deprecated" | "experimental";
}

interface SystemPerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  threshold: number;
  status: "healthy" | "warning" | "critical";
  lastUpdate: Date;
}

interface DashboardTableData {
  columns: Array<{
    key: string;
    header: string;
    type: string;
    width?: number;
    align?: "left" | "right" | "center";
  }>;
  rows: any[];
  caption?: string;
}

export default function SystemsDashboard() {
  const [servers, setServers] = useState<ServerMonitoringData[]>([
    {
      id: "1",
      name: "web-01",
      region: "us-east",
      cpu: 45,
      memory: 65,
      status: "healthy",
      uptime: 99.9,
      connections: 2450,
      lastUpdate: new Date(),
    },
    {
      id: "2",
      name: "web-02",
      region: "us-west",
      cpu: 78,
      memory: 89,
      status: "warning",
      uptime: 98.5,
      connections: 1890,
      lastUpdate: new Date(),
    },
    {
      id: "3",
      name: "api-01",
      region: "eu-central",
      cpu: 22,
      memory: 34,
      status: "healthy",
      uptime: 99.7,
      connections: 850,
      lastUpdate: new Date(),
    },
    {
      id: "4",
      name: "db-01",
      region: "asia-pacific",
      cpu: 92,
      memory: 95,
      status: "critical",
      uptime: 95.2,
      connections: 320,
      lastUpdate: new Date(),
    },
  ]);

  const [apiEndpoints] = useState<APIEndpointInfo[]>([
    {
      method: "GET",
      path: "/health",
      component: "HealthChecker",
      latency: 0.1,
      auth: "none",
      description: "Health check endpoint",
      status: "active",
    },
    {
      method: "GET",
      path: "/metrics",
      component: "StatsCollector",
      latency: 0.3,
      auth: "required",
      description: "Prometheus metrics",
      status: "active",
    },
    {
      method: "POST",
      path: "/api/v1/proxy",
      component: "ProxyServer",
      latency: 1.2,
      auth: "required",
      description: "Create proxy session",
      status: "active",
    },
    {
      method: "WS",
      path: "/ws/proxy",
      component: "WebSocketProxy",
      latency: 0.8,
      auth: "optional",
      description: "WebSocket proxy endpoint",
      status: "experimental",
    },
    {
      method: "DELETE",
      path: "/api/v1/connections/:id",
      component: "ConnectionManager",
      latency: 0.3,
      auth: "required",
      description: "Close connection",
      status: "active",
    },
  ]);

  const [performanceMetrics] = useState<SystemPerformanceMetric[]>([
    {
      metric: "Active Connections",
      value: 2456,
      unit: "connections",
      trend: "up",
      threshold: 10000,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Avg Latency",
      value: 42.5,
      unit: "ms",
      trend: "down",
      threshold: 100,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Error Rate",
      value: 0.12,
      unit: "%",
      trend: "up",
      threshold: 1,
      status: "warning",
      lastUpdate: new Date(),
    },
    {
      metric: "Throughput",
      value: 12500,
      unit: "req/s",
      trend: "up",
      threshold: 10000,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Memory Usage",
      value: 245,
      unit: "MB",
      trend: "stable",
      threshold: 512,
      status: "healthy",
      lastUpdate: new Date(),
    },
  ]);

  const [selectedTable, setSelectedTable] = useState<
    "servers" | "api" | "performance"
  >("servers");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "text" | "json" | "csv" | "html"
  >("text");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [tableCode, setTableCode] = useState("");

  // Simulate real-time updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setServers((prev: ServerMonitoringData[]) =>
        prev.map((server: ServerMonitoringData) => ({
          ...server,
          cpu: Math.max(
            0,
            Math.min(100, server.cpu + (Math.random() - 0.5) * 10),
          ),
          memory: Math.max(
            0,
            Math.min(100, server.memory + (Math.random() - 0.5) * 5),
          ),
          connections: Math.max(
            0,
            server.connections + Math.floor((Math.random() - 0.5) * 100),
          ),
          lastUpdate: new Date(),
          status:
            server.cpu > 85
              ? "critical"
              : server.cpu > 70
                ? "warning"
                : "healthy",
        })),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "good":
      case "excellent":
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "experimental":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "deprecated":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "text-green-600 bg-green-100";
      case "POST":
        return "text-blue-600 bg-blue-100";
      case "PUT":
        return "text-orange-600 bg-orange-100";
      case "DELETE":
        return "text-red-600 bg-red-100";
      case "WS":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      case "stable":
        return "→";
      default:
        return "→";
    }
  };

  const generateTableCode = (type: string) => {
    let code = "";

    if (type === "servers") {
      code = `// Server Monitoring Table
const serverData = {
  columns: [
    { key: "name", header: "Server", type: "string", width: 10 },
    { key: "region", header: "Region", type: "string", width: 12 },
    { key: "cpu", header: "CPU %", type: "percentage", align: "right" },
    { key: "memory", header: "Memory %", type: "percentage", align: "right" },
    { key: "status", header: "Status", type: "badge" },
    { key: "connections", header: "Connections", type: "number", align: "right" }
  ],
  rows: ${JSON.stringify(
    servers.map((s: ServerMonitoringData) => ({
      name: s.name,
      region: s.region,
      cpu: s.cpu,
      memory: s.memory,
      status: s.status,
      connections: s.connections,
    })),
    null,
    2,
  )}
};

console.log(inspect.table(serverData, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  caption: "Server Status - " + new Date().toLocaleTimeString()
}));`;
    } else if (type === "api") {
      code = `// API Endpoints Table
const apiData = {
  columns: [
    { key: "method", header: "Method", type: "badge", width: 8 },
    { key: "path", header: "Path", type: "code", width: 25 },
    { key: "component", header: "Component", type: "string", width: 20 },
    { key: "latency", header: "Latency", type: "duration", align: "right" },
    { key: "auth", header: "Auth", type: "badge", width: 8 },
    { key: "description", header: "Description", type: "string", width: 40 }
  ],
  rows: ${JSON.stringify(apiEndpoints, null, 2)}
};

console.log(inspect.table(apiData, {
  theme: "dark",
  zebra: true,
  sortBy: "method",
  sortOrder: "asc"
}));`;
    } else if (type === "performance") {
      code = `// Performance Metrics Table
const metricsData = {
  columns: [
    { key: "metric", header: "Metric", type: "string" },
    { key: "value", header: "Value", type: "number", align: "right" },
    { key: "unit", header: "Unit", type: "string" },
    { key: "trend", header: "Trend", type: "badge" },
    { key: "threshold", header: "Threshold", type: "number", align: "right" },
    { key: "status", header: "Status", type: "badge" }
  ],
  rows: ${JSON.stringify(
    performanceMetrics.map((m: SystemPerformanceMetric) => ({
      metric: m.metric,
      value: m.value,
      unit: m.unit,
      trend: m.trend,
      threshold: m.threshold,
      status: m.status,
    })),
    null,
    2,
  )}
};

console.log(inspect.table(metricsData, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  sortBy: "value",
  sortOrder: "desc"
}));`;
    }

    setTableCode(code);
    setShowCodeModal(true);
  };

  const exportTable = () => {
    let data = "";
    let filename = "";

    if (selectedTable === "servers") {
      filename = `servers.${exportFormat}`;
      if (exportFormat === "json") {
        data = JSON.stringify(servers, null, 2);
      } else if (exportFormat === "csv") {
        data = "name,region,cpu,memory,status,uptime,connections\n";
        servers.forEach((s) => {
          data += `${s.name},${s.region},${s.cpu},${s.memory},${s.status},${s.uptime},${s.connections}\n`;
        });
      } else {
        data = "Server Monitoring Data\n\n";
        servers.forEach((s: ServerMonitoringData) => {
          data += `${s.name} (${s.region}) - CPU: ${s.cpu}%, Memory: ${s.memory}%, Status: ${s.status}\n`;
        });
      }
    }

    // Create download
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🖥️ Systems Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Bun inspect.table() - Complete Practical Guide Implementation
          </p>
        </header>

        {/* Controls */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              {(["servers", "api", "performance"] as const).map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedTable === table
                      ? "bg-blue-600 text-white"
                      : "bg-white/20 text-gray-300 hover:bg-white/30"
                  }`}
                >
                  {table === "servers"
                    ? "🖥️ Servers"
                    : table === "api"
                      ? "🔗 API"
                      : "📊 Metrics"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isLiveMode
                    ? "bg-green-600 text-white"
                    : "bg-white/20 text-gray-300 hover:bg-white/30"
                }`}
              >
                {isLiveMode ? "🔴 Live" : "⏸️ Paused"}
              </button>

              <button
                onClick={() => generateTableCode(selectedTable)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200"
              >
                📝 Code
              </button>

              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="px-4 py-2 bg-white/20 text-gray-300 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="html">HTML</option>
              </select>

              <button
                onClick={exportTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
              >
                📥 Export
              </button>
            </div>
          </div>
        </section>

        {/* Servers Table */}
        {selectedTable === "servers" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Server Monitoring
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Server</th>
                    <th className="px-4 py-3 text-left">Region</th>
                    <th className="px-4 py-3 text-right">CPU %</th>
                    <th className="px-4 py-3 text-right">Memory %</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Connections</th>
                    <th className="px-4 py-3 text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {servers.map((server) => (
                    <tr
                      key={server.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono">{server.name}</td>
                      <td className="px-4 py-3">{server.region}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            server.cpu > 85
                              ? "text-red-400"
                              : server.cpu > 70
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {server.cpu}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            server.memory > 85
                              ? "text-red-400"
                              : server.memory > 70
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {server.memory}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(server.status)}`}
                        >
                          {server.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {server.connections.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">{server.uptime}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Last updated: {servers[0]?.lastUpdate.toLocaleTimeString()}
            </div>
          </section>
        )}

        {/* API Endpoints Table */}
        {selectedTable === "api" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              API Endpoints Documentation
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Path</th>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-right">Latency</th>
                    <th className="px-4 py-3 text-left">Auth</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {apiEndpoints.map((endpoint, index) => (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {endpoint.path}
                      </td>
                      <td className="px-4 py-3">{endpoint.component}</td>
                      <td className="px-4 py-3 text-right">
                        {endpoint.latency}ms
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            endpoint.auth === "required"
                              ? "bg-red-100 text-red-600"
                              : endpoint.auth === "optional"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-green-100 text-green-600"
                          }`}
                        >
                          {endpoint.auth}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(endpoint.status)}`}
                        >
                          {endpoint.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {endpoint.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Performance Metrics Table */}
        {selectedTable === "performance" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Performance Metrics Dashboard
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Metric</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Trend</th>
                    <th className="px-4 py-3 text-right">Threshold</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {performanceMetrics.map((metric, index) => (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{metric.metric}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {metric.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{metric.unit}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1 ${
                            metric.trend === "up"
                              ? "text-green-400"
                              : metric.trend === "down"
                                ? "text-red-400"
                                : "text-gray-400"
                          }`}
                        >
                          {getTrendIcon(metric.trend)} {metric.trend}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {metric.threshold.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(metric.status)}`}
                        >
                          {metric.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Bun inspect.table() Code Examples */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Quick Reference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Basic Usage</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`import { inspect } from "bun";
console.log(inspect.table(data));`}
              </pre>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">With Options</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`inspect.table(data, {
  theme: "dark",
  showBorder: true,
  zebra: true
});`}
              </pre>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Export Formats</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`// HTML, JSON, CSV, Markdown
inspect.table(data, {
  output: "html"
});`}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                Generated Bun inspect.table() Code
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="bg-black rounded-lg p-4 overflow-x-auto max-h-[60vh]">
              <pre className="text-sm text-green-400 font-mono">
                {tableCode}
              </pre>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tableCode);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
