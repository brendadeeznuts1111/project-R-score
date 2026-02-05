import React, { useEffect, useState } from 'react';

// Health check types
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceHealth[];
  system: SystemHealth;
  errors: ErrorReport[];
  metrics: HealthMetrics;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  memory: { used: number; total: number; percentage: number };
  cpu: { usage: number; loadAverage: number[] };
  disk: { used: number; total: number; percentage: number };
  network: { connected: boolean; latency?: number };
}

interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
}

interface HealthMetrics {
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
}

/**
 * Health Monitor Component
 *
 * Displays real-time health status, system metrics, and error reports
 */
const HealthMonitor: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      // Set fallback health data
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        services: [],
        system: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0, loadAverage: [0, 0, 0] },
          disk: { used: 0, total: 0, percentage: 0 },
          network: { connected: false }
        },
        errors: [{
          id: 'fetch-error',
          timestamp: new Date().toISOString(),
          level: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          resolved: false
        }],
        metrics: {
          totalRequests: 0,
          errorRate: 0,
          averageResponseTime: 0,
          activeConnections: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealth, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading health status...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-xl mb-4">❌ Health Check Failed</div>
        <p className="text-gray-600">Unable to fetch health status. Please try again.</p>
        <button
          onClick={fetchHealth}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🏥 System Health</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button
            onClick={fetchHealth}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Overall Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)} {health.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Uptime:</span>
            <span className="ml-2 font-medium">{formatUptime(health.uptime)}</span>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>
            <span className="ml-2 font-medium">{health.version}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Check:</span>
            <span className="ml-2 font-medium">
              {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Services</h3>
        <div className="space-y-3">
          {health.services.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getStatusIcon(service.status)}</span>
                <div>
                  <div className="font-medium">{service.name}</div>
                  {service.error && (
                    <div className="text-sm text-red-600">{service.error}</div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                  {service.status}
                </div>
                {service.responseTime && (
                  <div className="text-gray-500 mt-1">{service.responseTime}ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Memory</span>
              <span className="text-sm text-gray-500">{health.system.memory.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.system.memory.percentage > 90 ? 'bg-red-600' :
                  health.system.memory.percentage > 70 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(health.system.memory.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(health.system.memory.used / 1024 / 1024).toFixed(1)}MB / {(health.system.memory.total / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>

          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CPU Usage</span>
              <span className="text-sm text-gray-500">{health.system.cpu.usage.toFixed(2)}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.system.cpu.usage > 5 ? 'bg-red-600' :
                  health.system.cpu.usage > 2 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(health.system.cpu.usage * 20, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Load: {health.system.cpu.loadAverage[0].toFixed(2)}
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Disk</span>
              <span className="text-sm text-gray-500">{health.system.disk.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.system.disk.percentage > 90 ? 'bg-red-600' :
                  health.system.disk.percentage > 70 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(health.system.disk.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(health.system.disk.used / 1024 / 1024).toFixed(1)}MB / {(health.system.disk.total / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>

          {/* Network */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Network</span>
              <span className={`text-sm ${health.system.network.connected ? 'text-green-600' : 'text-red-600'}`}>
                {health.system.network.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${health.system.network.connected ? 'bg-green-600' : 'bg-red-600'}`}
                style={{ width: health.system.network.connected ? '100%' : '0%' }}
              ></div>
            </div>
            {health.system.network.latency && (
              <div className="text-xs text-gray-500 mt-1">
                Latency: {health.system.network.latency}ms
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{health.metrics.totalRequests}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{(health.metrics.errorRate * 100).toFixed(2)}%</div>
            <div className="text-sm text-gray-500">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{health.metrics.averageResponseTime.toFixed(0)}ms</div>
            <div className="text-sm text-gray-500">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{health.metrics.activeConnections}</div>
            <div className="text-sm text-gray-500">Active Connections</div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {health.errors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
          <div className="space-y-3">
            {health.errors.slice(0, 5).map((error, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      error.level === 'error' ? 'text-red-600' :
                      error.level === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                    }`}>
                      {error.level.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {error.resolved && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Resolved</span>
                  )}
                </div>
                <div className="text-sm text-gray-700">{error.message}</div>
                {error.context && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Context</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthMonitor;
