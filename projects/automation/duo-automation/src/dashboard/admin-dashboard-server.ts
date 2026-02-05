// src/dashboard/admin-dashboard-server.ts
/**
 * 🏭 Factory-Wager Admin Dashboard Server
 * 
 * Complete administrative interface for domain-level operations
 * with system management, monitoring, and control capabilities.
 */

import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';
import { statusAPI } from '../api/status-api.ts';
import { dnsManager } from '../api/dns-manager.ts';
import { readFileSync } from 'fs';

const app = new Elysia()
  .use(cors())
  .use(staticPlugin())
  .get('/', () => {
    return getAdminDashboardHTML();
  })
  .get('/admin', () => {
    return getAdminDashboardHTML();
  })
  .get('/dashboard', () => {
    return getAdminDashboardHTML();
  })
  .get('/api/system/status', () => {
    return {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      domains: statusAPI.getOverallHealth(),
      dns: {
        totalZones: dnsManager.getZoneCount(),
        totalRecords: dnsManager.getRecordCount('factory-wager.com')
      },
      timestamp: new Date().toISOString()
    };
  })
  .get('/api/domains', () => {
    const domains = statusAPI.getStatus() as Map<string, any>;
    return Array.from(domains.entries()).map(([domain, status]) => ({
      domain,
      status: status.status,
      uptime: status.uptime,
      responseTime: status.responseTime,
      lastCheck: status.lastCheck,
      ssl: status.sslStatus,
      performance: status.performance,
      endpoints: status.endpoints
    }));
  })
  .get('/api/dns/records', () => {
    const zone = dnsManager.getZone('factory-wager.com');
    if (!zone) {
      return { error: 'Zone not found' };
    }
    return {
      domain: zone.domain,
      records: zone.records,
      soa: zone.soa,
      ns: zone.ns,
      status: zone.status,
      lastUpdated: zone.lastUpdated
    };
  })
  .post('/api/dns/records', async ({ body }) => {
    try {
      const record = body as any;
      const added = dnsManager.addRecord('factory-wager.com', record);
      return { success: true, record: added };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
  .put('/api/dns/records/:id', async ({ params, body }) => {
    try {
      const updated = dnsManager.updateRecord('factory-wager.com', params.id, body);
      return { success: true, record: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
  .delete('/api/dns/records/:id', async ({ params }) => {
    try {
      const deleted = dnsManager.deleteRecord('factory-wager.com', params.id);
      return { success: true, deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
  .get('/api/dns/propagation', async () => {
    try {
      const propagation = await dnsManager.checkPropagation('factory-wager.com');
      return { success: true, propagation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
  .post('/api/domains/:domain/check', async ({ params }) => {
    try {
      await statusAPI.checkDomainHealth(params.domain);
      const status = statusAPI.getStatus(params.domain);
      return { success: true, status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
  .get('/api/metrics', () => {
    const health = statusAPI.getOverallHealth();
    const domains = statusAPI.getStatus() as Map<string, any>;
    
    return {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      domains: {
        total: health.totalDomains,
        healthy: health.healthyDomains,
        warning: health.warningDomains,
        critical: health.criticalDomains
      },
      performance: {
        avgResponseTime: Array.from(domains.values()).reduce((sum, d) => sum + d.responseTime, 0) / domains.size,
        avgUptime: Array.from(domains.values()).reduce((sum, d) => sum + d.uptime, 0) / domains.size
      },
      timestamp: new Date().toISOString()
    };
  })
  .get('/api/logs', () => {
    // Simulated log data
    return {
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Admin dashboard accessed',
          source: 'dashboard'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'DNS propagation check completed',
          source: 'dns-manager'
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'warning',
          message: 'SSL certificate expiring in 25 days',
          source: 'ssl-monitor'
        }
      ]
    };
  })
  .post('/api/system/restart', async () => {
    // Simulated system restart
    return { success: true, message: 'System restart initiated' };
  })
  .post('/api/ssl/renew', async () => {
    // Simulated SSL renewal
    return { success: true, message: 'SSL certificate renewal initiated' };
  })
  .listen(3000);

function getAdminDashboardHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏭 Factory-Wager Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse-green {
            0%, 100% { background-color: rgb(34 197 94); }
            50% { background-color: rgb(74 222 128); }
        }
        @keyframes pulse-red {
            0%, 100% { background-color: rgb(239 68 68); }
            50% { background-color: rgb(248 113 113); }
        }
        .status-healthy { animation: pulse-green 2s infinite; }
        .status-critical { animation: pulse-red 2s infinite; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <h1 class="text-2xl font-bold text-blue-400">🏭 Factory-Wager Admin</h1>
                    <span id="system-status" class="px-3 py-1 rounded-full text-sm font-medium bg-green-600">
                        Operational
                    </span>
                </div>
                <div class="flex items-center space-x-4">
                    <span id="current-time" class="text-sm text-gray-400"></span>
                    <button onclick="refreshData()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        🔄 Refresh
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- System Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">System Status</p>
                        <p id="system-health" class="text-2xl font-bold text-green-400">Healthy</p>
                    </div>
                    <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <span class="text-xl">✅</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Domains</p>
                        <p id="domain-count" class="text-2xl font-bold text-blue-400">5</p>
                    </div>
                    <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <span class="text-xl">🌐</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">DNS Records</p>
                        <p id="dns-count" class="text-2xl font-bold text-purple-400">18</p>
                    </div>
                    <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                        <span class="text-xl">📊</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Uptime</p>
                        <p id="uptime" class="text-2xl font-bold text-green-400">99.9%</p>
                    </div>
                    <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <span class="text-xl">⏱️</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="bg-gray-800 rounded-lg border border-gray-700 mb-8">
            <div class="flex border-b border-gray-700">
                <button onclick="showTab('domains')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-blue-500">
                    🌐 Domains
                </button>
                <button onclick="showTab('dns')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    📊 DNS Management
                </button>
                <button onclick="showTab('monitoring')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    📈 Monitoring
                </button>
                <button onclick="showTab('logs')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    📋 Logs
                </button>
                <button onclick="showTab('settings')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    ⚙️ Settings
                </button>
            </div>

            <!-- Tab Content -->
            <div class="p-6">
                <!-- Domains Tab -->
                <div id="domains-tab" class="tab-content">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">Domain Status</h2>
                        <button onclick="checkAllDomains()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                            🔄 Check All Domains
                        </button>
                    </div>
                    <div id="domains-list" class="space-y-4">
                        <!-- Domains will be loaded here -->
                    </div>
                </div>

                <!-- DNS Tab -->
                <div id="dns-tab" class="tab-content hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">DNS Records</h2>
                        <div class="space-x-2">
                            <button onclick="addDNSRecord()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                ➕ Add Record
                            </button>
                            <button onclick="checkPropagation()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                                📡 Check Propagation
                            </button>
                        </div>
                    </div>
                    <div id="dns-records" class="overflow-x-auto">
                        <!-- DNS records will be loaded here -->
                    </div>
                </div>

                <!-- Monitoring Tab -->
                <div id="monitoring-tab" class="tab-content hidden">
                    <h2 class="text-xl font-bold mb-6">System Monitoring</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-gray-700 rounded-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">Performance Metrics</h3>
                            <canvas id="performance-chart"></canvas>
                        </div>
                        <div class="bg-gray-700 rounded-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">Domain Health</h3>
                            <canvas id="health-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Logs Tab -->
                <div id="logs-tab" class="tab-content hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">System Logs</h2>
                        <button onclick="refreshLogs()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            🔄 Refresh Logs
                        </button>
                    </div>
                    <div id="logs-container" class="bg-gray-700 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                        <!-- Logs will be loaded here -->
                    </div>
                </div>

                <!-- Settings Tab -->
                <div id="settings-tab" class="tab-content hidden">
                    <h2 class="text-xl font-bold mb-6">System Settings</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-gray-700 rounded-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">System Actions</h3>
                            <div class="space-y-3">
                                <button onclick="restartSystem()" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                                    🔄 Restart System
                                </button>
                                <button onclick="renewSSL()" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                                    🔒 Renew SSL Certificate
                                </button>
                                <button onclick="exportConfig()" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    📤 Export Configuration
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-700 rounded-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">Monitoring Settings</h3>
                            <div class="space-y-4">
                                <label class="flex items-center justify-between">
                                    <span>Auto-refresh</span>
                                    <input type="checkbox" id="auto-refresh" checked class="w-4 h-4">
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>Alert notifications</span>
                                    <input type="checkbox" id="alerts" checked class="w-4 h-4">
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>Debug mode</span>
                                    <input type="checkbox" id="debug" class="w-4 h-4">
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let autoRefreshInterval;
        let performanceChart, healthChart;

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            updateTime();
            setInterval(updateTime, 1000);
            loadSystemStatus();
            loadDomains();
            loadDNSRecords();
            loadLogs();
            initCharts();
            
            // Auto-refresh
            if (document.getElementById('auto-refresh').checked) {
                startAutoRefresh();
            }
        });

        function updateTime() {
            document.getElementById('current-time').textContent = new Date().toLocaleString();
        }

        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            // Remove active state from all buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('border-blue-500');
                button.classList.add('border-transparent');
            });
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.remove('hidden');
            
            // Add active state to clicked button
            event.target.classList.remove('border-transparent');
            event.target.classList.add('border-blue-500');
        }

        async function loadSystemStatus() {
            try {
                const response = await fetch('/api/system/status');
                const data = await response.json();
                
                document.getElementById('system-health').textContent = data.domains.status.toUpperCase();
                document.getElementById('domain-count').textContent = data.domains.totalDomains;
                document.getElementById('dns-count').textContent = data.dns.totalRecords;
                document.getElementById('uptime').textContent = (data.domains.healthyDomains / data.domains.totalDomains * 100).toFixed(1) + '%';
                
                // Update status indicator
                const statusEl = document.getElementById('system-status');
                statusEl.textContent = data.domains.status.toUpperCase();
                statusEl.className = 'px-3 py-1 rounded-full text-sm font-medium ' + 
                    (data.domains.status === 'healthy' ? 'bg-green-600' : 
                     data.domains.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600');
            } catch (error) {
                console.error('Error loading system status:', error);
            }
        }

        async function loadDomains() {
            try {
                const response = await fetch('/api/domains');
                const domains = await response.json();
                
                const container = document.getElementById('domains-list');
                container.innerHTML = domains.map(domain => \`
                    <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="font-semibold text-lg">\${domain.domain}</h3>
                                <div class="flex items-center space-x-4 mt-2">
                                    <span class="px-2 py-1 rounded text-xs font-medium \${getStatusColor(domain.status)}">
                                        \${domain.status.toUpperCase()}
                                    </span>
                                    <span class="text-sm text-gray-400">Uptime: \${domain.uptime.toFixed(2)}%</span>
                                    <span class="text-sm text-gray-400">Response: \${domain.responseTime}ms</span>
                                </div>
                            </div>
                            <button onclick="checkDomain('\${domain.domain}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                                Check
                            </button>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Error loading domains:', error);
            }
        }

        async function loadDNSRecords() {
            try {
                const response = await fetch('/api/dns/records');
                const data = await response.json();
                
                const container = document.getElementById('dns-records');
                container.innerHTML = \`
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-600">
                                <th class="text-left py-2">Type</th>
                                <th class="text-left py-2">Name</th>
                                <th class="text-left py-2">Value</th>
                                <th class="text-left py-2">TTL</th>
                                <th class="text-left py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${data.records.map(record => \`
                                <tr class="border-b border-gray-600">
                                    <td class="py-2">\${record.type}</td>
                                    <td class="py-2">\${record.name}</td>
                                    <td class="py-2 font-mono text-xs">\${record.value}</td>
                                    <td class="py-2">\${record.ttl}</td>
                                    <td class="py-2">
                                        <button onclick="editDNSRecord('\${record.id}')" class="text-blue-400 hover:text-blue-300 mr-2">Edit</button>
                                        <button onclick="deleteDNSRecord('\${record.id}')" class="text-red-400 hover:text-red-300">Delete</button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \`;
            } catch (error) {
                console.error('Error loading DNS records:', error);
            }
        }

        async function loadLogs() {
            try {
                const response = await fetch('/api/logs');
                const data = await response.json();
                
                const container = document.getElementById('logs-container');
                container.innerHTML = data.logs.map(log => \`
                    <div class="mb-2">
                        <span class="text-gray-400">\${log.timestamp}</span>
                        <span class="mx-2 px-2 py-1 rounded text-xs \${getLogLevelColor(log.level)}">
                            \${log.level.toUpperCase()}
                        </span>
                        <span>\${log.message}</span>
                        <span class="text-gray-500 ml-2">[\${log.source}]</span>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Error loading logs:', error);
            }
        }

        function initCharts() {
            // Performance Chart
            const perfCtx = document.getElementById('performance-chart').getContext('2d');
            performanceChart = new Chart(perfCtx, {
                type: 'line',
                data: {
                    labels: ['1h ago', '45m ago', '30m ago', '15m ago', 'Now'],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [120, 115, 125, 110, 105],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'white' }
                        }
                    },
                    scales: {
                        y: {
                            ticks: { color: 'white' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: 'white' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });

            // Health Chart
            const healthCtx = document.getElementById('health-chart').getContext('2d');
            healthChart = new Chart(healthCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Healthy', 'Warning', 'Critical'],
                    datasets: [{
                        data: [4, 1, 0],
                        backgroundColor: [
                            'rgb(34, 197, 94)',
                            'rgb(234, 179, 8)',
                            'rgb(239, 68, 68)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'white' }
                        }
                    }
                }
            });
        }

        function getStatusColor(status) {
            switch (status) {
                case 'healthy': return 'bg-green-600';
                case 'warning': return 'bg-yellow-600';
                case 'critical': return 'bg-red-600';
                default: return 'bg-gray-600';
            }
        }

        function getLogLevelColor(level) {
            switch (level) {
                case 'info': return 'bg-blue-600';
                case 'warning': return 'bg-yellow-600';
                case 'error': return 'bg-red-600';
                default: return 'bg-gray-600';
            }
        }

        async function refreshData() {
            await loadSystemStatus();
            await loadDomains();
            await loadDNSRecords();
            await loadLogs();
        }

        async function checkAllDomains() {
            await refreshData();
        }

        async function checkDomain(domain) {
            try {
                const response = await fetch(\`/api/domains/\${domain}/check\`, { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    await loadDomains();
                }
            } catch (error) {
                console.error('Error checking domain:', error);
            }
        }

        async function checkPropagation() {
            try {
                const response = await fetch('/api/dns/propagation');
                const result = await response.json();
                if (result.success) {
                    alert('Propagation check completed. Check console for details.');
                    console.log('Propagation status:', result.propagation);
                }
            } catch (error) {
                console.error('Error checking propagation:', error);
            }
        }

        function addDNSRecord() {
            // Implementation for adding DNS records
            alert('DNS record addition interface would open here');
        }

        function editDNSRecord(id) {
            // Implementation for editing DNS records
            alert(\`Edit DNS record \${id}\`);
        }

        async function deleteDNSRecord(id) {
            if (confirm('Are you sure you want to delete this DNS record?')) {
                try {
                    const response = await fetch(\`/api/dns/records/\${id}\`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        await loadDNSRecords();
                    }
                } catch (error) {
                    console.error('Error deleting DNS record:', error);
                }
            }
        }

        async function refreshLogs() {
            await loadLogs();
        }

        async function restartSystem() {
            if (confirm('Are you sure you want to restart the system? This will interrupt all services.')) {
                try {
                    const response = await fetch('/api/system/restart', { method: 'POST' });
                    const result = await response.json();
                    alert(result.message);
                } catch (error) {
                    console.error('Error restarting system:', error);
                }
            }
        }

        async function renewSSL() {
            if (confirm('Renew SSL certificate for all domains?')) {
                try {
                    const response = await fetch('/api/ssl/renew', { method: 'POST' });
                    const result = await response.json();
                    alert(result.message);
                } catch (error) {
                    console.error('Error renewing SSL:', error);
                }
            }
        }

        function exportConfig() {
            // Implementation for exporting configuration
            alert('Configuration export would download here');
        }

        function startAutoRefresh() {
            autoRefreshInterval = setInterval(refreshData, 30000); // Refresh every 30 seconds
        }

        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
        }

        // Handle auto-refresh toggle
        document.getElementById('auto-refresh').addEventListener('change', function() {
            if (this.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
    </script>
</body>
</html>
  `;
}

console.log('🏭 Factory-Wager Admin Dashboard running on http://localhost:3000');
console.log('📊 Available routes:');
console.log('  GET  /              - Admin dashboard');
console.log('  GET  /admin         - Admin dashboard');
console.log('  GET  /dashboard     - Admin dashboard');
console.log('  GET  /api/system/status - System status');
console.log('  GET  /api/domains   - Domain information');
console.log('  GET  /api/dns/records - DNS records');
console.log('  POST /api/dns/records - Add DNS record');
console.log('  PUT  /api/dns/records/:id - Update DNS record');
console.log('  DELETE /api/dns/records/:id - Delete DNS record');
console.log('  GET  /api/dns/propagation - DNS propagation');
console.log('  POST /api/domains/:domain/check - Check domain');
console.log('  GET  /api/metrics   - System metrics');
console.log('  GET  /api/logs      - System logs');
console.log('  POST /api/system/restart - Restart system');
console.log('  POST /api/ssl/renew - Renew SSL certificates');

export default app;
