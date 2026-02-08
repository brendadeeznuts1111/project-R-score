#!/usr/bin/env bun
/**
 * Gateway Dashboard - Unified Dashboard for Gateway and BunLock
 * Provides web interface to monitor and manage OpenClaw Gateway and locks
 */

import { serve } from 'bun';
import { randomUUIDv7 } from 'bun';
import type { OpenClawStatus, MatrixProfile } from '../../openclaw/gateway';
import { BunLock } from './bunlock';
import { c } from '../../lib/bun-context';

const PORT = parseInt(Bun.env.GATEWAY_DASHBOARD_PORT || '8766');
const HOST = Bun.env.GATEWAY_DASHBOARD_HOST || '0.0.0.0';

// Initialize components
const lockManager = new BunLock();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// HTML Templates
const getDashboardHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gateway & Lock Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @keyframes pulse-green { 0%, 100% { background-color: rgb(34 197 94); } 50% { background-color: rgb(74 222 128); } }
        @keyframes pulse-red { 0%, 100% { background-color: rgb(239 68 68); } 50% { background-color: rgb(248 113 113); } }
        .status-online { animation: pulse-green 2s infinite; }
        .status-offline { animation: pulse-red 2s infinite; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
    <div id="app"></div>
    <script>
        const API_BASE = window.location.origin;
        let refreshInterval;

        // Initialize app
        document.addEventListener('DOMContentLoaded', () => {
            renderApp();
            initializeRouter();
            startAutoRefresh();
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
                                    Gateway & Lock Dashboard
                                </h1>
                            </div>
                            <div class="flex items-center space-x-4">
                                <span id="connectionStatus" class="flex items-center space-x-2">
                                    <div class="w-3 h-3 rounded-full status-online"></div>
                                    <span class="text-sm">Connected</span>
                                </span>
                                <button onclick="toggleAutoRefresh()" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                                    <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>
                                    Auto Refresh: <span id="refreshStatus">ON</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="container mx-auto px-4 py-6">
                    <!-- Stats Overview -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Gateway Status</p>
                                    <p id="gatewayStatus" class="text-2xl font-bold text-green-400">Online</p>
                                </div>
                                <i data-lucide="server" class="w-8 h-8 text-green-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Active Locks</p>
                                    <p id="activeLocks" class="text-2xl font-bold text-yellow-400">0</p>
                                </div>
                                <i data-lucide="lock" class="w-8 h-8 text-yellow-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Matrix Profiles</p>
                                    <p id="profileCount" class="text-2xl font-bold text-blue-400">0</p>
                                </div>
                                <i data-lucide="users" class="w-8 h-8 text-blue-400"></i>
                            </div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-400 text-sm">Latency</p>
                                    <p id="latency" class="text-2xl font-bold text-purple-400">0ms</p>
                                </div>
                                <i data-lucide="zap" class="w-8 h-8 text-purple-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="bg-gray-800 rounded-lg border border-gray-700">
                        <div class="border-b border-gray-700">
                            <nav class="flex space-x-1 p-1">
                                <button onclick="switchTab('locks')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 text-white" data-tab="locks">
                                    <i data-lucide="lock" class="w-4 h-4 inline mr-2"></i>Lock Manager
                                </button>
                                <button onclick="switchTab('gateway')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700" data-tab="gateway">
                                    <i data-lucide="gateway" class="w-4 h-4 inline mr-2"></i>Gateway Status
                                </button>
                                <button onclick="switchTab('profiles')" class="tab-button px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-700" data-tab="profiles">
                                    <i data-lucide="users" class="w-4 h-4 inline mr-2"></i>Matrix Profiles
                                </button>
                            </nav>
                        </div>

                        <div class="p-6">
                            <!-- Lock Manager Tab -->
                            <div id="locks-tab" class="tab-content">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold">Lock Manager</h3>
                                    <div class="flex space-x-2">
                                        <button onclick="showCreateLockModal()" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition">
                                            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Create Lock
                                        </button>
                                        <button onclick="refreshLocks()" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                                            <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>Refresh
                                        </button>
                                    </div>
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
                        </div>
                    </div>
                </main>
            \`;
            
            lucide.createIcons();
            loadInitialData();
        }

        // Tab switching
        function switchTab(tabName, updateHistory = true) {
            // Update URL fragment and browser history
            if (updateHistory) {
                const newUrl = \`\${window.location.pathname}\#\${tabName}\`;
                window.history.pushState({ tab: tabName }, '', newUrl);
            }
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
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
                default:
                    console.warn(\`Unknown tab: \${tabName}\`);
            }
        }

        // Data loading functions
        async function loadInitialData() {
            await Promise.all([
                refreshLocks(),
                refreshGatewayStatus(),
                refreshProfiles(),
                updateStats()
            ]);
        }

        async function refreshLocks() {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks\`);
                const locks = await response.json();
                renderLocks(locks);
            } catch (error) {
                console.error('Failed to refresh locks:', error);
            }
        }

        async function refreshGatewayStatus() {
            try {
                const response = await fetch(\`\${API_BASE}/api/gateway/status\`);
                const status = await response.json();
                renderGatewayStatus(status);
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

        async function updateStats() {
            try {
                const [lockStats, gatewayStatus] = await Promise.all([
                    fetch(\`\${API_BASE}/api/locks/stats\`).then(r => r.json()),
                    fetch(\`\${API_BASE}/api/gateway/status\`).then(r => r.json())
                ]);
                
                document.getElementById('activeLocks').textContent = lockStats.activeLocks;
                document.getElementById('gatewayStatus').textContent = gatewayStatus.online ? 'Online' : 'Offline';
                document.getElementById('profileCount').textContent = gatewayStatus.profilesActive || 0;
                document.getElementById('latency').textContent = \`\${gatewayStatus.latencyMs || 0}ms\`;
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
        }

        // Render functions
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
                <div class="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
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
                            <div class="flex justify-between">
                                <span class="text-gray-400">Latency:</span>
                                <span>\${status.latencyMs || 0}ms</span>
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
                <div class="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
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

        // Action functions
        async function createLock(resource, owner, ttl) {
            try {
                const response = await fetch(\`\${API_BASE}/api/locks\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource, owner, ttl: ttl * 1000 })
                });
                
                if (response.ok) {
                    refreshLocks();
                    updateStats();
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
                    updateStats();
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

        // Auto refresh
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                updateStats();
            }, 5000);
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
    </script>
</body>
</html>`;

// API Routes
const server = serve({
  port: PORT,
  hostname: HOST,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Serve dashboard
      if (url.pathname === '/') {
        return new Response(getDashboardHTML(), {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }
      
      // Lock API endpoints
      if (url.pathname === '/api/locks' && req.method === 'GET') {
        const locks = lockManager.listActiveLocks();
        return Response.json(locks, { headers: corsHeaders });
      }
      
      if (url.pathname === '/api/locks' && req.method === 'POST') {
        const { resource, owner, ttl } = await req.json() as { resource: string; owner: string; ttl: number };
        const lockId = await lockManager.acquire(resource, owner, ttl);
        return Response.json({ lockId }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/locks/') && req.method === 'DELETE') {
        const lockId = url.pathname.split('/')[3];
        const success = await lockManager.release(lockId);
        return Response.json({ success }, { headers: corsHeaders });
      }
      
      if (url.pathname.startsWith('/api/locks/') && req.method === 'PUT' && url.pathname.endsWith('/extend')) {
        const lockId = url.pathname.split('/')[3];
        const { additionalTtl } = await req.json() as { additionalTtl: number };
        const success = await lockManager.extend(lockId, additionalTtl);
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
      console.error('Dashboard error:', error);
      return Response.json({ error: 'Internal server error' }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
});

console.log(c.cyan(`🎯 Gateway Dashboard Server`));
console.log(c.gray(`   Dashboard: http://${HOST}:${PORT}`));
console.log(c.gray(`   API Base:  http://${HOST}:${PORT}/api`));
console.log('');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(c.yellow('\n🛑 Shutting down Gateway Dashboard...'));
  lockManager.close();
  server.stop();
  process.exit(0);
});
