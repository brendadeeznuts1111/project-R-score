import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Smartphone, Globe, Database, AlertTriangle, TrendingUp } from 'lucide-react';

interface MonitoringSummary {
  totalEvents: number;
  uniqueIPs: number;
  uniqueDevices: number;
  environments: string[];
}

interface EnvironmentMetrics {
  environment: string;
  totalRequests: number;
  uniqueIPs: number;
  uniqueDevices: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

interface TopIP {
  ip: string;
  requestCount: number;
  lastRequest: number;
  avgResponseTime: number;
}

interface TopDevice {
  fingerprint: string;
  deviceType: string;
  requestCount: number;
  lastSeen: number;
  userAgent: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

export const MonitoringDashboard: React.FC = () => {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [environmentMetrics, setEnvironmentMetrics] = useState<EnvironmentMetrics | null>(null);
  const [topIPs, setTopIPs] = useState<TopIP[]>([]);
  const [topDevices, setTopDevices] = useState<TopDevice[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('development');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/monitoring/summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Fetch environment metrics
      const envRes = await fetch(`/api/monitoring/environment/${selectedEnvironment}?env=${selectedEnvironment}`);
      const envData = await envRes.json();
      setEnvironmentMetrics(envData);

      // Fetch top IPs
      const ipsRes = await fetch(`/api/monitoring/ips/top?env=${selectedEnvironment}&limit=10`);
      const ipsData = await ipsRes.json();
      setTopIPs(ipsData);

      // Fetch top devices
      const devicesRes = await fetch(`/api/monitoring/devices/top?env=${selectedEnvironment}&limit=10`);
      const devicesData = await devicesRes.json();
      setTopDevices(devicesData);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [selectedEnvironment]);

  if (loading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
        <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
        <p className="text-slate-400">Loading monitoring data...</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatResponseTime = (ms: number) => {
    return `${ms.toFixed(2)}ms`;
  };

  const formatErrorRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const deviceTypeIcon = (type: string) => {
    switch (type) {
      case 'ios': return '🍎';
      case 'android': return '🤖';
      case 'windows': return '🪟';
      case 'macos': return '🍎';
      case 'linux': return '🐧';
      default: return '📱';
    }
  };

  // Prepare chart data
  const endpointChartData = environmentMetrics?.topEndpoints.map(ep => ({
    name: ep.endpoint,
    requests: ep.count,
  })) || [];

  const environmentComparisonData = summary?.environments.map(env => ({
    name: env,
    requests: 0, // Would need to fetch each environment's metrics
  })) || [];

  const deviceTypeData = topDevices.reduce((acc, device) => {
    const existing = acc.find(item => item.name === device.deviceType);
    if (existing) {
      existing.value += device.requestCount;
    } else {
      acc.push({ name: device.deviceType, value: device.requestCount });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Monitoring Dashboard</h2>
            <p className="text-sm text-slate-400">Per-IP, per-device, per-environment tracking</p>
          </div>
        </div>

        {/* Environment Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Environment:</label>
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {summary?.environments.map(env => (
              <option key={env} value={env}>{env}</option>
            )) || <option value="development">development</option>}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total Events</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatNumber(summary?.totalEvents || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">All time</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-green-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Unique IPs</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatNumber(summary?.uniqueIPs || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">Across all environments</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Smartphone className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Unique Devices</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatNumber(summary?.uniqueDevices || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">Device fingerprints</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-yellow-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Environments</span>
          </div>
          <div className="text-2xl font-bold text-white">{summary?.environments.length || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Active environments</div>
        </div>
      </div>

      {/* Environment Metrics */}
      {environmentMetrics && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Environment Metrics: {selectedEnvironment}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Total Requests</div>
              <div className="text-xl font-bold text-white">{formatNumber(environmentMetrics.totalRequests)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Unique IPs</div>
              <div className="text-xl font-bold text-white">{formatNumber(environmentMetrics.uniqueIPs)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Avg Response Time</div>
              <div className="text-xl font-bold text-white">{formatResponseTime(environmentMetrics.avgResponseTime)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Error Rate</div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                {formatErrorRate(environmentMetrics.errorRate)}
                {environmentMetrics.errorRate > 0.05 && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Endpoints Bar Chart */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Endpoints</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={endpointChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device Type Distribution */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Device Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {deviceTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top IPs Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Top IPs by Request Count</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">IP Address</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Requests</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Avg Response</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Last Request</th>
              </tr>
            </thead>
            <tbody>
              {topIPs.map((ip, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-white font-mono">{ip.ip}</td>
                  <td className="py-2 px-3 text-indigo-400 font-bold">{formatNumber(ip.requestCount)}</td>
                  <td className="py-2 px-3 text-slate-300">{formatResponseTime(ip.avgResponseTime)}</td>
                  <td className="py-2 px-3 text-slate-500 text-xs">{formatTimestamp(ip.lastRequest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Devices Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Top Devices by Request Count</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Device</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Type</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Requests</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Last Seen</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {topDevices.map((device, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{deviceTypeIcon(device.deviceType)}</span>
                      <span className="font-mono text-xs text-slate-500">{device.fingerprint.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">{device.deviceType}</span>
                  </td>
                  <td className="py-2 px-3 text-purple-400 font-bold">{formatNumber(device.requestCount)}</td>
                  <td className="py-2 px-3 text-slate-500 text-xs">{formatTimestamp(device.lastSeen)}</td>
                  <td className="py-2 px-3 text-slate-600 text-xs truncate max-w-xs" title={device.userAgent}>
                    {device.userAgent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
