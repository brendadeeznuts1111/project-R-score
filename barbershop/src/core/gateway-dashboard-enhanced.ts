#!/usr/bin/env bun
/**
 * Enhanced Gateway Dashboard - Advanced Monitoring & Management
 * Provides comprehensive web interface with real-time analytics, alerts, and advanced features
 */

import { serve } from 'bun';
import { randomUUIDv7 } from 'bun';
import type { OpenClawStatus, MatrixProfile } from '../../openclaw/gateway';
import { BunLock } from './bunlock';
import { c } from '../../lib/bun-context';
import { 
  AlertType, 
  LockAction
} from './enums';

const PORT = parseInt(Bun.env.GATEWAY_DASHBOARD_PORT || '8767');
const HOST = Bun.env.GATEWAY_DASHBOARD_HOST || '0.0.0.0';

// Initialize components
const lockManager = new BunLock();

// Enhanced data structures
interface SystemMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

interface LockHistory {
  id: string;
  action: LockAction;
  resource: string;
  owner: string;
  timestamp: number;
  ttl?: number;
}

// State management
const alerts: Alert[] = [];
const lockHistory: LockHistory[] = [];
let requestCount = 0;
let errorCount = 0;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Enhanced HTML Template
const getEnhancedDashboardHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Gateway & Lock Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse-green { 0%, 100% { background-color: rgb(34 197 94); } 50% { background-color: rgb(74 222 128); } }
        @keyframes pulse-red { 0%, 100% { background-color: rgb(239 68 68); } 50% { background-color: rgb(248 113 113); } }
        @keyframes pulse-yellow { 0%, 100% { background-color: rgb(245 158 11); } 50% { background-color: rgb(251 191 36); } }
        .status-online { animation: pulse-green 2s infinite; }
        .status-offline { animation: pulse-red 2s infinite; }
        .status-warning { animation: pulse-yellow 2s infinite; }
        .chart-container { position: relative; height: 200px; }
        .alert-enter { animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
    <div id="app"></div>
    <script>
        const API_BASE = window.location.origin;
        let refreshInterval;
        let metricsChart;
        let alertsChart;

        // Initialize app
        document.addEventListener('DOMContentLoaded', () => {
            renderApp();
            initializeRouter();
            startAutoRefresh();
            initializeCharts();
        });

        function initializeRouter() {
            // Handle initial URL fragment
            const hash = window.location.hash.slice(1) || 'locks';
            switchTab(hash, false); // Don't update history on initial load
            
            // Handle browser back/forward
            window.addEventListener('popstate', (event) => {
                const tab = event.state?.tab || window.location.hash.slice(1) || 'locks';
                switchTab(tab, false);
            });
            
            // Handle hash changes
            window.addEventListener('hashchange', () => {
                const tab = window.location.hash.slice(1) || 'locks';
                switchTab(tab, false);
            });
        }

        function renderApp() {
            document.getElementById('app').innerHTML = \`
                <header class="bg-gray-800 border-b border-gray-700">
                    <div class="container mx-auto px-4 py-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <i data-lucide="shield" class="w-8 h-8 text-blue-400"></i>
                                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                    Enhanced Gateway & Lock Dashboard
                                </h1>
                                <span class="px-2 py-1 bg-blue-600 text-xs rounded-full">v2.0</span>
                            </div>
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center space-x-2">
                                    <div id="systemStatus" class="w-3 h-3 rounded-full status-online"></div>
                                    <span class="text-sm">System Healthy</span>
                                </div>
                                <button onclick="toggleAutoRefresh()" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                                    <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>
                                    Auto Refresh: <span id="refreshStatus">ON</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Alerts Section -->
                <div id="alertsContainer" class="bg-yellow-900/20 border-b border-yellow-700/50 hidden">
                    <div class="container mx-auto px-4 py-2">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="alert-triangle" class="w-4 h-4 text-yellow-400"></i>
                                <span class="text-sm text-yellow-400" id="alertsSummary">No active alerts</span>
                            </div>
                            <button onclick="toggleAlerts()" class="text-yellow-400 hover:text-yellow-300 text-sm">
                                View Alerts
                            </button>
                        </div>
                    </div>
                </div>

                <main class="container mx-auto px-4 py-6">
                    <!-- Enhanced Stats Overview -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Gateway Status</p>
                                    <p id="gatewayStatus" class="text-2xl font-bold text-green-400">Online</p>
                                    <p class="text-xs text-gray-500">Latency: <span id="latencyMs">0ms</span></p>
                                </div>
                                <i data-lucide="server" class="w-8 h-8 text-green-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Active Locks</p>
                                    <p id="activeLocks" class="text-2xl font-bold text-yellow-400">0</p>
                                    <p class="text-xs text-gray-500">Total: <span id="totalLocks">0</span></p>
                                </div>
                                <i data-lucide="lock" class="w-8 h-8 text-yellow-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">System Load</p>
                                    <p id="systemLoad" class="text-2xl font-bold text-blue-400">0%</p>
                                    <p class="text-xs text-gray-500">Memory: <span id="memoryUsage">0MB</span></p>
                                </div>
                                <i data-lucide="cpu" class="w-8 h-8 text-blue-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Requests/sec</p>
                                    <p id="requestsPerSec" class="text-2xl font-bold text-purple-400">0</p>
                                    <p class="text-xs text-gray-500">Errors: <span id="errorRate">0%</span></p>
                                </div>
                                <i data-lucide="activity" class="w-8 h-8 text-purple-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <h3 class="text-lg font-semibold mb-4 flex items-center">
                                <i data-lucide="trending-up" class="w-5 h-5 mr-2 text-blue-400"></i>
                                System Metrics
                            </h3>
                            <div class="chart-container">
                                <canvas id="metricsChart"></canvas>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <h3 class="text-lg font-semibold mb-4 flex items-center">
                                <i data-lucide="bar-chart-2" class="w-5 h-5 mr-2 text-purple-400"></i>
                                Lock Activity
                            </h3>
                            <div class="chart-container">
                                <canvas id="lockActivityChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Enhanced Tabs -->
                    <div class="bg-gray-800 rounded-lg border border-gray-700">
                        <div class="border-b border-gray-700">
                            <nav class="flex space-x-1 p-1 overflow-x-auto">
                                <button onclick="switchTab('locks')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 text-white whitespace-nowrap" data-tab="locks">
                                    <i data-lucide="lock" class="w-4 h-4 inline mr-2"></i>Lock Manager
                                </button>
                                <button onclick="switchTab('gateway')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700 whitespace-nowrap" data-tab="gateway">
                                    <i data-lucide="gateway" class="w-4 h-4 inline mr-2"></i>Gateway Status
                                </button>
                                <button onclick="switchTab('profiles')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700 whitespace-nowrap" data-tab="profiles">
                                    <i data-lucide="users" class="w-4 h-4 inline mr-2"></i>Matrix Profiles
                                </button>
                                <button onclick="switchTab('history')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700 whitespace-nowrap" data-tab="history">
                                    <i data-lucide="history" class="w-4 h-4 inline mr-2"></i>History
                                </button>
                                <button onclick="switchTab('alerts')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700 whitespace-nowrap" data-tab="alerts">
                                    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-2"></i>Alerts
                                </button>
                                <button onclick="switchTab('settings')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700 whitespace-nowrap" data-tab="settings">
                                    <i data-lucide="settings" class="w-4 h-4 inline mr-2"></i>Settings
                                </button>
                            </nav>
                        </div>

                        <div class="p-6">
                            <!-- Lock Manager Tab -->
                            <div id="locks-tab" class="tab-content">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">Advanced Lock Manager</h3>
                                    <div class="flex space-x-2">
                                        <button onclick="showCreateLockModal()" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition">
                                            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Create Lock
                                        </button>
                                        <button onclick="showBatchOperationModal()" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition">
                                            <i data-lucide="layers" class="w-4 h-4 inline mr-1"></i>Batch Ops
                                        </button>
                                        <button onclick="refreshLocks()" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                                            <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>Refresh
                                        </button>
                                    </div>
                                </div>
                                <div class="mb-4 flex space-x-4">
                                    <input type="text" id="lockSearch" placeholder="Search locks..." class="px-3 py-2 bg-gray-700 rounded-lg text-sm flex-1" onkeyup="filterLocks()">
                                    <select id="lockFilter" class="px-3 py-2 bg-gray-700 rounded-lg text-sm" onchange="filterLocks()">
                                        <option value="all">All Resources</option>
                                        <option value="critical">Critical</option>
                                        <option value="normal">Normal</option>
                                    </select>
                                </div>
                                <div id="locksList" class="space-y-2"></div>
                            </div>

                            <!-- Gateway Status Tab -->
                            <div id="gateway-tab" class="tab-content hidden">
                                <div id="gatewayInfo" class="space-y-4"></div>
                            </div>

                            <!-- Matrix Profiles Tab -->
                            <div id="profiles-tab" class="tab-content hidden">
                                <div id="profilesList" class="space-y-2"></div>
                            </div>

                            <!-- History Tab -->
                            <div id="history-tab" class="tab-content hidden">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">Lock History</h3>
                                    <button onclick="clearHistory()" class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition">
                                        <i data-lucide="trash-2" class="w-4 h-4 inline mr-1"></i>Clear History
                                    </button>
                                </div>
                                <div id="historyList" class="space-y-2 max-h-96 overflow-y-auto"></div>
                            </div>

                            <!-- Alerts Tab -->
                            <div id="alerts-tab" class="tab-content hidden">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">System Alerts</h3>
                                    <button onclick="clearAlerts()" class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition">
                                        <i data-lucide="trash-2" class="w-4 h-4 inline mr-1"></i>Clear Alerts
                                    </button>
                                </div>
                                <div id="alertsList" class="space-y-2 max-h-96 overflow-y-auto"></div>
                            </div>

                            <!-- Settings Tab -->
                            <div id="settings-tab" class="tab-content hidden">
                                <div class="space-y-6">
                                    <div>
                                        <h4 class="font-semibold mb-3">Dashboard Settings</h4>
                                        <div class="space-y-3">
                                            <label class="flex items-center justify-between">
                                                <span>Auto Refresh Interval</span>
                                                <select id="refreshInterval" class="px-3 py-1 bg-gray-700 rounded text-sm">
                                                    <option value="1000">1 second</option>
                                                    <option value="5000" selected>5 seconds</option>
                                                    <option value="10000">10 seconds</option>
                                                    <option value="30000">30 seconds</option>
                                                </select>
                                            </label>
                                            <label class="flex items-center justify-between">
                                                <span>Enable Sound Alerts</span>
                                                <input type="checkbox" id="soundAlerts" class="rounded">
                                            </label>
                                            <label class="flex items-center justify-between">
                                                <span>Show Debug Info</span>
                                                <input type="checkbox" id="debugInfo" class="rounded">
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-semibold mb-3">Lock Settings</h4>
                                        <div class="space-y-3">
                                            <label class="flex items-center justify-between">
                                                <span>Default TTL (seconds)</span>
                                                <input type="number" id="defaultTtl" value="30" class="px-3 py-1 bg-gray-700 rounded text-sm w-20">
                                            </label>
                                            <label class="flex items-center justify-between">
                                                <span>Max Concurrent Locks</span>
                                                <input type="number" id="maxLocks" value="100" class="px-3 py-1 bg-gray-700 rounded text-sm w-20">
                                            </label>
                                        </div>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button onclick="saveSettings()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition">
                                            <i data-lucide="save" class="w-4 h-4 inline mr-1"></i>Save Settings
                                        </button>
                                        <button onclick="resetSettings()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                                            <i data-lucide="rotate-ccw" class="w-4 h-4 inline mr-1"></i>Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            \`;
            
            lucide.createIcons();
            loadInitialData();
        }

        function initializeCharts() {
            // Metrics Chart
            const metricsCtx = document.getElementById('metricsChart').getContext('2d');
            metricsChart = new Chart(metricsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU Usage %',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: 'rgb(168, 85, 247)',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    scales: {
                        x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
                    }
                }
            });

            // Lock Activity Chart
            const lockCtx = document.getElementById('lockActivityChart').getContext('2d');
            alertsChart = new Chart(lockCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Lock Operations',
                        data: [],
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderColor: 'rgb(245, 158, 11)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    scales: {
                        x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
                    }
                }
            });
        }

        // Enhanced data loading functions
        async function loadInitialData() {
            await Promise.all([
                refreshLocks(),
                refreshGatewayStatus(),
                refreshProfiles(),
                refreshMetrics(),
                refreshHistory(),
                refreshAlerts()
            ]);
        }

        async function refreshMetrics() {
            try {
                const response = await fetch(\`\${API_BASE}/api/metrics\`);
                const data = await response.json();
                updateMetricsDisplay(data);
                updateCharts(data);
            } catch (error) {
                console.error('Failed to refresh metrics:', error);
            }
        }

        async function refreshHistory() {
            try {
                const response = await fetch(\`\${API_BASE}/api/history\`);
                const history = await response.json();
                renderHistory(history);
            } catch (error) {
                console.error('Failed to refresh history:', error);
            }
        }

        async function refreshAlerts() {
            try {
                const response = await fetch(\`\${API_BASE}/api/alerts\`);
                const alerts = await response.json();
                renderAlerts(alerts);
                updateAlertsBanner(alerts);
            } catch (error) {
                console.error('Failed to refresh alerts:', error);
            }
        }

        function updateMetricsDisplay(data) {
            document.getElementById('latencyMs').textContent = \`\${data.latencyMs || 0}ms\`;
            document.getElementById('systemLoad').textContent = \`\${Math.round(data.cpuUsage || 0)}%\`;
            document.getElementById('memoryUsage').textContent = \`\${Math.round((data.memoryUsage || 0) / 1024 / 1024)}MB\`;
            document.getElementById('requestsPerSec').textContent = Math.round(data.requestsPerSecond || 0);
            document.getElementById('errorRate').textContent = \`\${Math.round((data.errorRate || 0) * 100)}%\`;
            
            // Update system status indicator
            const statusEl = document.getElementById('systemStatus');
            if (data.cpuUsage > 80 || data.memoryUsage > 80 * 1024 * 1024) {
                statusEl.className = 'w-3 h-3 rounded-full status-warning';
            } else if (data.errorRate > 0.1) {
                statusEl.className = 'w-3 h-3 rounded-full status-offline';
            } else {
                statusEl.className = 'w-3 h-3 rounded-full status-online';
            }
        }

        function updateCharts(data) {
            if (!metricsChart) return;
            
            const now = new Date().toLocaleTimeString();
            
            // Update metrics chart
            if (metricsChart.data.labels.length > 20) {
                metricsChart.data.labels.shift();
                metricsChart.data.datasets[0].data.shift();
                metricsChart.data.datasets[1].data.shift();
            }
            
            metricsChart.data.labels.push(now);
            metricsChart.data.datasets[0].data.push(data.cpuUsage || 0);
            metricsChart.data.datasets[1].data.push((data.memoryUsage || 0) / 1024 / 1024);
            metricsChart.update('none');
        }

        function renderHistory(history) {
            const container = document.getElementById('historyList');
            
            if (history.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-8 text-gray-400">
                        <i data-lucide="history" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                        <p>No lock history available</p>
                    </div>
                \`;
                lucide.createIcons();
                return;
            }
            
            container.innerHTML = history.map(item => \`
                <div class="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full bg-\${item.action === 'acquired' ? 'green' : item.action === 'released' ? 'blue' : 'yellow'}-600 flex items-center justify-center">
                            <i data-lucide="\${item.action === 'acquired' ? 'lock' : item.action === 'released' ? 'unlock' : 'clock'}" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <p class="font-medium">\${item.action.toUpperCase()}: \${item.resource}</p>
                            <p class="text-sm text-gray-400">Owner: \${item.owner} • \${new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    \${item.ttl ? \`<span class="text-xs text-gray-400">TTL: \${item.ttl}s</span>\` : ''}
                </div>
            \`).join('');
            
            lucide.createIcons();
        }

        function renderAlerts(alerts) {
            const container = document.getElementById('alertsList');
            
            if (alerts.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-8 text-gray-400">
                        <i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                        <p>No active alerts</p>
                    </div>
                \`;
                lucide.createIcons();
                return;
            }
            
            container.innerHTML = alerts.map(alert => \`
                <div class="bg-\${alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}-900/20 border border-\${alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}-700/50 rounded-lg p-4 alert-enter">
                    <div class="flex items-start justify-between">
                        <div class="flex items-start space-x-3">
                            <i data-lucide="\${alert.type === 'error' ? 'alert-circle' : alert.type === 'warning' ? 'alert-triangle' : 'info'}" class="w-5 h-5 text-\${alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}-400 mt-0.5"></i>
                            <div>
                                <p class="font-medium">\${alert.message}</p>
                                <p class="text-sm text-gray-400">\${new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            \${!alert.acknowledged ? \`<button onclick="acknowledgeAlert('\${alert.id}')" class="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition">Acknowledge</button>\` : ''}
                            <button onclick="dismissAlert('\${alert.id}')" class="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs transition">Dismiss</button>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            lucide.createIcons();
        }

        function updateAlertsBanner(alerts) {
            const container = document.getElementById('alertsContainer');
            const summary = document.getElementById('alertsSummary');
            
            const activeAlerts = alerts.filter(a => !a.acknowledged);
            const errorAlerts = activeAlerts.filter(a => a.type === 'error');
            const warningAlerts = activeAlerts.filter(a => a.type === 'warning');
            
            if (activeAlerts.length === 0) {
                container.classList.add('hidden');
                return;
            }
            
            container.classList.remove('hidden');
            summary.textContent = \`\${errorAlerts.length} Errors, \${warningAlerts.length} Warnings, \${activeAlerts.length - errorAlerts.length - warningAlerts.length} Info\`;
        }

        // Enhanced lock management functions
        function filterLocks() {
            const searchTerm = document.getElementById('lockSearch').value.toLowerCase();
            const filterType = document.getElementById('lockFilter').value;
            
            // Implementation would filter the locks list
            console.log('Filtering locks:', searchTerm, filterType);
        }

        function showBatchOperationModal() {
            const operation = prompt('Batch operation:', 'release-all');
            if (operation) {
                executeBatchOperation(operation);
            }
        }

        async function executeBatchOperation(operation) {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks/batch\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation })
                });
                
                if (response.ok) {
                    refreshLocks();
                    refreshHistory();
                }
            } catch (error) {
                console.error('Batch operation failed:', error);
            }
        }

        function clearHistory() {
            if (!confirm('Are you sure you want to clear all history?')) return;
            
            fetch(\`\${API_BASE}/api/history\`, { method: 'DELETE' })
                .then(() => refreshHistory())
                .catch(console.error);
        }

        function clearAlerts() {
            if (!confirm('Are you sure you want to clear all alerts?')) return;
            
            fetch(\`\${API_BASE}/api/alerts\`, { method: 'DELETE' })
                .then(() => refreshAlerts())
                .catch(console.error);
        }

        async function acknowledgeAlert(alertId) {
            try {
                await fetch(\`\${API_BASE}/api/alerts/\${alertId}/acknowledge\`, { method: 'POST' });
                refreshAlerts();
            } catch (error) {
                console.error('Failed to acknowledge alert:', error);
            }
        }

        async function dismissAlert(alertId) {
            try {
                await fetch(\`\${API_BASE}/api/alerts/\${alertId}\`, { method: 'DELETE' });
                refreshAlerts();
            } catch (error) {
                console.error('Failed to dismiss alert:', error);
            }
        }

        function saveSettings() {
            const settings = {
                refreshInterval: document.getElementById('refreshInterval').value,
                soundAlerts: document.getElementById('soundAlerts').checked,
                debugInfo: document.getElementById('debugInfo').checked,
                defaultTtl: document.getElementById('defaultTtl').value,
                maxLocks: document.getElementById('maxLocks').value
            };
            
            localStorage.setItem('dashboardSettings', JSON.stringify(settings));
            
            // Show success notification
            showNotification('Settings saved successfully!', 'success');
        }

        function loadSettings() {
            const savedSettings = localStorage.getItem('dashboardSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                document.getElementById('refreshInterval').value = settings.refreshInterval || '5000';
                document.getElementById('soundAlerts').checked = settings.soundAlerts || false;
                document.getElementById('debugInfo').checked = settings.debugInfo || false;
                document.getElementById('defaultTtl').value = settings.defaultTtl || '30';
                document.getElementById('maxLocks').value = settings.maxLocks || '100';
            }
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 alert-enter \${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}\`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        function resetSettings() {
            if (!confirm('Reset all settings to defaults?')) return;
            
            localStorage.removeItem('dashboardSettings');
            document.getElementById('refreshInterval').value = '5000';
            document.getElementById('soundAlerts').checked = false;
            document.getElementById('debugInfo').checked = false;
            document.getElementById('defaultTtl').value = '30';
            document.getElementById('maxLocks').value = '100';
        }

        function toggleAlerts() {
            switchTab('alerts');
        }

        // Auto refresh with configurable interval
        function startAutoRefresh() {
            const savedSettings = localStorage.getItem('dashboardSettings');
            const settings = savedSettings ? JSON.parse(savedSettings) : { refreshInterval: '5000' };
            
            refreshInterval = setInterval(() => {
                refreshMetrics();
                refreshAlerts();
            }, parseInt(settings.refreshInterval));
        }

        function toggleAutoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
                document.getElementById('refreshStatus').textContent = 'OFF';
            } else {
                startAutoRefresh();
                document.getElementById('refreshStatus').textContent = 'ON';
            }
        }

        // Tab switching (existing implementation)
        function switchTab(tabName, updateHistory = true) {
            // Update URL fragment and browser history
            if (updateHistory) {
                const newUrl = \`\${window.location.pathname}\#\${tabName}\`;
                window.history.pushState({ tab: tabName }, '', newUrl);
            }
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            
            // Update button states
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
            });
            
            // Show selected tab
            const selectedTab = document.getElementById(\`\${tabName}-tab\`);
            if (selectedTab) {
                selectedTab.classList.remove('hidden');
            } else {
                console.warn(\`Tab '\${tabName}' not found, defaulting to locks\`);
                switchTab('locks', updateHistory);
                return;
            }
            
            // Update active button
            const activeBtn = document.querySelector(\`[data-tab="\${tabName}"]\`);
            if (activeBtn) {
                activeBtn.classList.add('bg-blue-600', 'text-white');
                activeBtn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
            }
            
            // Load tab-specific data
            switch (tabName) {
                case 'locks':
                    refreshLocks();
                    break;
                case 'gateway':
                    refreshGatewayStatus();
                    break;
                case 'profiles':
                    refreshProfiles();
                    break;
                case 'history':
                    refreshHistory();
                    break;
                case 'alerts':
                    refreshAlerts();
                    break;
                case 'settings':
                    // Load saved settings
                    loadSettings();
                    break;
                default:
                    console.warn(\`Unknown tab: \${tabName}\`);
            }
        }

        // Existing functions (refreshLocks, refreshGatewayStatus, etc.) remain the same
        async function refreshLocks() {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks\`);
                const locks = await response.json();
                renderLocks(locks);
                document.getElementById('activeLocks').textContent = locks.length;
                document.getElementById('totalLocks').textContent = locks.length;
            } catch (error) {
                console.error('Failed to refresh locks:', error);
            }
        }

        async function refreshGatewayStatus() {
            try {
                const response = await fetch(\`\${API_BASE}/api/gateway/status\`);
                const status = await response.json();
                renderGatewayStatus(status);
                document.getElementById('gatewayStatus').textContent = status.online ? 'Online' : 'Offline';
            } catch (error) {
                console.error('Failed to refresh gateway status:', error);
            }
        }

        async function refreshProfiles() {
            try {
                const response = await fetch(\`\${API_BASE}/api/profiles\`);
                const profiles = await response.json();
                renderProfiles(profiles);
            } catch (error) {
                console.error('Failed to refresh profiles:', error);
            }
        }

        function renderLocks(locks) {
            const container = document.getElementById('locksList');
            
            if (locks.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-8 text-gray-400">
                        <i data-lucide="lock-open" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                        <p>No active locks</p>
                    </div>
                \`;
                lucide.createIcons();
                return;
            }
            
            container.innerHTML = locks.map(lock => \`
                <div class="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="lock" class="w-5 h-5 text-yellow-400"></i>
                            <div>
                                <p class="font-semibold">\${lock.resource}</p>
                                <p class="text-sm text-gray-400">Owner: \${lock.owner} • TTL: \${Math.round(lock.remainingTtl / 1000)}s</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="extendLock('\${lock.id}')" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition">
                            Extend
                        </button>
                        <button onclick="releaseLock('\${lock.id}')" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition">
                            Release
                        </button>
                    </div>
                </div>
            \`).join('');
            
            lucide.createIcons();
        }

        function renderGatewayStatus(status) {
            const container = document.getElementById('gatewayInfo');
            
            container.innerHTML = \`
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h4 class="font-semibold mb-3">Connection Info</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Status:</span>
                                <span class="\${status.online ? 'text-green-400' : 'text-red-400'}">\${status.online ? 'Online' : 'Offline'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Version:</span>
                                <span>\${status.version || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Gateway URL:</span>
                                <span class="text-blue-400">\${status.gatewayUrl || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h4 class="font-semibold mb-3">Profile Info</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Active Profiles:</span>
                                <span>\${status.profilesActive || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Context Hash:</span>
                                <span class="font-mono text-xs">\${status.contextHash || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        function renderProfiles(profiles) {
            const container = document.getElementById('profilesList');
            
            if (profiles.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-8 text-gray-400">
                        <i data-lucide="users" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                        <p>No matrix profiles found</p>
                    </div>
                \`;
                lucide.createIcons();
                return;
            }
            
            container.innerHTML = profiles.map(profile => \`
                <div class="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <i data-lucide="user" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <p class="font-semibold">\${profile.name}</p>
                            <p class="text-sm text-gray-400">ID: \${profile.id} • \${profile.bound ? 'Bound' : 'Unbound'}</p>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition">
                            View
                        </button>
                    </div>
                </div>
            \`).join('');
            
            lucide.createIcons();
        }

        // Lock operations (existing implementations)
        async function createLock(resource, owner, ttl) {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource, owner, ttl: ttl * 1000 })
                });
                
                if (response.ok) {
                    refreshLocks();
                    refreshHistory();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to create lock:', error);
                return false;
            }
        }

        async function releaseLock(lockId) {
            if (!confirm('Are you sure you want to release this lock?')) return;
            
            try {
                const response = await fetch(\`\${API_BASE}/api/locks/\${lockId}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    refreshLocks();
                    refreshHistory();
                }
            } catch (error) {
                console.error('Failed to release lock:', error);
            }
        }

        async function extendLock(lockId) {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks/\${lockId}/extend\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ additionalTtl: 30000 })
                });
                
                if (response.ok) {
                    refreshLocks();
                }
            } catch (error) {
                console.error('Failed to extend lock:', error);
            }
        }

        function showCreateLockModal() {
            const resource = prompt('Enter resource name:', 'test-resource');
            const owner = prompt('Enter owner name:', 'dashboard-user');
            const ttl = prompt('Enter TTL in seconds:', '30');
            
            if (resource && owner && ttl) {
                createLock(resource, owner, parseInt(ttl));
            }
        }
    </script>
</body>
</html>`;

// Enhanced API Routes with additional endpoints
const server = serve({
  port: PORT,
  hostname: HOST,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // Track requests
    requestCount++;
    
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Serve enhanced dashboard
      if (url.pathname === '/') {
        return new Response(getEnhancedDashboardHTML(), {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }
      
      // Enhanced metrics endpoint
      if (url.pathname === '/api/metrics' && req.method === 'GET') {
        const metrics: SystemMetrics = {
          timestamp: Date.now(),
          cpuUsage: Math.random() * 100, // Simulated
          memoryUsage: Math.random() * 100 * 1024 * 1024, // Simulated in bytes
          activeConnections: Math.floor(Math.random() * 50) + 10,
          requestsPerSecond: requestCount / ((Date.now() - startTime) / 1000),
          errorRate: errorCount / Math.max(requestCount, 1)
        };
        
        return Response.json(metrics, { headers: corsHeaders });
      }
      
      // History endpoint
      if (url.pathname === '/api/history' && req.method === 'GET') {
        return Response.json(lockHistory.slice(-50), { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/history' && req.method === 'DELETE') {
        lockHistory.length = 0;
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Alerts endpoint
      if (url.pathname === '/api/alerts' && req.method === 'GET') {
        return Response.json(alerts, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/alerts' && req.method === 'DELETE') {
        alerts.length = 0;
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/alerts/') && req.method === 'POST' && url.pathname.endsWith('/acknowledge')) {
        const alertId = url.pathname.split('/')[3];
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
        }
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/alerts/') && req.method === 'DELETE') {
        const alertId = url.pathname.split('/')[3];
        const index = alerts.findIndex(a => a.id === alertId);
        if (index !== -1) {
          alerts.splice(index, 1);
        }
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Batch operations endpoint
      if (url.pathname === '/api/locks/batch' && req.method === 'POST') {
        const { operation } = await req.json() as { operation: string };
        
        if (operation === 'release-all') {
          const locks = lockManager.listActiveLocks();
          for (const lock of locks) {
            await lockManager.release(lock.id);
            addToHistory(LockAction.RELEASED, lock.resource, lock.owner);
          }
          return Response.json({ success: true, released: locks.length }, { headers: corsHeaders });
        }
        
        return Response.json({ success: false, error: 'Unknown operation' }, { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      
      // Existing lock endpoints with enhanced tracking
      if (url.pathname === '/api/locks' && req.method === 'GET') {
        const locks = lockManager.listActiveLocks();
        return Response.json(locks, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/locks' && req.method === 'POST') {
        const { resource, owner, ttl } = await req.json() as { resource: string; owner: string; ttl: number };
        const lockId = await lockManager.acquire(resource, owner, ttl);
        
        if (lockId) {
          addToHistory(LockAction.ACQUIRED, resource, owner, ttl);
        } else {
          addAlert(AlertType.WARNING, `Failed to acquire lock on resource: ${resource}`);
        }
        
        return Response.json({ lockId }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/locks/') && req.method === 'DELETE') {
        const lockId = url.pathname.split('/')[3];
        const success = await lockManager.release(lockId);
        
        if (success) {
          // Find the lock details for history
          const locks = lockManager.listActiveLocks();
          const lock = locks.find(l => l.id === lockId);
          if (lock) {
            addToHistory(LockAction.RELEASED, lock.resource, lock.owner);
          }
        }
        
        return Response.json({ success }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/locks/') && req.method === 'PUT' && url.pathname.endsWith('/extend')) {
        const lockId = url.pathname.split('/')[3];
        const { additionalTtl } = await req.json() as { additionalTtl: number };
        const success = await lockManager.extend(lockId, additionalTtl);
        
        if (success) {
          const locks = lockManager.listActiveLocks();
          const lock = locks.find(l => l.id === lockId);
          if (lock) {
            addToHistory(LockAction.EXTENDED, lock.resource, lock.owner, additionalTtl);
          }
        }
        
        return Response.json({ success }, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/locks/stats' && req.method === 'GET') {
        const stats = lockManager.getStats();
        return Response.json(stats, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/locks/cleanup' && req.method === 'POST') {
        // Cleanup is handled automatically, just return success
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Gateway API endpoints (mock for now)
      if (url.pathname === '/api/gateway/status' && req.method === 'GET') {
        const status: OpenClawStatus = {
          online: true,
          version: 'v3.16',
          gatewayUrl: `http://localhost:${PORT - 1}`,
          latencyMs: Math.floor(Math.random() * 50) + 10,
          profilesActive: 3,
          contextHash: randomUUIDv7().substring(0, 8)
        };
        return Response.json(status, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/gateway/ping' && req.method === 'GET') {
        return Response.json({ pong: true, timestamp: Date.now() }, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/profiles' && req.method === 'GET') {
        const profiles: MatrixProfile[] = [
          {
            id: 'profile-1',
            name: 'Development Profile',
            path: '/Users/dev/.bun-profile',
            bound: true,
            lastUsed: new Date().toISOString(),
            context: { env: 'development' }
          },
          {
            id: 'profile-2', 
            name: 'Production Profile',
            path: '/Users/prod/.bun-profile',
            bound: false,
            lastUsed: new Date(Date.now() - 3600000).toISOString(),
            context: { env: 'production' }
          }
        ];
        return Response.json(profiles, { headers: corsHeaders });
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      errorCount++;
      console.error('Dashboard error:', error);
      addAlert(AlertType.ERROR, `Internal server error: ${error}`);
      return Response.json({ error: 'Internal server error' }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
});

// Helper functions for enhanced features
const startTime = Date.now();

function addToHistory(action: LockAction, resource: string, owner: string, ttl?: number) {
  lockHistory.push({
    id: randomUUIDv7(),
    action,
    resource,
    owner,
    timestamp: Date.now(),
    ttl
  });
  
  // Keep only last 100 entries
  if (lockHistory.length > 100) {
    lockHistory.splice(0, lockHistory.length - 100);
  }
}

function addAlert(type: AlertType, message: string) {
            alerts.push({
                id: randomUUIDv7(),
                type,
                message,
                timestamp: Date.now(),
                acknowledged: false
            });
            
            // Keep only last 50 alerts
            if (alerts.length > 50) {
                alerts.splice(0, alerts.length - 50);
            }
        }

// Generate some initial data for demonstration
setInterval(() => {
  // Simulate random alerts
  if (Math.random() < 0.05) { // 5% chance every interval
    const types: AlertType[] = [AlertType.INFO, AlertType.WARNING, AlertType.ERROR];
    const messages = [
      'High CPU usage detected',
      'Memory usage above threshold',
      'Lock timeout warning',
      'Gateway latency increased',
      'New profile connected'
    ];
    
    addAlert(
      types[Math.floor(Math.random() * types.length)],
      messages[Math.floor(Math.random() * messages.length)]
    );
  }
}, 10000); // Check every 10 seconds

console.log(c.cyan(`🎯 Enhanced Gateway Dashboard Server`));
console.log(c.gray(`   Dashboard: http://${HOST}:${PORT}`));
console.log(c.gray(`   API Base:  http://${HOST}:${PORT}/api`));
console.log(c.gray(`   Features:  Real-time metrics, alerts, history, batch operations`));
console.log('');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(c.yellow('\n🛑 Shutting down Enhanced Gateway Dashboard...'));
  lockManager.close();
  server.stop();
  process.exit(0);
});
