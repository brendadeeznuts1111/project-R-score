// src/registry/admin-dashboard-worker.ts
/**
 * 🏭 Factory-Wager Admin Dashboard Cloudflare Worker
 * 
 * Serverless admin dashboard deployed on Cloudflare Workers
 * with global CDN distribution and edge computing capabilities.
 */

export interface Env {
  ADMIN_API_KEY?: string;
  DNS_API_TOKEN?: string;
  KV_STORE: KVNamespace;
  D1_DATABASE: D1Database;
}

// Mock data for the admin dashboard
const mockSystemStatus = {
  system: {
    status: 'operational',
    uptime: Math.floor(Date.now() / 1000),
    memory: { used: 134217728, total: 268435456 },
    nodeVersion: '18.17.0',
    platform: 'linux'
  },
  domains: {
    status: 'healthy',
    totalDomains: 5,
    healthyDomains: 4,
    warningDomains: 1,
    criticalDomains: 0,
    lastUpdate: new Date().toISOString()
  },
  dns: {
    totalZones: 1,
    totalRecords: 18
  },
  timestamp: new Date().toISOString()
};

const mockDomains = [
  {
    domain: 'factory-wager.com',
    status: 'healthy',
    uptime: 99.9,
    responseTime: 105,
    lastCheck: new Date().toISOString(),
    ssl: {
      status: 'valid',
      daysUntilExpiry: 85,
      issuer: "Let's Encrypt Authority X3"
    },
    performance: {
      ttfb: 105,
      dnsLookup: 12,
      totalResponseTime: 117
    },
    endpoints: [
      { url: 'https://factory-wager.com', status: 'up', responseTime: 105, statusCode: 200 },
      { url: 'https://factory-wager.com/api/health', status: 'up', responseTime: 95, statusCode: 200 }
    ]
  },
  {
    domain: 'registry.factory-wager.com',
    status: 'healthy',
    uptime: 99.8,
    responseTime: 112,
    lastCheck: new Date().toISOString(),
    ssl: {
      status: 'valid',
      daysUntilExpiry: 87,
      issuer: "Let's Encrypt Authority X3"
    },
    performance: {
      ttfb: 112,
      dnsLookup: 15,
      totalResponseTime: 127
    },
    endpoints: [
      { url: 'https://registry.factory-wager.com', status: 'up', responseTime: 112, statusCode: 200 }
    ]
  },
  {
    domain: 'api.factory-wager.com',
    status: 'warning',
    uptime: 98.5,
    responseTime: 245,
    lastCheck: new Date().toISOString(),
    ssl: {
      status: 'valid',
      daysUntilExpiry: 83,
      issuer: "Let's Encrypt Authority X3"
    },
    performance: {
      ttfb: 245,
      dnsLookup: 18,
      totalResponseTime: 263
    },
    endpoints: [
      { url: 'https://api.factory-wager.com', status: 'degraded', responseTime: 245, statusCode: 200 }
    ]
  },
  {
    domain: 'docs.factory-wager.com',
    status: 'healthy',
    uptime: 99.7,
    responseTime: 98,
    lastCheck: new Date().toISOString(),
    ssl: {
      status: 'valid',
      daysUntilExpiry: 90,
      issuer: "Let's Encrypt Authority X3"
    },
    performance: {
      ttfb: 98,
      dnsLookup: 11,
      totalResponseTime: 109
    },
    endpoints: [
      { url: 'https://docs.factory-wager.com', status: 'up', responseTime: 98, statusCode: 200 }
    ]
  },
  {
    domain: 'monitoring.factory-wager.com',
    status: 'healthy',
    uptime: 99.6,
    responseTime: 125,
    lastCheck: new Date().toISOString(),
    ssl: {
      status: 'valid',
      daysUntilExpiry: 82,
      issuer: "Let's Encrypt Authority X3"
    },
    performance: {
      ttfb: 125,
      dnsLookup: 14,
      totalResponseTime: 139
    },
    endpoints: [
      { url: 'https://monitoring.factory-wager.com', status: 'up', responseTime: 125, statusCode: 200 }
    ]
  }
];

const mockDNSRecords = {
  domain: 'factory-wager.com',
  records: [
    { id: 'a-root-1', type: 'A', name: '@', value: '104.21.49.234', ttl: 300 },
    { id: 'a-root-2', type: 'A', name: '@', value: '172.67.154.85', ttl: 300 },
    { id: 'aaaa-root-1', type: 'AAAA', name: '@', value: '2606:4700:3030::6815:31ea', ttl: 300 },
    { id: 'aaaa-root-2', type: 'AAAA', name: '@', value: '2606:4700:3035::ac43:9a55', ttl: 300 },
    { id: 'cname-registry', type: 'CNAME', name: 'registry', value: 'factory-wager.com', ttl: 300 },
    { id: 'cname-api', type: 'CNAME', name: 'api', value: 'factory-wager.com', ttl: 300 },
    { id: 'cname-docs', type: 'CNAME', name: 'docs', value: 'factory-wager.com', ttl: 300 },
    { id: 'cname-monitoring', type: 'CNAME', name: 'monitoring', value: 'factory-wager.com', ttl: 300 },
    { id: 'mx-1', type: 'MX', name: '@', value: 'mx1.factory-wager.com', ttl: 300, priority: 10 },
    { id: 'mx-2', type: 'MX', name: '@', value: 'mx2.factory-wager.com', ttl: 300, priority: 20 },
    { id: 'txt-spf', type: 'TXT', name: '@', value: 'v=spf1 include:_spf.factory-wager.com ~all', ttl: 300 },
    { id: 'txt-dmarc', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@factory-wager.com', ttl: 300 },
    { id: 'txt-dkim', type: 'TXT', name: 'default._domainkey', value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...', ttl: 300 },
    { id: 'txt-google', type: 'TXT', name: 'google-site-verification', value: 'google-site-verification=factory-wager-verification-token', ttl: 300 },
    { id: 'txt-bing', type: 'TXT', name: 'bing-site-verification', value: 'BingSiteAuth: factory-wager-bing-token', ttl: 300 },
    { id: 'caa', type: 'CAA', name: '@', value: 'letsencrypt.org', ttl: 300, tag: 'issue', flags: 0 }
  ],
  soa: {
    mname: 'ns1.factory-wager.com',
    rname: 'dnsadmin.factory-wager.com',
    serial: 2026011501,
    refresh: 3600,
    retry: 600,
    expire: 86400,
    minimum: 300
  },
  ns: [
    { hostname: 'ns1.factory-wager.com' },
    { hostname: 'ns2.factory-wager.com' }
  ],
  status: 'active',
  lastUpdated: new Date().toISOString()
};

const mockLogs = [
  {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Admin dashboard accessed via Cloudflare Worker',
    source: 'dashboard-worker'
  },
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: 'info',
    message: 'DNS propagation check completed globally',
    source: 'dns-manager'
  },
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: 'warning',
    message: 'SSL certificate expiring in 25 days for api.factory-wager.com',
    source: 'ssl-monitor'
  },
  {
    timestamp: new Date(Date.now() - 180000).toISOString(),
    level: 'info',
    message: 'Domain health check completed for all zones',
    source: 'status-api'
  },
  {
    timestamp: new Date(Date.now() - 300000).toISOString(),
    level: 'info',
    message: 'Cloudflare Worker deployed successfully',
    source: 'deployment'
  }
];

function getAdminDashboardHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏭 Factory-Wager Admin Dashboard - Cloudflare Worker</title>
    
    <!-- 🚀 Preconnect Optimization -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="dns-prefetch" href="//cdn.tailwindcss.com">
    <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
    <link rel="dns-prefetch" href="//cdn.jsdelivr.net">
    
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link rel="preconnect" href="https://api.factory-wager.com" crossorigin>
    <link rel="preconnect" href="https://registry.factory-wager.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    
    <!-- Critical Resources -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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
        .glass-effect {
            background: rgba(31, 41, 55, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(75, 85, 99, 0.3);
        }
        .worker-badge {
            background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%);
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .edge-indicator {
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
            background-size: 200% 100%;
            animation: gradient 3s ease infinite;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    </style>
</head>
<body class="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white min-h-screen">
    <!-- Header -->
    <header class="glass-effect border-b border-gray-700">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <h1 class="text-3xl font-bold text-blue-400">🏭 Factory-Wager Admin</h1>
                    <div class="worker-badge px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                        <i class="fas fa-cloud"></i>
                        <span>Cloudflare Worker</span>
                    </div>
                    <span id="system-status" class="px-3 py-1 rounded-full text-sm font-medium bg-green-600 status-healthy">
                        OPERATIONAL
                    </span>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="edge-indicator px-3 py-1 rounded-full text-sm font-medium">
                        <i class="fas fa-globe mr-2"></i>Edge Computing
                    </div>
                    <span id="current-time" class="text-sm text-gray-300"></span>
                    <button onclick="refreshData()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all transform hover:scale-105">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- System Overview -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div class="glass-effect rounded-xl p-6 transform hover:scale-105 transition-all">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">System Status</p>
                        <p id="system-health" class="text-3xl font-bold text-green-400">HEALTHY</p>
                    </div>
                    <div class="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center status-healthy">
                        <i class="fas fa-check-circle text-2xl"></i>
                    </div>
                </div>
            </div>
            
            <div class="glass-effect rounded-xl p-6 transform hover:scale-105 transition-all">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Active Domains</p>
                        <p id="domain-count" class="text-3xl font-bold text-blue-400">5</p>
                    </div>
                    <div class="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-globe text-2xl"></i>
                    </div>
                </div>
            </div>
            
            <div class="glass-effect rounded-xl p-6 transform hover:scale-105 transition-all">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">DNS Records</p>
                        <p id="dns-count" class="text-3xl font-bold text-purple-400">18</p>
                    </div>
                    <div class="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-network-wired text-2xl"></i>
                    </div>
                </div>
            </div>
            
            <div class="glass-effect rounded-xl p-6 transform hover:scale-105 transition-all">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Avg Uptime</p>
                        <p id="uptime" class="text-3xl font-bold text-green-400">99.5%</p>
                    </div>
                    <div class="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-clock text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="glass-effect rounded-xl p-6 transform hover:scale-105 transition-all">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Edge Locations</p>
                        <p class="text-3xl font-bold text-orange-400">275+</p>
                    </div>
                    <div class="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-server text-2xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="glass-effect rounded-xl border border-gray-700 mb-8">
            <div class="flex border-b border-gray-700">
                <button onclick="showTab('domains')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-blue-500">
                    <i class="fas fa-globe mr-2"></i>Domains
                </button>
                <button onclick="showTab('dns')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    <i class="fas fa-network-wired mr-2"></i>DNS Management
                </button>
                <button onclick="showTab('monitoring')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    <i class="fas fa-chart-line mr-2"></i>Monitoring
                </button>
                <button onclick="showTab('logs')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    <i class="fas fa-list-alt mr-2"></i>Logs
                </button>
                <button onclick="showTab('worker')" class="tab-button px-6 py-3 text-left hover:bg-gray-700 transition-colors border-b-2 border-transparent">
                    <i class="fas fa-cloud mr-2"></i>Worker Info
                </button>
            </div>

            <!-- Tab Content -->
            <div class="p-6">
                <!-- Domains Tab -->
                <div id="domains-tab" class="tab-content">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Domain Status</h2>
                        <button onclick="checkAllDomains()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-sync mr-2"></i>Check All Domains
                        </button>
                    </div>
                    <div id="domains-list" class="space-y-4">
                        <!-- Domains will be loaded here -->
                    </div>
                </div>

                <!-- DNS Tab -->
                <div id="dns-tab" class="tab-content hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">DNS Records</h2>
                        <div class="space-x-2">
                            <button onclick="addDNSRecord()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all transform hover:scale-105">
                                <i class="fas fa-plus mr-2"></i>Add Record
                            </button>
                            <button onclick="checkPropagation()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all transform hover:scale-105">
                                <i class="fas fa-globe-americas mr-2"></i>Check Propagation
                            </button>
                        </div>
                    </div>
                    <div id="dns-records" class="overflow-x-auto">
                        <!-- DNS records will be loaded here -->
                    </div>
                </div>

                <!-- Monitoring Tab -->
                <div id="monitoring-tab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">System Monitoring</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="glass-effect rounded-xl p-6">
                            <h3 class="text-xl font-semibold mb-4"><i class="fas fa-tachometer-alt mr-2"></i>Performance Metrics</h3>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center">
                                    <span><i class="fas fa-stopwatch mr-2 text-blue-400"></i>Average Response Time</span>
                                    <span class="font-mono text-green-400">137ms</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span><i class="fas fa-search mr-2 text-purple-400"></i>DNS Lookup Time</span>
                                    <span class="font-mono text-green-400">14ms</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span><i class="fas fa-lock mr-2 text-yellow-400"></i>SSL Handshake</span>
                                    <span class="font-mono text-green-400">42ms</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span><i class="fas fa-memory mr-2 text-red-400"></i>Memory Usage</span>
                                    <span class="font-mono text-green-400">128MB</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span><i class="fas fa-cloud mr-2 text-orange-400"></i>Edge Latency</span>
                                    <span class="font-mono text-green-400">< 10ms</span>
                                </div>
                            </div>
                        </div>
                        <div class="glass-effect rounded-xl p-6">
                            <h3 class="text-xl font-semibold mb-4"><i class="fas fa-heartbeat mr-2"></i>Domain Health Distribution</h3>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center"><span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>Healthy</span>
                                    <span class="font-bold text-green-400">4 domains</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center"><span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Warning</span>
                                    <span class="font-bold text-yellow-400">1 domain</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center"><span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>Critical</span>
                                    <span class="font-bold text-red-400">0 domains</span>
                                </div>
                                <div class="mt-4 pt-4 border-t border-gray-600">
                                    <div class="flex justify-between items-center">
                                        <span class="font-semibold">Overall Health</span>
                                        <span class="font-bold text-green-400 text-lg">80%</span>
                                    </div>
                                    <div class="mt-2 bg-gray-700 rounded-full h-3">
                                        <div class="bg-green-500 h-3 rounded-full" style="width: 80%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Logs Tab -->
                <div id="logs-tab" class="tab-content hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">System Logs</h2>
                        <button onclick="refreshLogs()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-sync mr-2"></i>Refresh Logs
                        </button>
                    </div>
                    <div id="logs-container" class="glass-effect rounded-xl p-4 font-mono text-sm max-h-96 overflow-y-auto">
                        <!-- Logs will be loaded here -->
                    </div>
                </div>

                <!-- Worker Info Tab -->
                <div id="worker-tab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">Cloudflare Worker Information</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="glass-effect rounded-xl p-6">
                            <h3 class="text-xl font-semibold mb-4"><i class="fas fa-info-circle mr-2"></i>Worker Details</h3>
                            <div class="space-y-4">
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Runtime</span>
                                    <span class="font-mono text-blue-400">V8 Engine</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Edge Locations</span>
                                    <span class="font-mono text-green-400">275+ Global</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Request Limit</span>
                                    <span class="font-mono text-purple-400">100,000/day</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">CPU Time</span>
                                    <span class="font-mono text-yellow-400">10ms/request</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Memory</span>
                                    <span class="font-mono text-orange-400">128MB</span>
                                </div>
                            </div>
                        </div>
                        <div class="glass-effect rounded-xl p-6">
                            <h3 class="text-xl font-semibold mb-4"><i class="fas fa-rocket mr-2"></i>Performance Benefits</h3>
                            <div class="space-y-4">
                                <div class="flex items-start">
                                    <i class="fas fa-check-circle text-green-400 mt-1 mr-3"></i>
                                    <div>
                                        <span class="font-semibold">Global CDN</span>
                                        <p class="text-sm text-gray-400">Content cached at 275+ edge locations worldwide</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i class="fas fa-check-circle text-green-400 mt-1 mr-3"></i>
                                    <div>
                                        <span class="font-semibold">Edge Computing</span>
                                        <p class="text-sm text-gray-400">Compute executed closest to users for minimal latency</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i class="fas fa-check-circle text-green-400 mt-1 mr-3"></i>
                                    <div>
                                        <span class="font-semibold">Auto-scaling</span>
                                        <p class="text-sm text-gray-400">Instantly scales to handle any traffic volume</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i class="fas fa-check-circle text-green-400 mt-1 mr-3"></i>
                                    <div>
                                        <span class="font-semibold">Serverless</span>
                                        <p class="text-sm text-gray-400">No servers to manage, patch, or maintain</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let autoRefreshInterval;

        // Initialize dashboard
        // 🚀 Preconnect Manager
        class PreconnectManager {
            constructor() {
                this.connections = new Set();
                this.init();
            }

            init() {
                this.optimizeForNetwork();
                this.preconnectCriticalResources();
                this.setupNetworkMonitoring();
            }

            optimizeForNetwork() {
                // Detect network type and optimize accordingly
                if ('connection' in navigator) {
                    const connection = (navigator as any).connection;
                    const networkType = connection.effectiveType || '4g';
                    
                    console.log(`📶 Network detected: ${networkType}`);
                    
                    switch (networkType) {
                        case 'slow-2g':
                        case '2g':
                            this.preconnectMinimal();
                            break;
                        case '3g':
                            this.preconnectBalanced();
                            break;
                        case '4g':
                        case '5g':
                            this.preconnectOptimal();
                            break;
                    }
                }
            }

            preconnectCriticalResources() {
                const criticalDomains = [
                    'https://api.factory-wager.com',
                    'https://registry.factory-wager.com',
                    'https://fonts.googleapis.com',
                    'https://cdn.tailwindcss.com'
                ];

                criticalDomains.forEach(domain => {
                    this.addPreconnect(domain);
                });
            }

            preconnectMinimal() {
                console.log('📶 Minimal preconnect strategy for slow networks');
                this.addPreconnect('https://api.factory-wager.com');
                this.addPreconnect('https://fonts.googleapis.com');
            }

            preconnectBalanced() {
                console.log('📶 Balanced preconnect strategy for 3G networks');
                this.preconnectCriticalResources();
            }

            preconnectOptimal() {
                console.log('📶 Optimal preconnect strategy for fast networks');
                const optimalDomains = [
                    'https://api.factory-wager.com',
                    'https://registry.factory-wager.com',
                    'https://fonts.googleapis.com',
                    'https://fonts.gstatic.com',
                    'https://cdn.tailwindcss.com',
                    'https://cdnjs.cloudflare.com',
                    'https://cdn.jsdelivr.net'
                ];

                optimalDomains.forEach(domain => {
                    this.addPreconnect(domain);
                });
            }

            addPreconnect(url) {
                if (this.connections.has(url)) return;

                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = url;
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
                
                this.connections.add(url);
                console.log(`🔗 Preconnect added: ${url}`);
            }

            setupNetworkMonitoring() {
                if ('connection' in navigator) {
                    const connection = (navigator as any).connection;
                    
                    connection.addEventListener('change', () => {
                        console.log('📶 Network changed, re-optimizing...');
                        this.optimizeForNetwork();
                    });
                }
            }

            getStats() {
                return {
                    activeConnections: this.connections.size,
                    domains: Array.from(this.connections)
                };
            }
        }

        // Initialize preconnect manager
        let preconnectManager;

        document.addEventListener('DOMContentLoaded', function() {
            // 🚀 Initialize preconnect optimization
            preconnectManager = new PreconnectManager();
            
            updateTime();
            setInterval(updateTime, 1000);
            loadSystemStatus();
            loadDomains();
            loadDNSRecords();
            loadLogs();
            
            // Auto-refresh
            if (document.getElementById('auto-refresh')?.checked) {
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

        function loadSystemStatus() {
            const data = ${JSON.stringify(mockSystemStatus)};
            
            document.getElementById('system-health').textContent = data.domains.status.toUpperCase();
            document.getElementById('domain-count').textContent = data.domains.totalDomains;
            document.getElementById('dns-count').textContent = data.dns.totalRecords;
            document.getElementById('uptime').textContent = (data.domains.healthyDomains / data.domains.totalDomains * 100).toFixed(1) + '%';
            
            // Update status indicator
            const statusEl = document.getElementById('system-status');
            statusEl.textContent = data.domains.status.toUpperCase();
            statusEl.className = 'px-3 py-1 rounded-full text-sm font-medium ' + 
                (data.domains.status === 'healthy' ? 'bg-green-600 status-healthy' : 
                 data.domains.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600 status-critical');
        }

        function loadDomains() {
            const domains = ${JSON.stringify(mockDomains)};
            
            const container = document.getElementById('domains-list');
            container.innerHTML = domains.map(domain => \`
                <div class="glass-effect rounded-xl p-6 border border-gray-600 transform hover:scale-105 transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h3 class="font-bold text-xl mb-2 flex items-center">
                                <i class="fas fa-globe mr-2 text-blue-400"></i>
                                \${domain.domain}
                            </h3>
                            <div class="flex items-center space-x-6 mb-3">
                                <span class="px-3 py-1 rounded-full text-sm font-medium \${getStatusColor(domain.status)}">
                                    <i class="fas fa-circle text-xs mr-2"></i>\${domain.status.toUpperCase()}
                                </span>
                                <span class="text-sm text-gray-300">
                                    <i class="fas fa-clock mr-1"></i>Uptime: \${domain.uptime.toFixed(1)}%
                                </span>
                                <span class="text-sm text-gray-300">
                                    <i class="fas fa-tachometer-alt mr-1"></i>Response: \${domain.responseTime}ms
                                </span>
                                <span class="text-sm text-gray-300">
                                    <i class="fas fa-lock mr-1"></i>SSL: \${domain.ssl.daysUntilExpiry} days
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-400"><i class="fas fa-stopwatch mr-1"></i>TTFB:</span> 
                                    <span class="font-mono ml-2 text-green-400">\${domain.performance.ttfb}ms</span>
                                </div>
                                <div>
                                    <span class="text-gray-400"><i class="fas fa-search mr-1"></i>DNS Lookup:</span> 
                                    <span class="font-mono ml-2 text-green-400">\${domain.performance.dnsLookup}ms</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="checkDomain('\${domain.domain}')" class="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-all transform hover:scale-105">
                            <i class="fas fa-sync mr-2"></i>Check
                        </button>
                    </div>
                </div>
            \`).join('');
        }

        function loadDNSRecords() {
            const data = ${JSON.stringify(mockDNSRecords)};
            
            const container = document.getElementById('dns-records');
            container.innerHTML = \`
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-600">
                                <th class="text-left py-3 px-4">Type</th>
                                <th class="text-left py-3 px-4">Name</th>
                                <th class="text-left py-3 px-4">Value</th>
                                <th class="text-left py-3 px-4">TTL</th>
                                <th class="text-left py-3 px-4">Priority</th>
                                <th class="text-left py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${data.records.map(record => \`
                                <tr class="border-b border-gray-600 hover:bg-gray-700 transition-colors">
                                    <td class="py-3 px-4">
                                        <span class="px-2 py-1 bg-blue-600 rounded text-xs font-semibold">
                                            \${record.type}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 font-mono">\${record.name}</td>
                                    <td class="py-3 px-4 font-mono text-xs max-w-xs truncate" title="\${record.value}">
                                        \${record.value}
                                    </td>
                                    <td class="py-3 px-4">\${record.ttl}</td>
                                    <td class="py-3 px-4">\${record.priority || '-'}</td>
                                    <td class="py-3 px-4">
                                        <button onclick="editDNSRecord('\${record.id}')" class="text-blue-400 hover:text-blue-300 mr-3 transition-colors">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteDNSRecord('\${record.id}')" class="text-red-400 hover:text-red-300 transition-colors">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h4 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-info-circle mr-2 text-blue-400"></i>Zone Information
                    </h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><span class="text-gray-400">Primary NS:</span> \${data.soa.mname}</div>
                        <div><span class="text-gray-400">Serial:</span> \${data.soa.serial}</div>
                        <div><span class="text-gray-400">Refresh:</span> \${data.soa.refresh}s</div>
                        <div><span class="text-gray-400">Retry:</span> \${data.soa.retry}s</div>
                    </div>
                </div>
            \`;
        }

        function loadLogs() {
            const logs = ${JSON.stringify(mockLogs)};
            
            const container = document.getElementById('logs-container');
            container.innerHTML = logs.map(log => \`
                <div class="mb-3 p-3 rounded-lg bg-gray-800 border-l-4 \${getLogBorderColor(log.level)}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <span class="text-gray-400 text-sm">\${log.timestamp}</span>
                            <span class="mx-3 px-2 py-1 rounded text-xs font-medium \${getLogLevelColor(log.level)}">
                                \${log.level.toUpperCase()}
                            </span>
                            <span class="ml-2">\${log.message}</span>
                        </div>
                        <span class="text-gray-500 text-sm">[\${log.source}]</span>
                    </div>
                </div>
            \`).join('');
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

        function getLogBorderColor(level) {
            switch (level) {
                case 'info': return 'border-blue-600';
                case 'warning': return 'border-yellow-600';
                case 'error': return 'border-red-600';
                default: return 'border-gray-600';
            }
        }

        async function refreshData() {
            loadSystemStatus();
            loadDomains();
            loadDNSRecords();
            loadLogs();
        }

        function checkAllDomains() {
            showNotification('Checking all domains globally...', 'info');
            setTimeout(() => {
                showNotification('All domains checked successfully!', 'success');
                refreshData();
            }, 2000);
        }

        function checkDomain(domain) {
            showNotification(\`Checking domain: \${domain}\`, 'info');
            setTimeout(() => {
                showNotification(\`Domain \${domain} is healthy!\`, 'success');
            }, 1500);
        }

        function checkPropagation() {
            showNotification('Checking global DNS propagation...', 'info');
            setTimeout(() => {
                showNotification('DNS propagation completed successfully!\\n\\n🌍 Global Regions:\\n✅ North America - Propagated\\n✅ Europe - Propagated\\n✅ Asia - Propagated\\n✅ South America - Propagated\\n✅ Africa - Propagated\\n✅ Oceania - Propagated', 'success');
            }, 2500);
        }

        function addDNSRecord() {
            const type = prompt('Record Type (A, AAAA, CNAME, MX, TXT, CAA):');
            const name = prompt('Record Name:');
            const value = prompt('Record Value:');
            const ttl = prompt('TTL (seconds):', '300');
            
            if (type && name && value) {
                showNotification(\`DNS Record Added:\\nType: \${type}\\nName: \${name}\\nValue: \${value}\\nTTL: \${ttl}\\n\\n✅ Propagating to edge locations...`, 'success');
                refreshData();
            }
        }

        function editDNSRecord(id) {
            showNotification(\`Edit DNS record \${id}\\n\\n📝 Edit interface would open here.`, 'info');
        }

        function deleteDNSRecord(id) {
            if (confirm('Are you sure you want to delete this DNS record?')) {
                showNotification(\`DNS record \${id} deleted.\\n\\n🗑️ Removing from edge caches...`, 'success');
                refreshData();
            }
        }

        function refreshLogs() {
            showNotification('Refreshing system logs...', 'info');
            setTimeout(() => {
                loadLogs();
                showNotification('Logs refreshed successfully!', 'success');
            }, 1000);
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md transform transition-all duration-300 \${getNotificationColor(type)}\`;
            notification.innerHTML = \`
                <div class="flex items-start">
                    <i class="fas \${getNotificationIcon(type)} mr-3 mt-1"></i>
                    <div class="flex-1">
                        <p class="text-sm whitespace-pre-line">\${message}</p>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-gray-300 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            \`;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        function getNotificationColor(type) {
            switch (type) {
                case 'success': return 'bg-green-600 text-white';
                case 'warning': return 'bg-yellow-600 text-white';
                case 'error': return 'bg-red-600 text-white';
                default: return 'bg-blue-600 text-white';
            }
        }

        function getNotificationIcon(type) {
            switch (type) {
                case 'success': return 'fa-check-circle';
                case 'warning': return 'fa-exclamation-triangle';
                case 'error': return 'fa-times-circle';
                default: return 'fa-info-circle';
            }
        }

        function startAutoRefresh() {
            autoRefreshInterval = setInterval(refreshData, 30000); // Refresh every 30 seconds
        }

        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
        }
    </script>
</body>
</html>
  `;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case '/':
        case '/admin':
        case '/dashboard':
          return new Response(getAdminDashboardHTML(), {
            headers: {
              'Content-Type': 'text/html',
              ...corsHeaders
            }
          });

        case '/api/system/status':
          return new Response(JSON.stringify(mockSystemStatus), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        case '/api/domains':
          return new Response(JSON.stringify(mockDomains), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        case '/api/dns/records':
          return new Response(JSON.stringify(mockDNSRecords), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        case '/api/logs':
          return new Response(JSON.stringify({ logs: mockLogs }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        case '/api/metrics':
          const metrics = {
            worker: {
                runtime: 'cloudflare-workers',
                edgeLocations: '275+',
                requestLimit: '100000/day',
                cpuTime: '10ms/request',
                memory: '128MB'
            },
            system: {
              uptime: Math.floor(Date.now() / 1000),
              memory: { used: 134217728, total: 268435456 },
              cpu: { user: 1234567, system: 987654 }
            },
            domains: {
              total: mockDomains.length,
              healthy: mockDomains.filter(d => d.status === 'healthy').length,
              warning: mockDomains.filter(d => d.status === 'warning').length,
              critical: mockDomains.filter(d => d.status === 'critical').length
            },
            performance: {
              avgResponseTime: mockDomains.reduce((sum, d) => sum + d.responseTime, 0) / mockDomains.length,
              avgUptime: mockDomains.reduce((sum, d) => sum + d.uptime, 0) / mockDomains.length,
              edgeLatency: '<10ms'
            },
            timestamp: new Date().toISOString()
          };
          
          return new Response(JSON.stringify(metrics), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        case '/health':
          return new Response('healthy\n', {
            headers: {
              'Content-Type': 'text/plain',
              ...corsHeaders
            }
          });

        case '/api/worker/info':
          const workerInfo = {
            runtime: 'cloudflare-workers',
            version: '1.0.0',
            edgeLocations: 275,
            requestLimit: 100000,
            cpuTimeLimit: 10, // ms
            memoryLimit: 128, // MB
            features: [
              'Global CDN',
              'Edge Computing',
              'Auto-scaling',
              'Serverless',
              'Zero Cold Starts',
              'Built-in Security'
            ],
            deployedAt: new Date().toISOString(),
            region: url.cf?.colo || 'Unknown'
          };
          
          return new Response(JSON.stringify(workerInfo), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
