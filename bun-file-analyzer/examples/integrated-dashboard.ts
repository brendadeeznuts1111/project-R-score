#!/usr/bin/env bun

/**
 * Integrated Monitoring Dashboard
 * Combines real-time monitoring with bundle bucket visualization
 */

import { Bun } from "bun";
import { join } from "path";

interface DashboardConfig {
  port: number;
  refreshInterval: number;
  enableWebSocket: boolean;
  showBucketViewer: boolean;
  showMetrics: boolean;
  showBuildHistory: boolean;
  theme: 'light' | 'dark' | 'auto';
}

class IntegratedDashboard {
  private config: DashboardConfig;
  private buildHistory: any[] = [];
  private metrics: any = {};
  private bucketData: any[] = [];

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      port: 3005,
      refreshInterval: 5000,
      enableWebSocket: true,
      showBucketViewer: true,
      showMetrics: true,
      showBuildHistory: true,
      theme: 'auto',
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing Integrated Dashboard...");
    
    // Load initial data
    await this.loadMetrics();
    await this.loadBucketData();
    await this.loadBuildHistory();
    
    console.log("✅ Dashboard initialized successfully");
  }

  private async loadMetrics(): Promise<void> {
    try {
      // Simulate metrics loading
      this.metrics = {
        timestamp: Date.now(),
        bundle: {
          size: 86016,
          sizeFormatted: "84 KB",
          chunks: 3,
          dependencies: 12,
          assets: 5,
          buildSystem: "Vite",
          lastBuild: Date.now() - 60000
        },
        performance: {
          avgResponseTime: 45,
          requestsPerMinute: 1247,
          errorRate: 0.02,
          uptime: "2h 34m",
          bundleSizeChange: -2.3
        },
        alerts: [
          {
            level: 'info',
            message: 'Bundle size optimized',
            value: '84 KB'
          }
        ],
        buildStatus: 'ready',
        realTimeData: true
      };
    } catch (error) {
      console.error("❌ Failed to load metrics:", error);
    }
  }

  private async loadBucketData(): Promise<void> {
    try {
      // Simulate bucket data loading
      const totalSize = 86016;
      
      this.bucketData = [
        {
          name: "main.js",
          size: 45056,
          sizeFormatted: "44 KB",
          percentage: (45056 / totalSize) * 100,
          color: "#3b82f6",
          type: "chunk",
          metadata: {
            path: "./dist/main.js",
            optimized: true,
            compressed: false
          }
        },
        {
          name: "vendor.js",
          size: 32768,
          sizeFormatted: "32 KB",
          percentage: (32768 / totalSize) * 100,
          color: "#22c55e",
          type: "chunk",
          metadata: {
            path: "./dist/vendor.js",
            optimized: true,
            compressed: false
          }
        },
        {
          name: "react",
          size: 16384,
          sizeFormatted: "16 KB",
          percentage: (16384 / totalSize) * 100,
          color: "#f59e0b",
          type: "dependency",
          metadata: {
            path: "node_modules/react",
            version: "18.2.0",
            optimized: false
          }
        },
        {
          name: "react-dom",
          size: 12288,
          sizeFormatted: "12 KB",
          percentage: (12288 / totalSize) * 100,
          color: "#ef4444",
          type: "dependency",
          metadata: {
            path: "node_modules/react-dom",
            version: "18.2.0",
            optimized: false
          }
        },
        {
          name: "styles.css",
          size: 8192,
          sizeFormatted: "8 KB",
          percentage: (8192 / totalSize) * 100,
          color: "#8b5cf6",
          type: "chunk",
          metadata: {
            path: "./dist/styles.css",
            optimized: true,
            compressed: false
          }
        }
      ];
    } catch (error) {
      console.error("❌ Failed to load bucket data:", error);
    }
  }

  private async loadBuildHistory(): Promise<void> {
    try {
      // Simulate build history loading
      this.buildHistory = [
        {
          timestamp: Date.now() - 3600000,
          buildTime: Date.now() - 3600000,
          totalSize: 90112,
          chunks: 4,
          dependencies: 13,
          status: 'success'
        },
        {
          timestamp: Date.now() - 1800000,
          buildTime: Date.now() - 1800000,
          totalSize: 87040,
          chunks: 3,
          dependencies: 12,
          status: 'success'
        },
        {
          timestamp: Date.now() - 60000,
          buildTime: Date.now() - 60000,
          totalSize: 86016,
          chunks: 3,
          dependencies: 12,
          status: 'success'
        }
      ];
    } catch (error) {
      console.error("❌ Failed to load build history:", error);
    }
  }

  private generateHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integrated Monitoring Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .metric-card {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
            backdrop-filter: blur(10px);
            transition: transform 0.2s ease;
        }
        .metric-card:hover {
            transform: translateY(-2px);
        }
        .bucket-tile {
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .bucket-tile:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
            z-index: 10;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .slide-in {
            animation: slideIn 0.5s ease;
        }
        @keyframes slideIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-sm">📊</span>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-800">Integrated Dashboard</h1>
                    <span class="pulse text-green-500 text-sm">● Live</span>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="refreshData()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        🔄 Refresh
                    </button>
                    <button onclick="toggleTheme()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        🌙 Theme
                    </button>
                    <span class="text-sm text-gray-500" id="lastUpdate">Last update: Never</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="bg-white border-b border-gray-200">
        <div class="container mx-auto px-4">
            <div class="flex space-x-8">
                <button onclick="switchTab('overview')" class="tab-btn py-4 px-2 border-b-2 border-blue-500 text-blue-600 font-medium" data-tab="overview">
                    📊 Overview
                </button>
                <button onclick="switchTab('buckets')" class="tab-btn py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700" data-tab="buckets">
                    🪣 Buckets
                </button>
                <button onclick="switchTab('metrics')" class="tab-btn py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700" data-tab="metrics">
                    📈 Metrics
                </button>
                <button onclick="switchTab('history')" class="tab-btn py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700" data-tab="history">
                    📚 History
                </button>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Metric Cards -->
                <div class="metric-card bg-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-500 text-sm">Bundle Size</span>
                        <span class="text-green-500 text-xs">▼ 2.3%</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-800" id="bundleSize">84 KB</div>
                    <div class="text-xs text-gray-500 mt-1">3 chunks, 12 deps</div>
                </div>

                <div class="metric-card bg-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-500 text-sm">Build Time</span>
                        <span class="text-blue-500 text-xs">● Ready</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-800" id="buildTime">1.2s</div>
                    <div class="text-xs text-gray-500 mt-1">Last build: 1m ago</div>
                </div>

                <div class="metric-card bg-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-500 text-sm">Performance</span>
                        <span class="text-green-500 text-xs">● Good</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-800" id="performance">45ms</div>
                    <div class="text-xs text-gray-500 mt-1">Avg response time</div>
                </div>

                <div class="metric-card bg-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-500 text-sm">Alerts</span>
                        <span class="text-blue-500 text-xs">1 active</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-800" id="alerts">1</div>
                    <div class="text-xs text-gray-500 mt-1">Bundle optimized</div>
                </div>
            </div>

            <!-- Quick Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Bundle Composition</h3>
                    <canvas id="overviewChart" height="200"></canvas>
                </div>

                <div class="bg-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Build Trend</h3>
                    <canvas id="trendChart" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- Buckets Tab -->
        <div id="buckets" class="tab-content">
            <div class="bg-white rounded-xl p-6 shadow-lg mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-semibold text-gray-800">Bundle Bucket Visualization</h3>
                    <div class="flex gap-2">
                        <button onclick="changeBucketView('treemap')" class="view-btn px-3 py-1 bg-blue-500 text-white rounded text-sm">Treemap</button>
                        <button onclick="changeBucketView('pie')" class="view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">Pie</button>
                        <button onclick="changeBucketView('bars')" class="view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">Bars</button>
                    </div>
                </div>
                <div class="relative" style="height: 400px;">
                    <canvas id="bucketChart"></canvas>
                </div>
            </div>

            <div class="bg-white rounded-xl p-6 shadow-lg">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Bucket Details</h3>
                <div id="bucketDetails" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Bucket cards will be populated here -->
                </div>
            </div>
        </div>

        <!-- Metrics Tab -->
        <div id="metrics" class="tab-content">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Average Response Time</span>
                            <span class="font-semibold">45ms</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Requests per Minute</span>
                            <span class="font-semibold">1,247</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Error Rate</span>
                            <span class="font-semibold text-green-600">0.02%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Uptime</span>
                            <span class="font-semibold">2h 34m</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Bundle Metrics</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Total Size</span>
                            <span class="font-semibold">84 KB</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Chunks</span>
                            <span class="font-semibold">3</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Dependencies</span>
                            <span class="font-semibold">12</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Assets</span>
                            <span class="font-semibold">5</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl p-6 shadow-lg mt-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Active Alerts</h3>
                <div id="alertsList" class="space-y-3">
                    <!-- Alerts will be populated here -->
                </div>
            </div>
        </div>

        <!-- History Tab -->
        <div id="history" class="tab-content">
            <div class="bg-white rounded-xl p-6 shadow-lg">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Build History</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependencies</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody id="historyTable" class="bg-white divide-y divide-gray-200">
                            <!-- History rows will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>

    <script>
        // Global state
        let currentTab = 'overview';
        let currentBucketView = 'treemap';
        let charts = {};
        
        // Data will be loaded from API
        let dashboardData = {
            metrics: ${JSON.stringify(this.metrics, null, 2)},
            bucketData: ${JSON.stringify(this.bucketData, null, 2)},
            buildHistory: ${JSON.stringify(this.buildHistory, null, 2)}
        };

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            initializeDashboard();
            startAutoRefresh();
        });

        function initializeDashboard() {
            updateOverview();
            updateBuckets();
            updateMetrics();
            updateHistory();
            updateLastUpdateTime();
        }

        function switchTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === tabName) {
                    btn.className = 'tab-btn py-4 px-2 border-b-2 border-blue-500 text-blue-600 font-medium';
                } else {
                    btn.className = 'tab-btn py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700';
                }
            });
            
            currentTab = tabName;
            
            // Initialize tab-specific content
            if (tabName === 'overview') {
                renderOverviewCharts();
            } else if (tabName === 'buckets') {
                renderBucketChart();
            }
        }

        function updateOverview() {
            document.getElementById('bundleSize').textContent = dashboardData.metrics.bundle.sizeFormatted;
            document.getElementById('buildTime').textContent = '1.2s';
            document.getElementById('performance').textContent = dashboardData.metrics.performance.avgResponseTime + 'ms';
            document.getElementById('alerts').textContent = dashboardData.metrics.alerts.length;
        }

        function renderOverviewCharts() {
            // Bundle composition chart
            const ctx1 = document.getElementById('overviewChart').getContext('2d');
            if (charts.overview) charts.overview.destroy();
            
            charts.overview = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: dashboardData.bucketData.map(item => item.name),
                    datasets: [{
                        data: dashboardData.bucketData.map(item => item.size),
                        backgroundColor: dashboardData.bucketData.map(item => item.color),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            // Build trend chart
            const ctx2 = document.getElementById('trendChart').getContext('2d');
            if (charts.trend) charts.trend.destroy();
            
            charts.trend = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: dashboardData.buildHistory.map((_, index) => \`Build \${index + 1}\`),
                    datasets: [{
                        label: 'Bundle Size (KB)',
                        data: dashboardData.buildHistory.map(item => item.totalSize / 1024),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }

        function updateBuckets() {
            const container = document.getElementById('bucketDetails');
            
            container.innerHTML = dashboardData.bucketData.map(bucket => \`
                <div class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="showBucketDetails('\${bucket.name}')">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-gray-800">\${bucket.name}</h4>
                        <div class="w-3 h-3 rounded-full" style="background-color: \${bucket.color}"></div>
                    </div>
                    <div class="text-sm text-gray-600">
                        <div>Size: \${bucket.sizeFormatted}</div>
                        <div>Percentage: \${bucket.percentage.toFixed(1)}%</div>
                        <div>Type: \${bucket.type}</div>
                        \${bucket.metadata?.optimized ? '<div class="text-green-600">✓ Optimized</div>' : ''}
                    </div>
                </div>
            \`).join('');
        }

        function renderBucketChart() {
            const ctx = document.getElementById('bucketChart').getContext('2d');
            if (charts.buckets) charts.buckets.destroy();
            
            const chartData = {
                labels: dashboardData.bucketData.map(item => item.name),
                datasets: [{
                    data: dashboardData.bucketData.map(item => item.size),
                    backgroundColor: dashboardData.bucketData.map(item => item.color),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            };

            switch (currentBucketView) {
                case 'pie':
                    charts.buckets = new Chart(ctx, {
                        type: 'pie',
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    });
                    break;
                case 'bars':
                    charts.buckets = new Chart(ctx, {
                        type: 'bar',
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                    break;
                case 'treemap':
                default:
                    renderTreemap();
                    return;
            }
        }

        function renderTreemap() {
            const container = document.getElementById('bucketChart').parentElement;
            const width = container.offsetWidth;
            const height = 400;
            
            let html = '<div class="treemap-container" style="position: relative; height: ' + height + 'px;">';
            
            let x = 0, y = 0;
            const totalSize = dashboardData.bucketData.reduce((sum, item) => sum + item.size, 0);
            
            dashboardData.bucketData.forEach((bucket, index) => {
                const bucketWidth = (bucket.size / totalSize) * width;
                const bucketHeight = height;
                
                html += \`
                    <div class="bucket-tile absolute border border-gray-200 rounded flex flex-col justify-center items-center text-white font-semibold"
                         style="left: \${x}px; top: \${y}px; width: \${bucketWidth}px; height: \${bucketHeight}px; background-color: \${bucket.color};"
                         onclick="showBucketDetails('\${bucket.name}')"
                         title="\${bucket.name}: \${bucket.sizeFormatted} (\${bucket.percentage.toFixed(1)}%)">
                        <div class="text-center px-2">
                            <div class="text-sm">\${bucket.name}</div>
                            <div class="text-xs opacity-90">\${bucket.sizeFormatted}</div>
                            <div class="text-xs opacity-80">\${bucket.percentage.toFixed(1)}%</div>
                        </div>
                    </div>
                \`;
                
                x += bucketWidth;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }

        function changeBucketView(view) {
            currentBucketView = view;
            
            // Update button styles
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.className = 'view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm';
            });
            event.target.className = 'view-btn px-3 py-1 bg-blue-500 text-white rounded text-sm';
            
            renderBucketChart();
        }

        function updateMetrics() {
            const alertsList = document.getElementById('alertsList');
            
            alertsList.innerHTML = dashboardData.metrics.alerts.map(alert => \`
                <div class="flex items-center justify-between p-3 bg-\${alert.level === 'error' ? 'red' : alert.level === 'warning' ? 'yellow' : 'blue'}-50 border border-\${alert.level === 'error' ? 'red' : alert.level === 'warning' ? 'yellow' : 'blue'}-200 rounded-lg">
                    <div>
                        <div class="font-medium text-gray-800">\${alert.message}</div>
                        <div class="text-sm text-gray-600">\${alert.value}</div>
                    </div>
                    <span class="text-\${alert.level === 'error' ? 'red' : alert.level === 'warning' ? 'yellow' : 'blue'}-600">
                        \${alert.level.toUpperCase()}
                    </span>
                </div>
            \`).join('');
        }

        function updateHistory() {
            const tbody = document.getElementById('historyTable');
            
            tbody.innerHTML = dashboardData.buildHistory.map(build => \`
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        \${new Date(build.timestamp).toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        \${formatBytes(build.totalSize)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        \${build.chunks}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        \${build.dependencies}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            \${build.status}
                        </span>
                    </td>
                </tr>
            \`).join('');
        }

        function showBucketDetails(name) {
            const bucket = dashboardData.bucketData.find(item => item.name === name);
            if (bucket) {
                alert(\`Bucket Details:\\n\\nName: \${bucket.name}\\nSize: \${bucket.sizeFormatted}\\nPercentage: \${bucket.percentage.toFixed(1)}%\\nType: \${bucket.type}\\n\${bucket.metadata?.path ? 'Path: ' + bucket.metadata.path + '\\\\n' : ''}\${bucket.metadata?.optimized ? 'Status: Optimized\\\\n' : ''}\${bucket.metadata?.version ? 'Version: ' + bucket.metadata.version : ''}\`);
            }
        }

        function refreshData() {
            fetch('/data')
                .then(response => response.json())
                .then(data => {
                    dashboardData = data;
                    initializeDashboard();
                    updateLastUpdateTime();
                })
                .catch(error => {
                    console.error('Failed to refresh data:', error);
                });
        }

        function startAutoRefresh() {
            setInterval(refreshData, ${this.config.refreshInterval});
        }

        function updateLastUpdateTime() {
            document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
        }

        function toggleTheme() {
            // Simple theme toggle implementation
            document.body.classList.toggle('dark');
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
        }
    </script>
</body>
</html>`;
  }

  async start(): Promise<void> {
    await this.initialize();
    
    const server = Bun.serve({
      port: this.config.port,
      fetch(req) {
        const url = new URL(req.url);
        
        if (url.pathname === "/") {
          return new Response(this.generateHTML(), {
            headers: { "Content-Type": "text/html" }
          });
        }
        
        if (url.pathname === "/data") {
          return Response.json({
            metrics: this.metrics,
            bucketData: this.bucketData,
            buildHistory: this.buildHistory,
            timestamp: Date.now(),
            config: this.config
          });
        }
        
        if (url.pathname === "/health") {
          return Response.json({
            status: "healthy",
            timestamp: Date.now(),
            version: "1.0.0",
            dashboard: "integrated"
          });
        }
        
        return new Response("Not Found", { status: 404 });
      }.bind(this)
    });

    console.log("🚀 Integrated Dashboard started successfully!");
    console.log(`📊 Dashboard: http://localhost:${this.config.port}`);
    console.log(`📊 API: http://localhost:${this.config.port}/data`);
    console.log(`💚 Health: http://localhost:${this.config.port}/health`);
    console.log("");
    console.log("🎯 Features:");
    console.log("  • Real-time monitoring with bucket visualization");
    console.log("  • Interactive charts and metrics");
    console.log("  • Build history tracking");
    console.log("  • Tabbed interface for different views");
    console.log("  • Auto-refresh every 5 seconds");
    console.log("");
    console.log("Press Ctrl+C to stop the server");
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3005');
  
  if (args.includes('--help')) {
    console.log(`
🚀 Integrated Monitoring Dashboard

Usage:
  integrated-dashboard.ts [options]

Options:
  --port=PORT        Port to serve on (default: 3005)
  --help             Show this help

Examples:
  bun run integrated-dashboard.ts
  bun run integrated-dashboard.ts --port=3006
    `);
    return;
  }

  const dashboard = new IntegratedDashboard({ port });
  await dashboard.start();
}

if (import.meta.main) {
  main().catch(console.error);
}

export { IntegratedDashboard, type DashboardConfig };
