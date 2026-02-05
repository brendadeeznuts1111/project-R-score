import { useEffect, useState } from 'react';

// Enhanced naming conventions for system dashboard interfaces
interface WebSocketConnectionMetrics {
  totalConnectionCount: number;
  activeConnectionCount: number;
  averageLatencyMilliseconds: number;
  serverUptimeMilliseconds: number;
}

interface SystemPerformanceMetrics {
  cpuUsagePercentage: number;
  memoryUsagePercentage: number;
  networkThroughput: number;
  diskUsagePercentage: number;
}

interface DashboardConfiguration {
  dashboardTitle: string;
  refreshIntervalMilliseconds: number;
  showRealTimeMetrics: boolean;
  enableWebSocketConnection: boolean;
}

// Enhanced system dashboard component with WebSocket Proxy API integration
export default function SystemDashboards() {
  const [webSocketMetrics, setWebSocketMetrics] = useState<WebSocketConnectionMetrics>({
    totalConnectionCount: 0,
    activeConnectionCount: 0,
    averageLatencyMilliseconds: 0,
    serverUptimeMilliseconds: 0
  });

  const [systemMetrics, setSystemMetrics] = useState<SystemPerformanceMetrics>({
    cpuUsagePercentage: 0,
    memoryUsagePercentage: 0,
    networkThroughput: 0,
    diskUsagePercentage: 0
  });

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfiguration>({
    dashboardTitle: "System Dashboards",
    refreshIntervalMilliseconds: 5000,
    showRealTimeMetrics: true,
    enableWebSocketConnection: true
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Enhanced effect hook for WebSocket connection management
  useEffect(() => {
    if (dashboardConfig.enableWebSocketConnection) {
      connectToWebSocketProxy();
    }

    return () => {
      disconnectFromWebSocketProxy();
    };
  }, [dashboardConfig.enableWebSocketConnection]);

  // Enhanced effect hook for metrics polling
  useEffect(() => {
    if (dashboardConfig.showRealTimeMetrics) {
      const pollingInterval = setInterval(() => {
        updateSystemMetrics();
        updateWebSocketMetrics();
      }, dashboardConfig.refreshIntervalMilliseconds);

      return () => clearInterval(pollingInterval);
    }
  }, [dashboardConfig.showRealTimeMetrics, dashboardConfig.refreshIntervalMilliseconds]);

  // Enhanced WebSocket connection method
  const connectToWebSocketProxy = async () => {
    setConnectionStatus('connecting');

    try {
      // Simulate WebSocket connection to our enhanced WebSocket Proxy API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setConnectionStatus('connected');
      setLastUpdateTime(new Date());

      // Update metrics after connection
      updateWebSocketMetrics();
    } catch (error) {
      console.error('Failed to connect to WebSocket Proxy:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Enhanced WebSocket disconnection method
  const disconnectFromWebSocketProxy = () => {
    setConnectionStatus('disconnected');
    // Reset metrics to initial state
    setWebSocketMetrics({
      totalConnectionCount: 0,
      activeConnectionCount: 0,
      averageLatencyMilliseconds: 0,
      serverUptimeMilliseconds: 0
    });
  };

  // Enhanced metrics update methods
  const updateWebSocketMetrics = () => {
    // Simulate WebSocket metrics from our enhanced WebSocket Proxy API
    setWebSocketMetrics({
      totalConnectionCount: Math.floor(Math.random() * 1000) + 500,
      activeConnectionCount: Math.floor(Math.random() * 100) + 20,
      averageLatencyMilliseconds: Math.floor(Math.random() * 50) + 10,
      serverUptimeMilliseconds: Date.now() - (Math.random() * 86400000) // Random uptime within 24 hours
    });
  };

  const updateSystemMetrics = () => {
    // Simulate system performance metrics
    setSystemMetrics({
      cpuUsagePercentage: Math.floor(Math.random() * 80) + 10,
      memoryUsagePercentage: Math.floor(Math.random() * 70) + 20,
      networkThroughput: Math.floor(Math.random() * 1000) + 100,
      diskUsagePercentage: Math.floor(Math.random() * 60) + 30
    });
  };

  // Enhanced styling utility methods
  const getConnectionStatusColorClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMetricColorClass = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-red-600';
    if (value >= threshold * 0.8) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Enhanced dashboard configuration methods
  const toggleRealTimeMetrics = () => {
    setDashboardConfig(prev => ({
      ...prev,
      showRealTimeMetrics: !prev.showRealTimeMetrics
    }));
  };

  const toggleWebSocketConnection = () => {
    setDashboardConfig(prev => ({
      ...prev,
      enableWebSocketConnection: !prev.enableWebSocketConnection
    }));
  };

  const updateRefreshInterval = (newInterval: number) => {
    setDashboardConfig(prev => ({
      ...prev,
      refreshIntervalMilliseconds: newInterval
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Enhanced Header Section */}
        <header className="text-center space-y-4">
          <h1
            className="text-3xl md:text-5xl font-bold text-blue-600 mb-2"
            data-component-name="<span />"
          >
            {dashboardConfig.dashboardTitle}
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time WebSocket Proxy API monitoring and system performance metrics
          </p>
        </header>

        {/* Enhanced Connection Status Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Connection Status</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg border ${getConnectionStatusColorClass()}`}>
                <span className="font-semibold capitalize">{connectionStatus}</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdateTime.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={toggleWebSocketConnection}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dashboardConfig.enableWebSocketConnection
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {dashboardConfig.enableWebSocketConnection ? 'Disconnect' : 'Connect'}
              </button>
              <button
                onClick={toggleRealTimeMetrics}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dashboardConfig.showRealTimeMetrics
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                {dashboardConfig.showRealTimeMetrics ? 'Pause Updates' : 'Resume Updates'}
              </button>
            </div>
          </div>
        </section>

        {/* Enhanced WebSocket Metrics Dashboard */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">WebSocket Proxy Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-3xl md:text-4xl font-bold text-blue-600">
                {webSocketMetrics.totalConnectionCount}
              </p>
              <p className="text-gray-600 mt-2 font-medium">Total Connections</p>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <p className="text-3xl md:text-4xl font-bold text-green-600">
                {webSocketMetrics.activeConnectionCount}
              </p>
              <p className="text-gray-600 mt-2 font-medium">Active Connections</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-3xl md:text-4xl font-bold text-purple-600">
                {webSocketMetrics.averageLatencyMilliseconds}ms
              </p>
              <p className="text-gray-600 mt-2 font-medium">Average Latency</p>
            </div>
            <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-3xl md:text-4xl font-bold text-orange-600">
                {Math.floor(webSocketMetrics.serverUptimeMilliseconds / 3600000)}h
              </p>
              <p className="text-gray-600 mt-2 font-medium">Server Uptime</p>
            </div>
          </div>
        </section>

        {/* Enhanced System Performance Dashboard */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">System Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
              <p className={`text-3xl md:text-4xl font-bold ${getMetricColorClass(systemMetrics.cpuUsagePercentage, 80)}`}>
                {systemMetrics.cpuUsagePercentage}%
              </p>
              <p className="text-gray-600 mt-2 font-medium">CPU Usage</p>
            </div>
            <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className={`text-3xl md:text-4xl font-bold ${getMetricColorClass(systemMetrics.memoryUsagePercentage, 85)}`}>
                {systemMetrics.memoryUsagePercentage}%
              </p>
              <p className="text-gray-600 mt-2 font-medium">Memory Usage</p>
            </div>
            <div className="text-center p-6 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-3xl md:text-4xl font-bold text-indigo-600">
                {systemMetrics.networkThroughput}MB/s
              </p>
              <p className="text-gray-600 mt-2 font-medium">Network Throughput</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className={`text-3xl md:text-4xl font-bold ${getMetricColorClass(systemMetrics.diskUsagePercentage, 90)}`}>
                {systemMetrics.diskUsagePercentage}%
              </p>
              <p className="text-gray-600 mt-2 font-medium">Disk Usage</p>
            </div>
          </div>
        </section>

        {/* Enhanced Configuration Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Dashboard Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval (milliseconds)
              </label>
              <select
                value={dashboardConfig.refreshIntervalMilliseconds}
                onChange={(e) => updateRefreshInterval(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dashboard Title
              </label>
              <input
                type="text"
                value={dashboardConfig.dashboardTitle}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, dashboardTitle: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
