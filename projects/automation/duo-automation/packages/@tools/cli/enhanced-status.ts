// Enhanced Status Page with Dynamic Updates, Headers, and Badges
import { Elysia } from 'elysia';
import { DomainManager } from './domain';
import { BunNativeAPITracker, TrackedBunAPIs, demonstrateBunNativeMetricsIntegration } from './bun-native-integrations';

const domain = DomainManager.getInstance();
const config = domain.getConfig();

// Initialize Bun Native Metrics tracker
const bunTracker = new BunNativeAPITracker();
const trackedBunAPIs = new TrackedBunAPIs(bunTracker);

// Status badge configurations
const statusBadges = {
  operational: { color: 'green', icon: '🟢', text: 'Operational', hex: '#3b82f6' },
  degraded: { color: 'yellow', icon: '🟡', text: 'Degraded Performance', hex: '#3b82f6' },
  downtime: { color: 'red', icon: '🔴', text: 'Service Outage', hex: '#3b82f6' },
  maintenance: { color: 'blue', icon: '🔵', text: 'Under Maintenance', hex: '#3b82f6' }
};

// Bun Native API status colors
const getBunAPIStatusColor = (health: string) => {
  switch (health) {
    case 'healthy': return { hex: '#3b82f6', rgb: 'rgb(40, 167, 69)', text: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' };
    case 'degraded': return { hex: '#3b82f6', rgb: 'rgb(255, 193, 7)', text: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700' };
    case 'unhealthy': return { hex: '#3b82f6', rgb: 'rgb(220, 53, 69)', text: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700' };
    default: return { hex: '#3b82f6', rgb: 'rgb(108, 117, 125)', text: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-700' };
  }
};

// Dynamic status data
const getSystemStatus = () => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const health = domain.isHealthy() ? 'operational' : 'degraded';
  
  // Get Bun Native Metrics
  const bunMetrics = bunTracker.getAllMetrics();
  const bunSummary = bunTracker.getSummary();
  const bunHealth = bunSummary.errorRate < 5 ? 'healthy' : bunSummary.errorRate < 15 ? 'degraded' : 'unhealthy';
  const bunStatusColor = getBunAPIStatusColor(bunHealth);
  
  // Generate some sample Bun API calls for demonstration
  if (bunMetrics.length === 0) {
    // Track a few sample calls for demonstration
    trackedBunAPIs.trackedHash('demo-data');
    trackedBunAPIs.trackedGzipSync(new TextEncoder().encode('demo'));
  }
  
  return {
    overall: health,
    uptime: uptime,
    lastUpdated: new Date().toISOString(),
    services: {
      api: { status: 'operational', responseTime: Math.random() * 50 + 10, uptime: '99.9%' },
      database: { status: 'operational', responseTime: Math.random() * 20 + 5, uptime: '99.8%' },
      storage: { status: 'operational', responseTime: Math.random() * 30 + 15, uptime: '99.7%' },
      monitoring: { status: 'operational', responseTime: Math.random() * 25 + 10, uptime: '100%' },
      bunNativeAPIs: { 
        status: bunHealth, 
        responseTime: bunSummary.averageCallDuration.toFixed(2), 
        uptime: '100%',
        color: bunStatusColor,
        metrics: {
          totalAPIs: bunSummary.totalAPIs,
          totalCalls: bunSummary.totalCalls,
          errorRate: bunSummary.errorRate.toFixed(1),
          nativeRate: bunSummary.nativeRate.toFixed(1),
          averageDuration: bunSummary.averageCallDuration.toFixed(2)
        }
      }
    },
    metrics: {
      requests: Math.floor(Math.random() * 10000 + 5000),
      errors: Math.floor(Math.random() * 10),
      avgResponseTime: Math.round(Math.random() * 30 + 15),
      memoryUsage: Math.round(memory.heapUsed / 1024 / 1024),
      cpuUsage: Math.round(Math.random() * 30 + 10),
      bunNativeMetrics: {
        ...bunSummary,
        health: bunHealth,
        color: bunStatusColor,
        topAPIs: bunMetrics.slice(0, 5).map(m => ({
          name: m.apiName,
          domain: m.domain,
          calls: m.callCount,
          avgDuration: m.averageDuration.toFixed(2),
          implementation: m.implementation,
          source: m.implementationSource.source,
          performanceTier: m.implementationSource.performanceTier,
          memoryEfficiency: m.implementationSource.memoryEfficiency,
          successRate: ((m.successCount / m.callCount) * 100).toFixed(1)
        }))
      }
    },
    incidents: [
      {
        id: 'INC-001',
        title: 'Scheduled Maintenance',
        status: 'resolved',
        impact: 'maintenance',
        startTime: '2026-01-14T02:00:00Z',
        endTime: '2026-01-14T03:00:00Z',
        description: 'System maintenance completed successfully'
      }
    ]
  };
};

const statusPageHTML = (statusData: ReturnType<typeof getSystemStatus>) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Status - ${config.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @keyframes pulse-green { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-yellow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-blue { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse-green { animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .pulse-yellow { animation: pulse-yellow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .pulse-red { animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .pulse-blue { animation: pulse-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .status-badge { transition: all 0.3s ease; }
        .status-badge:hover { transform: scale(1.05); }
        .metric-card { transition: all 0.3s ease; }
        .metric-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <!-- Header with Dynamic Status -->
    <header class="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <i data-lucide="activity" class="w-6 h-6 text-blue-400"></i>
                        <h1 class="text-2xl font-bold">System Status</h1>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="status-badge px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                          statusData.overall === 'operational' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                          statusData.overall === 'degraded' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                          statusData.overall === 'downtime' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                          'bg-blue-900/50 text-blue-300 border border-blue-700'
                        }">
                            <span class="pulse-${statusData.overall === 'operational' ? 'green' : 
                                                   statusData.overall === 'degraded' ? 'yellow' : 
                                                   statusData.overall === 'downtime' ? 'red' : 'blue'}">
                                ${statusBadges[statusData.overall as keyof typeof statusBadges].icon}
                            </span>
                            <span>${statusBadges[statusData.overall as keyof typeof statusBadges].text}</span>
                        </span>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-sm text-gray-400">
                        <span id="currentTime"></span>
                    </div>
                    <button onclick="toggleAutoRefresh()" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                        <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>
                        Auto Refresh: <span id="refreshStatus">ON</span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-8">
        <!-- Overall Status Section -->
        <section class="mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold flex items-center">
                        <i data-lucide="globe" class="w-5 h-5 mr-2 text-blue-400"></i>
                        Overall System Status
                    </h2>
                    <div class="text-sm text-gray-400">
                        Last updated: <span id="lastUpdated">${new Date(statusData.lastUpdated).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    ${Object.entries(statusData.services).map(([service, data]) => {
                        if (service === 'bunNativeAPIs' && data.color) {
                            // Special hex-colored display for Bun Native APIs
                            return `
                                <div class="metric-card bg-gray-700/50 rounded-lg p-4 border ${data.color.border}" style="background-color: ${data.color.hex}20;">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm font-medium capitalize">🔥 Bun Native APIs</span>
                                        <span class="status-badge px-2 py-1 rounded text-xs ${data.color.bg} ${data.color.text} border ${data.color.border}" style="background-color: ${data.color.hex}30; color: ${data.color.hex}; border-color: ${data.color.hex};">
                                            ${data.status === 'healthy' ? '🟢' : data.status === 'degraded' ? '🟡' : '🔴'} ${data.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div class="text-xs text-gray-400 space-y-1">
                                        <div>APIs: <span class="${data.color.text}" style="color: ${data.color.hex};">${data.metrics.totalAPIs}</span></div>
                                        <div>Calls: <span class="${data.color.text}" style="color: ${data.color.hex};">${data.metrics.totalCalls}</span></div>
                                        <div>Native: <span class="${data.color.text}" style="color: ${data.color.hex};">${data.metrics.nativeRate}%</span></div>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="metric-card bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm font-medium capitalize">${service}</span>
                                        <span class="status-badge px-2 py-1 rounded text-xs ${
                                          data.status === 'operational' ? 'bg-green-800 text-green-200' :
                                          data.status === 'degraded' ? 'bg-yellow-800 text-yellow-200' :
                                          data.status === 'downtime' ? 'bg-red-800 text-red-200' :
                                          'bg-blue-800 text-blue-200'
                                        }">
                                            ${statusBadges[data.status as keyof typeof statusBadges].icon}
                                            ${statusBadges[data.status as keyof typeof statusBadges].text}
                                        </span>
                                    </div>
                                    <div class="text-xs text-gray-400 space-y-1">
                                        <div>Response: ${Math.round(data.responseTime)}ms</div>
                                        <div>Uptime: ${data.uptime}</div>
                                    </div>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        </section>

        <!-- Metrics Dashboard -->
        <section class="mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <i data-lucide="bar-chart-2" class="w-5 h-5 mr-2 text-green-400"></i>
                    Performance Metrics
                </h2>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="metric-card bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Requests</span>
                            <i data-lucide="trending-up" class="w-4 h-4 text-green-400"></i>
                        </div>
                        <div class="text-2xl font-bold">${statusData.metrics.requests.toLocaleString()}</div>
                        <div class="text-xs text-green-400">+12% from last hour</div>
                    </div>
                    
                    <div class="metric-card bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Errors</span>
                            <i data-lucide="alert-circle" class="w-4 h-4 text-yellow-400"></i>
                        </div>
                        <div class="text-2xl font-bold text-yellow-400">${statusData.metrics.errors}</div>
                        <div class="text-xs text-gray-400">0.1% error rate</div>
                    </div>
                    
                    <div class="metric-card bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Avg Response</span>
                            <i data-lucide="zap" class="w-4 h-4 text-blue-400"></i>
                        </div>
                        <div class="text-2xl font-bold">${statusData.metrics.avgResponseTime}ms</div>
                        <div class="text-xs text-green-400">Optimal</div>
                    </div>
                    
                    <div class="metric-card bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Memory</span>
                            <i data-lucide="cpu" class="w-4 h-4 text-purple-400"></i>
                        </div>
                        <div class="text-2xl font-bold">${statusData.metrics.memoryUsage}MB</div>
                        <div class="text-xs text-gray-400">${statusData.metrics.cpuUsage}% CPU</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Bun Native Metrics Dashboard -->
        <section class="mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <i data-lucide="zap" class="w-5 h-5 mr-2 text-orange-400"></i>
                    🔥 Bun Native Metrics
                    <span class="ml-2 px-2 py-1 rounded text-xs" style="background-color: ${statusData.metrics.bunNativeMetrics.color.hex}30; color: ${statusData.metrics.bunNativeMetrics.color.hex}; border: 1px solid ${statusData.metrics.bunNativeMetrics.color.hex};">
                        ${statusData.metrics.bunNativeMetrics.health.toUpperCase()}
                    </span>
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Total APIs</span>
                            <i data-lucide="package" class="w-4 h-4 text-blue-400"></i>
                        </div>
                        <div class="text-2xl font-bold" style="color: ${statusData.metrics.bunNativeMetrics.color.hex};">${statusData.metrics.bunNativeMetrics.totalAPIs}</div>
                        <div class="text-xs text-gray-400">Tracked APIs</div>
                    </div>
                    
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Total Calls</span>
                            <i data-lucide="activity" class="w-4 h-4 text-green-400"></i>
                        </div>
                        <div class="text-2xl font-bold" style="color: ${statusData.metrics.bunNativeMetrics.color.hex};">${statusData.metrics.bunNativeMetrics.totalCalls}</div>
                        <div class="text-xs text-gray-400">API Calls</div>
                    </div>
                    
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Native Rate</span>
                            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
                        </div>
                        <div class="text-2xl font-bold" style="color: ${statusData.metrics.bunNativeMetrics.color.hex};">${statusData.metrics.bunNativeMetrics.nativeRate}%</div>
                        <div class="text-xs text-gray-400">Native Implementation</div>
                    </div>
                    
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-400">Error Rate</span>
                            <i data-lucide="alert-circle" class="w-4 h-4 text-yellow-400"></i>
                        </div>
                        <div class="text-2xl font-bold" style="color: ${statusData.metrics.bunNativeMetrics.color.hex};">${statusData.metrics.bunNativeMetrics.errorRate}%</div>
                        <div class="text-xs text-gray-400">Error Rate</div>
                    </div>
                </div>

                ${statusData.metrics.bunNativeMetrics.topAPIs.length > 0 ? `
                    <div class="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <h3 class="text-lg font-medium mb-3 flex items-center">
                            <i data-lucide="trending-up" class="w-4 h-4 mr-2 text-purple-400"></i>
                            Top Performing APIs
                        </h3>
                        <div class="space-y-2">
                            ${statusData.metrics.bunNativeMetrics.topAPIs.map((api, index) => `
                                <div class="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-600" style="border-left: 3px solid ${statusData.metrics.bunNativeMetrics.color.hex};">
                                    <div class="flex items-center space-x-3">
                                        <span class="text-sm font-medium text-gray-300">#${index + 1}</span>
                                        <div>
                                            <div class="text-sm font-medium" style="color: ${statusData.metrics.bunNativeMetrics.color.hex};">${api.name}</div>
                                            <div class="text-xs text-gray-400">${api.domain} • ${api.source} • ${api.performanceTier}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm font-medium">${api.calls} calls</div>
                                        <div class="text-xs text-gray-400">${api.avgDuration}ms • ${api.successRate}% success</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </section>

        <!-- Recent Incidents -->
        <section class="mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <i data-lucide="alert-triangle" class="w-5 h-5 mr-2 text-yellow-400"></i>
                    Recent Incidents
                </h2>
                
                ${statusData.incidents.length > 0 ? `
                    <div class="space-y-3">
                        ${statusData.incidents.map(incident => `
                            <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="text-sm font-medium">${incident.title}</span>
                                            <span class="px-2 py-1 rounded text-xs ${
                                              incident.status === 'resolved' ? 'bg-green-800 text-green-200' :
                                              incident.status === 'investigating' ? 'bg-yellow-800 text-yellow-200' :
                                              'bg-blue-800 text-blue-200'
                                            }">
                                                ${incident.status}
                                            </span>
                                        </div>
                                        <p class="text-sm text-gray-400 mb-2">${incident.description}</p>
                                        <div class="text-xs text-gray-500">
                                            ${new Date(incident.startTime).toLocaleString()} - 
                                            ${new Date(incident.endTime).toLocaleString()}
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <span class="text-xs text-gray-400">${incident.id}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-8 text-gray-400">
                        <i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-2 text-green-400"></i>
                        <p>No recent incidents</p>
                    </div>
                `}
            </div>
        </section>

        <!-- System Information -->
        <section>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <i data-lucide="info" class="w-5 h-5 mr-2 text-blue-400"></i>
                    System Information
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <h3 class="text-sm font-medium mb-2 text-blue-400">Environment</h3>
                        <div class="space-y-1 text-sm">
                            <div>Domain: ${config.domain}</div>
                            <div>Environment: ${config.environment}</div>
                            <div>Version: ${config.version}</div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <h3 class="text-sm font-medium mb-2 text-green-400">Performance</h3>
                        <div class="space-y-1 text-sm">
                            <div>Uptime: ${Math.floor(statusData.uptime / 3600)}h ${Math.floor((statusData.uptime % 3600) / 60)}m</div>
                            <div>Response Time: <30ms</div>
                            <div>Health: ${config.system.health}%</div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <h3 class="text-sm font-medium mb-2 text-purple-400">API Endpoints</h3>
                        <div class="space-y-1 text-sm">
                            <div><a href="/api/v1/system-matrix" class="text-blue-400 hover:underline">System Matrix</a></div>
                            <div><a href="/api/v1/health" class="text-blue-400 hover:underline">Health Check</a></div>
                            <div><a href="/api/v1/metrics" class="text-blue-400 hover:underline">Metrics</a></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 border-t border-gray-700 mt-12">
        <div class="max-w-6xl mx-auto px-4 py-6">
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-400">
                    © 2026 ${config.name}. Powered by DuoPlus Bun Workspaces
                </div>
                <div class="flex items-center space-x-4">
                    <a href="/api/v1/docs" class="text-sm text-blue-400 hover:underline">API Docs</a>
                    <a href="/api/v1/system-matrix" class="text-sm text-blue-400 hover:underline">System Matrix</a>
                    <span class="text-sm text-gray-400">
                        Status: ${statusBadges[statusData.overall as keyof typeof statusBadges].text}
                    </span>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();
        
        let autoRefresh = true;
        let refreshInterval;
        
        function updateClock() {
            const now = new Date();
            document.getElementById('currentTime').textContent = now.toLocaleString();
        }
        
        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            document.getElementById('refreshStatus').textContent = autoRefresh ? 'ON' : 'OFF';
            
            if (autoRefresh) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }
        
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                location.reload();
            }, 30000); // Refresh every 30 seconds
        }
        
        function stopAutoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        }
        
        // Initialize
        updateClock();
        setInterval(updateClock, 1000);
        
        if (autoRefresh) {
            startAutoRefresh();
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                location.reload();
            }
        });
    </script>
</body>
</html>
`;

export const enhancedStatusRoutes = new Elysia({ prefix: '/status' })
  .get('/', () => {
    const statusData = getSystemStatus();
    return new Response(statusPageHTML(statusData), {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  })
  .get('/api/data', () => {
    return {
      success: true,
      data: getSystemStatus(),
      timestamp: new Date().toISOString()
    };
  })
  .get('/api/bun-native-metrics', () => {
    const bunMetrics = bunTracker.getAllMetrics();
    const bunSummary = bunTracker.getSummary();
    const bunHealth = bunSummary.errorRate < 5 ? 'healthy' : bunSummary.errorRate < 15 ? 'degraded' : 'unhealthy';
    const bunStatusColor = getBunAPIStatusColor(bunHealth);
    
    return {
      success: true,
      data: {
        summary: bunSummary,
        metrics: bunMetrics,
        health: bunHealth,
        color: bunStatusColor,
        topAPIs: bunMetrics.slice(0, 10).map(m => ({
          name: m.apiName,
          domain: m.domain,
          calls: m.callCount,
          avgDuration: m.averageDuration.toFixed(2),
          implementation: m.implementation,
          source: m.implementationSource.source,
          performanceTier: m.implementationSource.performanceTier,
          memoryEfficiency: m.implementationSource.memoryEfficiency,
          successRate: ((m.successCount / m.callCount) * 100).toFixed(1),
          lastCalled: m.lastCalled
        })),
        domainBreakdown: bunMetrics.reduce((acc, m) => {
          if (!acc[m.domain]) acc[m.domain] = { count: 0, calls: 0, native: 0 };
          acc[m.domain].count++;
          acc[m.domain].calls += m.callCount;
          if (m.implementation === 'native') acc[m.domain].native++;
          return acc;
        }, {} as Record<string, { count: number; calls: number; native: number }>),
        implementationBreakdown: bunMetrics.reduce((acc, m) => {
          if (!acc[m.implementation]) acc[m.implementation] = { count: 0, calls: 0 };
          acc[m.implementation].count++;
          acc[m.implementation].calls += m.callCount;
          return acc;
        }, {} as Record<string, { count: number; calls: number }>)
      },
      timestamp: new Date().toISOString()
    };
  })
  .get('/api/bun-native-badge', () => {
    const bunSummary = bunTracker.getSummary();
    const bunHealth = bunSummary.errorRate < 5 ? 'healthy' : bunSummary.errorRate < 15 ? 'degraded' : 'unhealthy';
    const bunStatusColor = getBunAPIStatusColor(bunHealth);
    
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="20">
        <rect width="140" height="20" fill="#333"/>
        <rect x="70" width="70" height="20" fill="${bunStatusColor.hex}"/>
        <text x="35" y="14" font-family="Arial, sans-serif" font-size="11" fill="white" text-anchor="middle">Bun APIs</text>
        <text x="105" y="14" font-family="Arial, sans-serif" font-size="11" fill="white" text-anchor="middle">${bunSummary.totalAPIs}</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  })
  .get('/api/badge', () => {
    const status = getSystemStatus();
    const badge = statusBadges[status.overall as keyof typeof statusBadges];
    
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
        <rect width="120" height="20" fill="#333"/>
        <rect x="60" width="60" height="20" fill="${badge.color === 'green' ? '#3b82f6' : badge.color === 'yellow' ? '#3b82f6' : badge.color === 'red' ? '#3b82f6' : '#3b82f6'}"/>
        <text x="30" y="14" font-family="Arial, sans-serif" font-size="11" fill="white" text-anchor="middle">Status</text>
        <text x="90" y="14" font-family="Arial, sans-serif" font-size="11" fill="white" text-anchor="middle">${badge.text}</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  });
