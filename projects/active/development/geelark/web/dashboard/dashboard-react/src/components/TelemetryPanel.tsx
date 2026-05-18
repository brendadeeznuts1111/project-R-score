import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Clock, Camera, Settings, CheckCircle, XCircle } from 'lucide-react';

interface TelemetryAlert {
  id: number;
  timestamp: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  metric: string;
  value: number;
  threshold: number;
  unit: string;
  message: string;
  environment: string;
  resolved: boolean;
  notified: boolean;
}

interface PerformanceTrace {
  id?: number;
  timestamp: number;
  className: string;
  methodName: string;
  duration: number;
  args: any[];
  result?: any;
  environment: string;
}

interface TraceStatistics {
  methodKey: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface SystemSnapshot {
  id?: number;
  timestamp: number;
  label: string;
  environment: string;
  data: {
    servers: any[];
    monitoring: {
      totalEvents: number;
      totalRequests: number;
      activeConnections: number;
    };
    system: {
      uptime: number;
      memory: NodeJS.MemoryUsage;
      cpu: NodeJS.CpuUsage;
      platform: string;
      arch: string;
      nodeVersion: string;
    };
  };
}

interface TelemetryConfig {
  alertThresholds: {
    cpu: number;
    memory: number;
    connections: number;
    load: number;
    customMetrics: Record<string, number>;
  };
  notificationChannels: {
    slack?: { webhook: string; channel: string };
    discord?: { webhook: string };
    email?: { smtp: string; to: string[] };
  };
  snapshotInterval: number;
  tracingEnabled: boolean;
  tracingSampleRate: number;
}

type TabType = 'alerts' | 'traces' | 'snapshots' | 'config';

export const TelemetryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [traces, setTraces] = useState<PerformanceTrace[]>([]);
  const [traceStats, setTraceStats] = useState<TraceStatistics[]>([]);
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [config, setConfig] = useState<TelemetryConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api/telemetry';

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts?env=${process.env.NODE_ENV || 'development'}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    }
  };

  const fetchTraces = async (method?: string) => {
    try {
      const url = method
        ? `${API_BASE}/traces?method=${encodeURIComponent(method)}&limit=100`
        : `${API_BASE}/traces?limit=100`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch traces');
      const data = await response.json();
      setTraces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch traces');
    }
  };

  const fetchTraceStats = async (method?: string) => {
    try {
      const url = method
        ? `${API_BASE}/traces/stats?method=${encodeURIComponent(method)}`
        : `${API_BASE}/traces/stats`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch trace statistics');
      const data = await response.json();
      setTraceStats(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trace statistics');
    }
  };

  const fetchSnapshots = async () => {
    try {
      const response = await fetch(`${API_BASE}/snapshots?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch snapshots');
      const data = await response.json();
      setSnapshots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshots');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
    }
  };

  const resolveAlert = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/alerts/resolve/${id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      await fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const takeSnapshot = async () => {
    try {
      const response = await fetch(`${API_BASE}/snapshots/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'manual', env: process.env.NODE_ENV || 'development' }),
      });
      if (!response.ok) throw new Error('Failed to take snapshot');
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take snapshot');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'alerts') await fetchAlerts();
      else if (activeTab === 'traces') {
        await fetchTraces(selectedMethod || undefined);
        await fetchTraceStats(selectedMethod || undefined);
      }
      else if (activeTab === 'snapshots') await fetchSnapshots();
      else if (activeTab === 'config') await fetchConfig();
      setLoading(false);
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [activeTab, selectedMethod]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'alerts' as TabType, label: 'Alerts', icon: AlertTriangle, count: alerts.filter(a => !a.resolved).length },
    { id: 'traces' as TabType, label: 'Performance Traces', icon: TrendingUp },
    { id: 'snapshots' as TabType, label: 'Snapshots', icon: Camera },
    { id: 'config' as TabType, label: 'Configuration', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading telemetry data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Telemetry Dashboard</h2>
          <p className="text-gray-600 mt-1">Performance monitoring, alerts, and system snapshots</p>
        </div>
        <Activity className="w-8 h-8 text-blue-500" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
              <button
                onClick={() => {
                  fetch(`${API_BASE}/alerts/check`, { method: 'POST' }).then(fetchAlerts);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Check Alerts
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p className="text-gray-600">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-semibold">{alert.type.toUpperCase()}</span>
                          <span className="text-sm px-2 py-0.5 rounded-full bg-white bg-opacity-50">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{alert.message}</p>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span><strong>Metric:</strong> {alert.metric}</span>
                          <span><strong>Value:</strong> {alert.value.toFixed(2)} {alert.unit}</span>
                          <span><strong>Threshold:</strong> {alert.threshold} {alert.unit}</span>
                          <span><strong>Source:</strong> {alert.source}</span>
                          <span><strong>Time:</strong> {formatDate(alert.timestamp)}</span>
                        </div>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveAlert(alert.id!)}
                          className="ml-4 px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'traces' && (
          <div className="space-y-6">
            {/* Method Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Method:</label>
              <select
                value={selectedMethod || ''}
                onChange={(e) => setSelectedMethod(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                {traceStats.map((stat) => (
                  <option key={stat.methodKey} value={stat.methodKey}>
                    {stat.methodKey} ({stat.count} traces)
                  </option>
                ))}
              </select>
            </div>

            {/* Statistics */}
            {traceStats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {traceStats.map((stat) => (
                  <div key={stat.methodKey} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{stat.methodKey}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Count:</span>
                        <span className="font-medium">{stat.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Min:</span>
                        <span className="font-medium">{formatDuration(stat.min)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max:</span>
                        <span className="font-medium">{formatDuration(stat.max)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg:</span>
                        <span className="font-medium">{formatDuration(stat.avg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">P50:</span>
                        <span className="font-medium">{formatDuration(stat.p50)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">P95:</span>
                        <span className="font-medium">{formatDuration(stat.p95)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">P99:</span>
                        <span className="font-medium">{formatDuration(stat.p99)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Traces */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Traces</h3>
              {traces.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No traces recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {traces.slice(0, 50).map((trace, index) => (
                    <div
                      key={trace.id || index}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium text-blue-600">
                              {trace.className}.{trace.methodName}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              trace.duration > 100 ? 'bg-red-100 text-red-800' :
                              trace.duration > 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {formatDuration(trace.duration)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(trace.timestamp)} • {trace.environment}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">System Snapshots</h3>
              <button
                onClick={takeSnapshot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Take Snapshot
              </button>
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No snapshots available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">{snapshot.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {snapshot.environment}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{formatDate(snapshot.timestamp)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Events:</span>
                        <span className="ml-2 font-medium">{snapshot.data.monitoring.totalEvents}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Requests:</span>
                        <span className="ml-2 font-medium">{snapshot.data.monitoring.totalRequests}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Active Connections:</span>
                        <span className="ml-2 font-medium">{snapshot.data.monitoring.activeConnections}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Uptime:</span>
                        <span className="ml-2 font-medium">
                          {Math.floor(snapshot.data.system.uptime / 3600)}h
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span><strong>Platform:</strong> {snapshot.data.system.platform}</span>
                        <span><strong>Arch:</strong> {snapshot.data.system.arch}</span>
                        <span><strong>Node:</strong> {snapshot.data.system.nodeVersion}</span>
                        <span>
                          <strong>Memory:</strong> {(snapshot.data.system.memory.heapUsed / 1024 / 1024).toFixed(0)}MB /
                          {(snapshot.data.system.memory.heapTotal / 1024 / 1024).toFixed(0)}MB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && config && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Telemetry Configuration</h3>

            {/* Alert Thresholds */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Alert Thresholds</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPU Usage (%)</label>
                  <input
                    type="number"
                    value={config.alertThresholds.cpu}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Memory Usage (%)</label>
                  <input
                    type="number"
                    value={config.alertThresholds.memory}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connections</label>
                  <input
                    type="number"
                    value={config.alertThresholds.connections}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load (%)</label>
                  <input
                    type="number"
                    value={config.alertThresholds.load}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Notification Channels */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Notification Channels</h4>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${config.notificationChannels.slack ? 'text-green-600' : 'text-gray-400'}`}>
                  {config.notificationChannels.slack ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span>Slack</span>
                  {config.notificationChannels.slack && (
                    <span className="text-sm text-gray-600">({config.notificationChannels.slack.channel})</span>
                  )}
                </div>
                <div className={`flex items-center gap-2 ${config.notificationChannels.discord ? 'text-green-600' : 'text-gray-400'}`}>
                  {config.notificationChannels.discord ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span>Discord</span>
                </div>
                <div className={`flex items-center gap-2 ${config.notificationChannels.email ? 'text-green-600' : 'text-gray-400'}`}>
                  {config.notificationChannels.email ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span>Email</span>
                  {config.notificationChannels.email && (
                    <span className="text-sm text-gray-600">({config.notificationChannels.email.to.length} recipients)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tracing Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Performance Tracing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracing Enabled</label>
                  <div className={`flex items-center gap-2 ${config.tracingEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {config.tracingEnabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{config.tracingEnabled ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sample Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.tracingSampleRate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Snapshot Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Snapshot Settings</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Snapshot Interval</label>
                <input
                  type="number"
                  value={config.snapshotInterval / 1000 / 60}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled
                />
                <span className="text-sm text-gray-600 ml-2">minutes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
