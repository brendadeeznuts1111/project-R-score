#!/usr/bin/env bun

// [WEB][EXPORT][DASHBOARD][WEB-EXP-001][v3.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-WEB][v3.0.0][ACTIVE]

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname } from "path";
import { AgentRankingsSystem } from "./agent-rankings.ts";
import { BetsIntegrationSystem } from "./bets-integration.ts";
import { GovAccessEnforcer } from "./gov-access.ts";

interface WebConfig {
  port: number;
  host: string;
  authRequired: boolean;
  corsEnabled: boolean;
  staticDir: string;
  apiPrefix: string;
}

interface DashboardData {
  timestamp: string;
  agents: any;
  bets: any;
  access: any;
  system: any;
}

class WebExportServer {
  private config: WebConfig;
  private server: any;
  private data: DashboardData | null = null;

  constructor(config?: Partial<WebConfig>) {
    this.config = {
      port: 3000,
      host: 'localhost',
      authRequired: false,
      corsEnabled: true,
      staticDir: 'dashboards',
      apiPrefix: '/api',
      ...config
    };
  }

  async start(): Promise<void> {
    console.log(`🌐 Starting Web Export Server on ${this.config.host}:${this.config.port}`);

    // Generate initial data
    await this.refreshData();

    this.server = Bun.serve({
      port: this.config.port,
      hostname: this.config.host,
      fetch: async (request) => {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };

        if (request.method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        }

        try {
          // API routes
          if (url.pathname.startsWith('/api/')) {
            return this.handleAPI(request, url);
          }

          // Static file serving
          if (url.pathname === '/' || url.pathname === '/index.html') {
            return this.serveDashboardHTML();
          }

          if (url.pathname.startsWith('/static/')) {
            return this.serveStaticFile(url.pathname);
          }

          // Dashboard routes
          if (url.pathname === '/dashboard') {
            return this.serveDashboardHTML();
          }

          if (url.pathname === '/agents') {
            return this.serveAgentsJSON();
          }

          if (url.pathname === '/bets') {
            return this.serveBetsJSON();
          }

          if (url.pathname === '/access') {
            return this.serveAccessJSON();
          }

          // Default to dashboard
          return this.serveDashboardHTML();

        } catch (error) {
          console.error(`Request error: ${error.message}`);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
    });

    console.log(`✅ Web Export Server running at http://${this.config.host}:${this.config.port}`);
    console.log(`📊 Dashboard: http://${this.config.host}:${this.config.port}/dashboard`);
    console.log(`🔌 API: http://${this.config.host}:${this.config.port}/api/data`);
  }

  private async handleAPI(request: Request, url: URL): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Refresh data endpoint
    if (url.pathname === '/api/refresh' && request.method === 'POST') {
      await this.refreshData();
      return new Response(JSON.stringify({ success: true, message: 'Data refreshed' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Main data endpoint
    if (url.pathname === '/api/data') {
      if (!this.data) {
        await this.refreshData();
      }

      return new Response(JSON.stringify(this.data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Agents data
    if (url.pathname === '/api/agents') {
      const rankings = new AgentRankingsSystem();
      await rankings.generateRankings();
      const data = rankings.getTopAgents(50);

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // BETS data
    if (url.pathname === '/api/bets') {
      const bets = new BetsIntegrationSystem();
      const data = bets.getStats();

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  private async serveDashboardHTML(): Promise<Response> {
    const html = this.generateDashboardHTML();

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private async serveAgentsJSON(): Promise<Response> {
    const rankings = new AgentRankingsSystem();
    await rankings.generateRankings();
    const data = rankings.getTopAgents(50);

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private async serveBetsJSON(): Promise<Response> {
    const bets = new BetsIntegrationSystem();
    const data = bets.getStats();

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private async serveAccessJSON(): Promise<Response> {
    const access = new GovAccessEnforcer();
    const audit = await access.runFullAccessAudit();

    return new Response(JSON.stringify(audit, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private async serveStaticFile(pathname: string): Promise<Response> {
    try {
      const filePath = join(process.cwd(), pathname.replace('/static/', ''));
      if (!existsSync(filePath)) {
        throw new Error('File not found');
      }

      const file = Bun.file(filePath);
      return new Response(file);
    } catch (error) {
      return new Response('File not found', { status: 404 });
    }
  }

  private async refreshData(): Promise<void> {
    console.log('📊 Refreshing dashboard data...');

    // Agents data
    const rankings = new AgentRankingsSystem();
    await rankings.generateRankings();
    const agents = rankings.getTopAgents(10);

    // BETS data
    const bets = new BetsIntegrationSystem();
    const betsStats = bets.getStats();

    // Access data
    const access = new GovAccessEnforcer();
    const accessAudit = await access.runFullAccessAudit();

    // System data
    const system = {
      version: '3.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    this.data = {
      timestamp: new Date().toISOString(),
      agents,
      bets: betsStats,
      access: accessAudit,
      system
    };

    console.log('✅ Dashboard data refreshed');
  }

  private generateDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Agent Governance Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .glow { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
        .dark-glow { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                🛡️ MCP Agent Governance Dashboard
            </h1>
            <p class="text-gray-400">Live syndicate monitoring & compliance</p>
        </header>

        <!-- Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-xl font-semibold mb-2">🤖 Agents</h3>
                <div id="agents-count" class="text-3xl font-bold text-blue-400">--</div>
                <p class="text-sm text-gray-400">Active agents</p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-xl font-semibold mb-2">🏀 BETS</h3>
                <div id="bets-volume" class="text-3xl font-bold text-green-400">$--</div>
                <p class="text-sm text-gray-400">Total volume</p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-xl font-semibold mb-2">🛡️ Access</h3>
                <div id="access-compliance" class="text-3xl font-bold text-purple-400">--%</div>
                <p class="text-sm text-gray-400">Compliance</p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-xl font-semibold mb-2">⚡ GOV</h3>
                <div id="gov-rules" class="text-3xl font-bold text-yellow-400">--</div>
                <p class="text-sm text-gray-400">Active rules</p>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Agents Chart -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">🏆 Top Agents Performance</h3>
                <canvas id="agentsChart" width="400" height="300"></canvas>
            </div>

            <!-- BETS Chart -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">📊 BETS Activity</h3>
                <canvas id="betsChart" width="400" height="300"></canvas>
            </div>
        </div>

        <!-- Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Agents Table -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">🤖 Agent Rankings</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-2">Rank</th>
                                <th class="text-left py-2">Agent</th>
                                <th class="text-left py-2">Profit</th>
                                <th class="text-left py-2">ROI</th>
                            </tr>
                        </thead>
                        <tbody id="agents-table">
                            <tr><td colspan="4" class="text-center py-4 text-gray-500">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Access Violations -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">🚨 Access Violations</h3>
                <div class="space-y-2" id="violations-list">
                    <p class="text-gray-500">No violations detected ✅</p>
                </div>
            </div>
        </div>

        <!-- Controls -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">🎮 Controls</h3>
            <div class="flex flex-wrap gap-4">
                <button onclick="refreshData()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    🔄 Refresh Data
                </button>
                <button onclick="exportData()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
                    📤 Export JSON
                </button>
                <button onclick="runCompliance()" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">
                    🛡️ Run Compliance
                </button>
                <button onclick="openTerminal()" class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
                    💻 Open Terminal
                </button>
            </div>
        </div>
    </div>

    <script>
        let agentsChart, betsChart;

        async function loadData() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();

                updateStats(data);
                updateCharts(data);
                updateTables(data);
                updateViolations(data);

                console.log('✅ Dashboard updated');
            } catch (error) {
                console.error('❌ Failed to load data:', error);
            }
        }

        function updateStats(data) {
            document.getElementById('agents-count').textContent = data.agents?.length || 0;
            document.getElementById('bets-volume').textContent = '$' + (data.bets?.totalVolume?.toLocaleString() || '0');
            document.getElementById('access-compliance').textContent = '98%'; // Mock for now
            document.getElementById('gov-rules').textContent = '141';
        }

        function updateCharts(data) {
            // Agents chart
            if (agentsChart) agentsChart.destroy();
            const agentsCtx = document.getElementById('agentsChart').getContext('2d');
            agentsChart = new Chart(agentsCtx, {
                type: 'bar',
                data: {
                    labels: data.agents?.map(a => a.agent) || [],
                    datasets: [{
                        label: 'Profit ($)',
                        data: data.agents?.map(a => a.profit) || [],
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#9CA3AF' } },
                        x: { ticks: { color: '#9CA3AF' } }
                    },
                    plugins: { legend: { labels: { color: '#9CA3AF' } } }
                }
            });

            // BETS chart (placeholder)
            if (betsChart) betsChart.destroy();
            const betsCtx = document.getElementById('betsChart').getContext('2d');
            betsChart = new Chart(betsCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Processed', 'Pending', 'Alerts'],
                    datasets: [{
                        data: [data.bets?.totalBets || 0, 10, data.bets?.alertsTriggered || 0],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(251, 191, 36, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#9CA3AF' } } }
                }
            });
        }

        function updateTables(data) {
            const tbody = document.getElementById('agents-table');
            tbody.innerHTML = (data.agents || []).slice(0, 10).map(agent =>
                \`<tr class="border-b border-gray-700">
                    <td class="py-2">#\${agent.rank}</td>
                    <td class="py-2">\${agent.agent}</td>
                    <td class="py-2 text-green-400">$\${agent.profit?.toLocaleString()}</td>
                    <td class="py-2 text-blue-400">\${agent.roi}%</td>
                </tr>\`
            ).join('');
        }

        function updateViolations(data) {
            const container = document.getElementById('violations-list');
            const violations = data.access?.violations || [];

            if (violations.length === 0) {
                container.innerHTML = '<p class="text-green-400">✅ No violations detected</p>';
            } else {
                container.innerHTML = violations.map(v =>
                    \`<div class="bg-red-900 border border-red-700 rounded p-2">
                        <span class="font-semibold">\${v.type}</span>: \${v.userId}
                        \${v.details ? '<br><small class="text-gray-400">' + v.details + '</small>' : ''}
                    </div>\`
                ).join('');
            }
        }

        async function refreshData() {
            console.log('🔄 Refreshing data...');
            await loadData();
        }

        async function exportData() {
            const response = await fetch('/api/data');
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`syndicate-data-\${new Date().toISOString().slice(0, 10)}.json\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async function runCompliance() {
            alert('Compliance check would run here - implement API endpoint');
        }

        function openTerminal() {
            alert('Terminal integration would open here - use external terminal');
        }

        // Auto-refresh every 30 seconds
        setInterval(loadData, 30000);

        // Initial load
        loadData();
    </script>
</body>
</html>`;
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      console.log('🛑 Web Export Server stopped');
    }
  }

  getServerInfo(): { url: string; port: number; host: string } {
    return {
      url: `http://${this.config.host}:${this.config.port}`,
      port: this.config.port,
      host: this.config.host
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const server = new WebExportServer();

  if (args.length === 0) {
    console.log(`🌐 Web Export Dashboard v3.0

USAGE:
  bun web:serve [port]          # Start web server (default: 3000)
  bun web:export json           # Export dashboard data as JSON
  bun web:export html           # Export dashboard as HTML file
  bun web:build                 # Build static dashboard files

FEATURES:
  - Live dashboard with real-time data
  - Interactive charts (Chart.js)
  - REST API endpoints (/api/data, /api/agents, /api/bets)
  - CORS enabled for external access
  - Auto-refresh every 30 seconds
  - Export functionality

ENDPOINTS:
  GET  /               # Main dashboard
  GET  /dashboard      # Dashboard HTML
  GET  /agents         # Agents JSON data
  GET  /bets           # BETS JSON data
  GET  /access         # Access audit JSON
  GET  /api/data       # Combined dashboard data
  POST /api/refresh    # Refresh all data

EXAMPLES:
  bun web:serve                    # Start on port 3000
  bun web:serve 8080               # Start on port 8080
  bun web:export json              # Save data to file
  bun web:export html              # Save dashboard HTML

ACCESS DASHBOARD:
  Open http://localhost:3000 in your browser
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'serve':
        const port = args[1] ? parseInt(args[1]) : 3000;
        const serverWithPort = new WebExportServer({ port });
        await serverWithPort.start();

        // Keep running
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down...');
          await serverWithPort.stop();
          process.exit(0);
        });

        // Keep alive
        await new Promise(() => {});
        break;

      case 'export':
        if (args[1] === 'json') {
          const data = await server['refreshData']();
          const jsonData = server['data'];
          const filename = `syndicate-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
          await Bun.write(filename, JSON.stringify(jsonData, null, 2));
          console.log(`✅ Exported dashboard data to ${filename}`);
        } else if (args[1] === 'html') {
          const html = server['generateDashboardHTML']();
          const filename = `syndicate-dashboard-${new Date().toISOString().slice(0, 10)}.html`;
          await Bun.write(filename, html);
          console.log(`✅ Exported dashboard HTML to ${filename}`);
        } else {
          console.error('Usage: bun web:export json|html');
          process.exit(1);
        }
        break;

      case 'build':
        console.log('🏗️ Building static dashboard files...');

        // Generate HTML
        const html = server['generateDashboardHTML']();
        await Bun.write('dist/index.html', html);

        // Generate JSON data
        await server['refreshData']();
        const jsonData = server['data'];
        await Bun.write('dist/data.json', JSON.stringify(jsonData, null, 2));

        console.log('✅ Static files built in ./dist/');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun web --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { WebExportServer };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
