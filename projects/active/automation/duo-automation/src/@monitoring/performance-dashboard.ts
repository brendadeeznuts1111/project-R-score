/**
 * Empire Pro Performance Monitoring Dashboard
 * Real-time performance metrics and optimization tracking
 */

import { serve } from 'bun';
import { empireLog } from '../../utils/bun-console-colors';
import { MetricsCollector } from '../utils/metrics';
import { MemoryManager } from '../utils/memory-manager';

interface PerformanceMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  requests: {
    total: number;
    perSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  bunOptimizations: {
    spawnSyncUsage: number;
    crc32Operations: number;
    bufferIndexOps: number;
    jsonParseOps: number;
  };
}

export class PerformanceDashboard {
  private port: number;
  private metrics: MetricsCollector;
  private memoryManager: MemoryManager;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;

  constructor(port: number = 3001) {
    this.port = port;
    this.metrics = MetricsCollector.getInstance();
    this.memoryManager = MemoryManager.getInstance();
    this.startMonitoring();
  }

  /**
   * Start the performance monitoring server
   */
  async start(): Promise<void> {
    empireLog.info(`🚀 Starting Performance Dashboard on port ${this.port}`);

    const server = serve({
      port: this.port,
      fetch: (req) => this.handleRequest(req),
      error(error) {
        empireLog.error('Dashboard server error', error);
      }
    });

    empireLog.success(`✅ Performance Dashboard running at http://localhost:${this.port}`);
    
    // Start metrics collection
    this.collectMetrics();
    
    return new Promise(() => {}); // Keep server running
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    try {
      switch (url.pathname) {
        case '/':
          return this.serveDashboard();
        case '/api/metrics':
          return this.serveMetrics();
        case '/api/metrics/history':
          return this.serveMetricsHistory();
        case '/api/health':
          return this.serveHealth();
        case '/api/optimizations':
          return this.serveOptimizationStatus();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      empireLog.error('Dashboard request error', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * Serve the main dashboard HTML
   */
  private serveDashboard(): Response {
    const html = this.generateDashboardHTML();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  /**
   * Serve current metrics as JSON
   */
  private serveMetrics(): Response {
    const currentMetrics = this.getCurrentMetrics();
    return new Response(JSON.stringify(currentMetrics, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Serve metrics history as JSON
   */
  private serveMetricsHistory(): Response {
    return new Response(JSON.stringify(this.metricsHistory, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Serve health status
   */
  private serveHealth(): Response {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      bunVersion: Bun.version,
      optimizations: this.getOptimizationStatus()
    };

    return new Response(JSON.stringify(health, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Serve optimization status
   */
  private serveOptimizationStatus(): Response {
    const optimizations = this.getOptimizationStatus();
    return new Response(JSON.stringify(optimizations, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Generate dashboard HTML
   */
  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Empire Pro Performance Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse { animation: pulse 2s infinite; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <header class="mb-8">
            <h1 class="text-4xl font-bold text-center mb-2">
                🚀 Empire Pro Performance Dashboard
            </h1>
            <p class="text-center text-gray-400">
                Real-time monitoring of Bun v1.3.6 optimizations
            </p>
        </header>

        <!-- Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-sm font-medium text-gray-400 mb-2">System Status</h3>
                <p class="text-2xl font-bold text-green-400" id="system-status">Healthy</p>
                <p class="text-sm text-gray-500" id="uptime">Uptime: 0s</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Memory Usage</h3>
                <p class="text-2xl font-bold text-yellow-400" id="memory-usage">0 MB</p>
                <p class="text-sm text-gray-500" id="memory-percent">0%</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Request Rate</h3>
                <p class="text-2xl font-bold text-blue-400" id="request-rate">0/s</p>
                <p class="text-sm text-gray-500" id="total-requests">0 total</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Bun Optimizations</h3>
                <p class="text-2xl font-bold text-purple-400" id="optimization-count">0</p>
                <p class="text-sm text-gray-500">Active optimizations</p>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Memory Usage Chart -->
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Memory Usage Over Time</h3>
                <canvas id="memory-chart" width="400" height="200"></canvas>
            </div>

            <!-- Request Rate Chart -->
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Request Rate Over Time</h3>
                <canvas id="request-chart" width="400" height="200"></canvas>
            </div>
        </div>

        <!-- Bun Optimizations Section -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h3 class="text-lg font-semibold mb-4">🚀 Bun v1.3.6 Optimizations</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="optimizations-grid">
                <!-- Optimizations will be populated here -->
            </div>
        </div>

        <!-- Metrics Table -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Detailed Metrics</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-700">
                            <th class="text-left py-2">Metric</th>
                            <th class="text-left py-2">Current</th>
                            <th class="text-left py-2">Average</th>
                            <th class="text-left py-2">Peak</th>
                        </tr>
                    </thead>
                    <tbody id="metrics-table">
                        <!-- Metrics will be populated here -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Chart instances
        let memoryChart, requestChart;
        
        // Initialize dashboard
        async function initDashboard() {
            await initCharts();
            await loadOptimizations();
            
            // Start real-time updates
            setInterval(updateMetrics, 2000);
            setInterval(updateCharts, 5000);
        }

        // Initialize charts
        async function initCharts() {
            const memoryCtx = document.getElementById('memory-chart').getContext('2d');
            const requestCtx = document.getElementById('request-chart').getContext('2d');

            memoryChart = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Heap Used (MB)',
                        data: [],
                        borderColor: 'rgb(250, 204, 21)',
                        backgroundColor: 'rgba(250, 204, 21, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });

            requestChart = new Chart(requestCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Requests/sec',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Load optimizations
        async function loadOptimizations() {
            try {
                const response = await fetch('/api/optimizations');
                const optimizations = await response.json();
                
                const grid = document.getElementById('optimizations-grid');
                grid.innerHTML = '';
                
                Object.entries(optimizations).forEach(([key, value]) => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-700 rounded p-4 border border-gray-600';
                    card.innerHTML = \`
                        <h4 class="font-medium text-green-400 mb-2">\${key}</h4>
                        <p class="text-sm text-gray-300">\${value.description}</p>
                        <p class="text-xs text-gray-500 mt-1">Performance: \${value.performance}</p>
                    \`;
                    grid.appendChild(card);
                });
            } catch (error) {
                console.error('Failed to load optimizations:', error);
            }
        }

        // Update metrics
        async function updateMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const metrics = await response.json();
                
                // Update status cards
                document.getElementById('system-status').textContent = 'Healthy';
                document.getElementById('uptime').textContent = \`Uptime: \${formatUptime(metrics.uptime)}\`;
                document.getElementById('memory-usage').textContent = \`\${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB\`;
                document.getElementById('memory-percent').textContent = \`\${Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)}%\`;
                document.getElementById('request-rate').textContent = \`\${metrics.requests.perSecond}/s\`;
                document.getElementById('total-requests').textContent = \`\${metrics.requests.total} total\`;
                
                // Update optimization count
                const optimizationCount = Object.keys(metrics.bunOptimizations).filter(key => 
                    metrics.bunOptimizations[key as keyof typeof metrics.bunOptimizations] > 0
                ).length;
                document.getElementById('optimization-count').textContent = optimizationCount;
                
                // Update metrics table
                updateMetricsTable(metrics);
                
            } catch (error) {
                console.error('Failed to update metrics:', error);
                document.getElementById('system-status').textContent = 'Error';
                document.getElementById('system-status').className = 'text-2xl font-bold text-red-400';
            }
        }

        // Update charts
        async function updateCharts() {
            try {
                const response = await fetch('/api/metrics/history');
                const history = await response.json();
                
                if (history.length === 0) return;
                
                const labels = history.map((_, index) => new Date(Date.now() - (history.length - index) * 5000).toLocaleTimeString());
                
                // Update memory chart
                memoryChart.data.labels = labels;
                memoryChart.data.datasets[0].data = history.map(m => m.memory.heapUsed / 1024 / 1024);
                memoryChart.update('none');
                
                // Update request chart
                requestChart.data.labels = labels;
                requestChart.data.datasets[0].data = history.map(m => m.requests.perSecond);
                requestChart.update('none');
                
            } catch (error) {
                console.error('Failed to update charts:', error);
            }
        }

        // Update metrics table
        function updateMetricsTable(metrics) {
            const table = document.getElementById('metrics-table');
            table.innerHTML = \`
                <tr class="border-b border-gray-700">
                    <td class="py-2">Memory (Heap)</td>
                    <td class="py-2">\${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
                <tr class="border-b border-gray-700">
                    <td class="py-2">Memory (RSS)</td>
                    <td class="py-2">\${Math.round(metrics.memory.rss / 1024 / 1024)} MB</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
                <tr class="border-b border-gray-700">
                    <td class="py-2">Response Time</td>
                    <td class="py-2">\${metrics.requests.averageResponseTime}ms</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
                <tr class="border-b border-gray-700">
                    <td class="py-2">Error Rate</td>
                    <td class="py-2">\${(metrics.requests.errorRate * 100).toFixed(2)}%</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
                <tr class="border-b border-gray-700">
                    <td class="py-2">Bun.spawnSync</td>
                    <td class="py-2">\${metrics.bunOptimizations.spawnSyncUsage} calls</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
                <tr class="border-b border-gray-700">
                    <td class="py-2">CRC32 Operations</td>
                    <td class="py-2">\${metrics.bunOptimizations.crc32Operations} ops</td>
                    <td class="py-2">-</td>
                    <td class="py-2">-</td>
                </tr>
            \`;
        }

        // Format uptime
        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return \`\${hours}h \${minutes}m \${secs}s\`;
            } else if (minutes > 0) {
                return \`\${minutes}m \${secs}s\`;
            } else {
                return \`\${secs}s\`;
            }
        }

        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', initDashboard);
    </script>
</body>
</html>`;
  }

  /**
   * Start monitoring system metrics
   */
  private startMonitoring(): void {
    this.memoryManager.startMonitoring();
    empireLog.info('📊 Performance monitoring started');
  }

  /**
   * Collect current metrics
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage: import('os').loadavg()
      },
      requests: {
        total: this.metrics.getMetric('requests.total') || 0,
        perSecond: this.metrics.getMetric('requests.perSecond') || 0,
        averageResponseTime: this.metrics.getMetric('requests.avgResponseTime') || 0,
        errorRate: this.metrics.getMetric('requests.errorRate') || 0
      },
      bunOptimizations: {
        spawnSyncUsage: this.metrics.getMetric('bun.spawnSync') || 0,
        crc32Operations: this.metrics.getMetric('bun.crc32') || 0,
        bufferIndexOps: this.metrics.getMetric('bun.bufferIndex') || 0,
        jsonParseOps: this.metrics.getMetric('bun.jsonParse') || 0
      }
    };
  }

  /**
   * Get optimization status
   */
  private getOptimizationStatus(): Record<string, any> {
    return {
      'Response.json()': {
        enabled: true,
        performance: '3.5x faster',
        description: 'Automatic JSON parsing optimization'
      },
      'Buffer.indexOf()': {
        enabled: true,
        performance: '2x faster',
        description: 'SIMD-optimized pattern matching'
      },
      'Bun.hash.crc32': {
        enabled: true,
        performance: '20x faster',
        description: 'Native CRC32 hashing'
      },
      'Bun.spawnSync': {
        enabled: true,
        performance: '30x faster',
        description: 'Native process execution'
      },
      'Promise.race': {
        enabled: true,
        performance: '30% faster',
        description: 'Automatic promise optimization'
      },
      'Native Console Colors': {
        enabled: true,
        performance: 'Zero dependency',
        description: 'Native console styling'
      },
      'Native Spinner': {
        enabled: true,
        performance: 'Zero dependency',
        description: 'Native loading animations'
      },
      'Native ASCII Art': {
        enabled: true,
        performance: 'Zero dependency',
        description: 'Pre-computed branding'
      }
    };
  }

  /**
   * Periodically collect and store metrics
   */
  private collectMetrics(): void {
    setInterval(() => {
      const metrics = this.getCurrentMetrics();
      this.metricsHistory.push(metrics);
      
      // Keep history size manageable
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }
    }, 5000); // Collect every 5 seconds
  }
}

// Export for use in other modules
export default PerformanceDashboard;
