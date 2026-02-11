/**
 * Spawn Terminal Integration for Filter Dashboard
 * 
 * Extends the existing spawn dashboard with filter execution capabilities
 * and real-time WebSocket streaming of filter results.
 */

import { spawn } from 'bun';
import { runFilteredScript, discoverWorkspacePackages, filterPackages } from '../../lib/filter-runner';
import type { FilterOptions, FilterSummary } from '../../lib/filter-runner';

// Color utilities
const c = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`
};

interface FilterRequest {
  id: string;
  pattern: string;
  script: string;
  options: FilterOptions;
  timestamp: Date;
}

interface FilterWebSocket {
  id: string;
  ws: WebSocket;
  request?: FilterRequest;
}

export class FilterDashboard {
  private server: any;
  private activeConnections: Map<string, FilterWebSocket> = new Map();
  private activeFilters: Map<string, FilterRequest> = new Map();
  private filterHistory: FilterSummary[] = [];
  private maxHistorySize = 100;

  constructor(port: number = 3001) {
    this.server = Bun.serve({
      port,
      fetch: this.handleRequest.bind(this),
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: this.handleWebSocketOpen.bind(this),
        close: this.handleWebSocketClose.bind(this),
      } as any
    });

    console.log(c.bold(`🚀 Filter Dashboard running on http://localhost:${port}`));
    console.log(c.dim('WebSocket endpoint: ws://localhost:' + port + '/filter-ws'));
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    try {
      switch (url.pathname) {
        case '/':
          return this.serveDashboard();
          
        case '/filter-run':
          return this.handleFilterRun(req);
          
        case '/filter-status':
          return this.handleFilterStatus(req);
          
        case '/filter-history':
          return this.handleFilterHistory(req);
          
        case '/api/packages':
          return this.handlePackageList(req);
          
        case '/api/scripts':
          return this.handleScriptList(req);
          
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Request error:', error);
      return Response.json({ error: String(error) }, {
        status: 500,
      });
    }
  }

  private async handleFilterRun(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pattern = url.searchParams.get('pattern') || '*';
    const script = url.searchParams.get('script') || 'test';
    
    const options: FilterOptions = {
      parallel: url.searchParams.has('parallel'),
      bail: url.searchParams.has('bail'),
      dryRun: url.searchParams.has('dry-run'),
      silent: url.searchParams.has('silent'),
      maxConcurrency: url.searchParams.has('max-concurrency') 
        ? parseInt(url.searchParams.get('max-concurrency')!)
        : undefined,
      timeout: url.searchParams.has('timeout')
        ? parseInt(url.searchParams.get('timeout')!)
        : undefined
    };

    const filterId = this.generateFilterId();
    const request: FilterRequest = {
      id: filterId,
      pattern,
      script,
      options,
      timestamp: new Date()
    };

    this.activeFilters.set(filterId, request);

    // Notify all connected clients
    this.broadcast({
      type: 'filterStarted',
      request
    });

    try {
      // Execute filter with custom output handling
      const summary = await this.runFilterWithStreaming(request);
      
      // Store in history
      this.filterHistory.unshift(summary);
      if (this.filterHistory.length > this.maxHistorySize) {
        this.filterHistory = this.filterHistory.slice(0, this.maxHistorySize);
      }

      // Broadcast completion
      this.broadcast({
        type: 'filterCompleted',
        filterId,
        summary
      });

      return Response.json({
        success: true,
        filterId,
        summary
      });

    } catch (error) {
      this.broadcast({
        type: 'filterFailed',
        filterId,
        error: String(error)
      });

      return Response.json({
        success: false,
        filterId,
        error: String(error)
      }, { status: 500 });
    } finally {
      this.activeFilters.delete(filterId);
    }
  }

  private async runFilterWithStreaming(request: FilterRequest): Promise<FilterSummary> {
    // Create a custom implementation that streams progress
    
    const startTime = performance.now();
    
    // Discover packages
    this.broadcast({
      type: 'filterProgress',
      filterId: request.id,
      stage: 'discovering',
      message: 'Discovering workspace packages...'
    });

    const packages = await discoverWorkspacePackages();
    
    // Filter packages
    this.broadcast({
      type: 'filterProgress',
      filterId: request.id,
      stage: 'filtering',
      message: `Filtering packages with pattern: ${request.pattern}`
    });

    const matched = await filterPackages(packages, request.pattern);
    
    if (matched.length === 0) {
      return {
        pattern: request.pattern,
        script: request.script,
        totalPackages: packages.length,
        matchedPackages: 0,
        executedPackages: 0,
        successfulPackages: 0,
        failedPackages: 0,
        totalDurationMs: performance.now() - startTime,
        averageDurationMs: 0,
        results: []
      };
    }

    // Execute with streaming
    this.broadcast({
      type: 'filterProgress',
      filterId: request.id,
      stage: 'executing',
      message: `Executing "${request.script}" in ${matched.length} packages...`
    });

    // Use the main filter runner but with custom options
    const summary = await runFilteredScript(request.pattern, request.script, {
      ...request.options,
      silent: true // We'll handle output ourselves
    });

    // Stream individual results
    summary.results.forEach(result => {
      this.broadcast({
        type: 'packageResult',
        filterId: request.id,
        result
      });
    });

    return summary;
  }

  private async handleFilterStatus(req: Request): Promise<Response> {
    const activeFilters = Array.from(this.activeFilters.values());
    
    return Response.json({
      activeFilters,
      totalConnections: this.activeConnections.size,
      uptime: process.uptime()
    });
  }

  private async handleFilterHistory(req: Request): Promise<Response> {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20');
    
    return Response.json({
      history: this.filterHistory.slice(0, limit),
      total: this.filterHistory.length
    });
  }

  private async handlePackageList(req: Request): Promise<Response> {
    const packages = await discoverWorkspacePackages();
    
    return Response.json({
      packages: packages.map(pkg => ({
        name: pkg.name,
        path: pkg.path,
        version: pkg.version,
        scriptCount: Object.keys(pkg.scripts || {}).length,
        scripts: pkg.scripts
      }))
    });
  }

  private async handleScriptList(req: Request): Promise<Response> {
    const packages = await discoverWorkspacePackages();
    
    const allScripts = new Set<string>();
    packages.forEach(pkg => {
      if (pkg.scripts) {
        Object.keys(pkg.scripts).forEach(script => allScripts.add(script));
      }
    });

    return Response.json({
      scripts: Array.from(allScripts).sort(),
      count: allScripts.size
    });
  }

  private serveDashboard(): Response {
    const html = this.generateDashboardHTML();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Filter Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      .filter-card { @apply bg-white rounded-lg shadow-md p-6 mb-4; }
      .status-running { @apply bg-yellow-100 text-yellow-800; }
      .status-success { @apply bg-green-100 text-green-800; }
      .status-error { @apply bg-red-100 text-red-800; }
      .log-output { @apply font-mono text-sm bg-gray-100 p-2 rounded overflow-x-auto; }
      .package-result { @apply border-l-4 pl-4 py-2; }
      .package-success { @apply border-green-500 bg-green-50; }
      .package-error { @apply border-red-500 bg-red-50; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">🚀 Bun Filter Dashboard</h1>
            <p class="text-gray-600">Real-time workspace package filtering and execution</p>
        </header>

        <!-- Filter Controls -->
        <section class="filter-card">
            <h2 class="text-xl font-semibold mb-4">Execute Filter</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                    <input type="text" id="pattern" placeholder="ba*" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Script</label>
                    <select id="script" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="test">test</option>
                        <option value="build">build</option>
                        <option value="dev">dev</option>
                        <option value="lint">lint</option>
                        <option value="deploy">deploy</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Options</label>
                    <div class="space-y-1">
                        <label class="flex items-center">
                            <input type="checkbox" id="parallel" class="mr-2">
                            <span class="text-sm">Parallel</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="bail" class="mr-2">
                            <span class="text-sm">Bail on error</span>
                        </label>
                    </div>
                </div>
                <div class="flex items-end">
                    <button onclick="executeFilter()" 
                            class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                        Execute Filter
                    </button>
                </div>
            </div>
        </section>

        <!-- Active Filters -->
        <section class="filter-card">
            <h2 class="text-xl font-semibold mb-4">Active Filters</h2>
            <div id="active-filters" class="space-y-2">
                <p class="text-gray-500">No active filters</p>
            </div>
        </section>

        <!-- Filter Results -->
        <section class="filter-card">
            <h2 class="text-xl font-semibold mb-4">Latest Results</h2>
            <div id="filter-results" class="space-y-4">
                <p class="text-gray-500">No results yet</p>
            </div>
        </section>

        <!-- Statistics -->
        <section class="filter-card">
            <h2 class="text-xl font-semibold mb-4">Statistics</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600" id="total-filters">0</div>
                    <div class="text-sm text-gray-600">Total Filters</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600" id="success-rate">0%</div>
                    <div class="text-sm text-gray-600">Success Rate</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600" id="avg-duration">0ms</div>
                    <div class="text-sm text-gray-600">Avg Duration</div>
                </div>
            </div>
        </section>
    </div>

    <script>
        let ws;
        let filterHistory = [];
        let activeFilters = {};

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}/filter-ws\`);
            
            ws.onopen = () => {
                console.log('Connected to filter dashboard');
                updateStatus('Connected', 'success');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = () => {
                console.log('Disconnected from filter dashboard');
                updateStatus('Disconnected', 'error');
                setTimeout(connectWebSocket, 2000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                updateStatus('Error', 'error');
            };
        }

        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'filterStarted':
                    handleFilterStarted(data.request);
                    break;
                case 'filterProgress':
                    handleFilterProgress(data);
                    break;
                case 'packageResult':
                    handlePackageResult(data);
                    break;
                case 'filterCompleted':
                    handleFilterCompleted(data.summary);
                    break;
                case 'filterFailed':
                    handleFilterFailed(data);
                    break;
            }
        }

        function handleFilterStarted(request) {
            activeFilters[request.id] = {
                ...request,
                status: 'running',
                startTime: new Date()
            };
            updateActiveFilters();
        }

        function handleFilterProgress(data) {
            const filter = activeFilters[data.filterId];
            if (filter) {
                filter.stage = data.stage;
                filter.message = data.message;
                updateActiveFilters();
            }
        }

        function handlePackageResult(data) {
            const resultsDiv = document.getElementById('filter-results');
            const resultDiv = document.createElement('div');
            resultDiv.className = \`package-result \${data.result.exitCode === 0 ? 'package-success' : 'package-error'}\`;
            resultDiv.innerHTML = \`
                <div class="flex justify-between items-center">
                    <span class="font-medium">\${data.result.name}</span>
                    <span class="text-sm text-gray-600">\${data.result.durationMs.toFixed(0)}ms</span>
                </div>
                \${data.result.stdout ? \`<div class="log-output mt-2">\${data.result.stdout}</div>\` : ''}
                \${data.result.stderr ? \`<div class="log-output mt-2 text-red-700">\${data.result.stderr}</div>\` : ''}
            \`;
            resultsDiv.appendChild(resultDiv);
            resultsDiv.scrollTop = resultsDiv.scrollHeight;
        }

        function handleFilterCompleted(summary) {
            delete activeFilters[summary.filterId];
            filterHistory.unshift(summary);
            if (filterHistory.length > 10) filterHistory = filterHistory.slice(0, 10);
            
            updateActiveFilters();
            updateStatistics();
        }

        function handleFilterFailed(data) {
            delete activeFilters[data.filterId];
            updateActiveFilters();
            
            const resultsDiv = document.getElementById('filter-results');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-2';
            errorDiv.innerHTML = \`
                <strong>Filter Failed:</strong> \${data.error}
            \`;
            resultsDiv.appendChild(errorDiv);
        }

        function updateActiveFilters() {
            const container = document.getElementById('active-filters');
            const filters = Object.values(activeFilters);
            
            if (filters.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No active filters</p>';
                return;
            }
            
            container.innerHTML = filters.map(filter => \`
                <div class="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div>
                        <span class="font-medium">\${filter.pattern}</span>
                        <span class="text-gray-600"> → \${filter.script}</span>
                        \${filter.message ? \`<span class="text-sm text-gray-500 ml-2">\${filter.message}</span>\` : ''}
                    </div>
                    <span class="status-running px-2 py-1 rounded text-xs font-medium">
                        \${filter.stage || 'Running'}
                    </span>
                </div>
            \`).join('');
        }

        function updateStatistics() {
            const totalFilters = filterHistory.length;
            const successfulFilters = filterHistory.filter(f => f.failedPackages === 0).length;
            const successRate = totalFilters > 0 ? (successfulFilters / totalFilters * 100).toFixed(1) : 0;
            const avgDuration = totalFilters > 0 
                ? (filterHistory.reduce((sum, f) => sum + f.totalDurationMs, 0) / totalFilters).toFixed(0)
                : 0;
            
            document.getElementById('total-filters').textContent = totalFilters;
            document.getElementById('success-rate').textContent = successRate + '%';
            document.getElementById('avg-duration').textContent = avgDuration + 'ms';
        }

        async function executeFilter() {
            const pattern = document.getElementById('pattern').value;
            const script = document.getElementById('script').value;
            const parallel = document.getElementById('parallel').checked;
            const bail = document.getElementById('bail').checked;
            
            if (!pattern) {
                alert('Please enter a filter pattern');
                return;
            }
            
            const params = new URLSearchParams({
                pattern,
                script,
                ...(parallel && { parallel: 'true' }),
                ...(bail && { bail: 'true' })
            });
            
            try {
                const response = await fetch(\`/filter-run?\${params}\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
            } catch (error) {
                alert('Filter execution failed: ' + error.message);
            }
        }

        function updateStatus(message, type) {
            // Could add a status indicator to the UI
            console.log('Status:', message, type);
        }

        // Initialize
        connectWebSocket();
        
        // Load initial data
        fetch('/api/scripts').then(res => res.json()).then(data => {
            const scriptSelect = document.getElementById('script');
            data.scripts.forEach(script => {
                const option = document.createElement('option');
                option.value = script;
                option.textContent = script;
                scriptSelect.appendChild(option);
            });
        });
    </script>
</body>
</html>`;
  }

  // WebSocket handlers
  private handleWebSocketOpen(ws: WebSocket) {
    const id = this.generateConnectionId();
    this.activeConnections.set(id, { id, ws });
    
    console.log(c.cyan(`📡 WebSocket connection opened: ${id}`));
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());
      // Handle client messages if needed
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  }

  private handleWebSocketClose(ws: WebSocket) {
    for (const [id, connection] of this.activeConnections) {
      if (connection.ws === ws) {
        this.activeConnections.delete(id);
        console.log(c.yellow(`📡 WebSocket connection closed: ${id}`));
        break;
      }
    }
  }

  private handleWebSocketError(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error);
  }

  private broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    
    for (const connection of this.activeConnections.values()) {
      try {
        connection.ws.send(messageStr);
      } catch (error) {
        console.error('Failed to send message to connection:', connection.id, error);
      }
    }
  }

  private generateFilterId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public close(): void {
    this.server.stop();
    console.log(c.yellow('🛑 Filter dashboard stopped'));
  }
}

// Start dashboard if run directly
if (import.meta.main) {
  const port = parseInt(process.argv[2]) || 3001;
  const dashboard = new FilterDashboard(port);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\nShutting down dashboard...');
    dashboard.close();
    process.exit(0);
  });
}

export default FilterDashboard;
