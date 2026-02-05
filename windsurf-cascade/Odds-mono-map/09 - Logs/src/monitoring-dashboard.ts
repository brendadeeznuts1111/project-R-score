#!/usr/bin/env bun
/**
 * Real-time Monitoring Dashboard for Enhanced Logging System
 * 
 * Features:
 * - Live log streaming
 * - Interactive charts and metrics
 * - Alert management
 * - Pattern detection visualization
 * - Performance monitoring
 */

import { analytics, LogMetrics, Alert, PatternMatch } from './log-analytics';
import { logger, LogLevel } from './enhanced-logger';

export interface DashboardConfig {
    port: number;
    refreshInterval: number;
    maxLogEntries: number;
    enableWebSocket: boolean;
    enableAuth: boolean;
    apiKey?: string;
}

export interface DashboardData {
    metrics: LogMetrics;
    recentLogs: Array<{
        timestamp: string;
        level: string;
        message: string;
        category: string;
        duration?: number;
    }>;
    alerts: Alert[];
    patterns: PatternMatch[];
    systemInfo: {
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        logStats: any;
    };
}

export class MonitoringDashboard {
    private config: DashboardConfig;
    private server?: any;
    private clients: Set<any> = new Set();
    private updateTimer?: NodeJS.Timeout;

    constructor(config: Partial<DashboardConfig> = {}) {
        this.config = {
            port: 3001,
            refreshInterval: 5000,
            maxLogEntries: 100,
            enableWebSocket: true,
            enableAuth: false,
            ...config
        };
    }

    /**
     * Start the monitoring dashboard server
     */
    async start(): Promise<void> {
        try {
            await logger.info('Starting monitoring dashboard', { port: this.config.port });

            // Create simple HTTP server using Bun
            const server = Bun.serve({
                port: this.config.port,
                fetch: this.handleRequest.bind(this),
                websocket: this.config.enableWebSocket ? {
                    message: this.handleWebSocketMessage.bind(this),
                    open: this.handleWebSocketOpen.bind(this),
                    close: this.handleWebSocketClose.bind(this),
                } : undefined
            });

            this.server = server;
            this.startRealTimeUpdates();

            await logger.info('Monitoring dashboard started', {
                url: `http://localhost:${this.config.port}`,
                websocket: this.config.enableWebSocket
            });
        } catch (error) {
            await logger.error('Failed to start monitoring dashboard', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Stop the monitoring dashboard
     */
    async stop(): Promise<void> {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        if (this.server) {
            this.server.stop();
        }

        await logger.info('Monitoring dashboard stopped');
    }

    /**
     * Handle HTTP requests
     */
    private async handleRequest(request: Request): Promise<Response> {
        const url = new URL(request.url);

        try {
            // CORS headers
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            };

            if (request.method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            switch (url.pathname) {
                case '/':
                    return this.serveDashboardHTML();

                case '/api/metrics':
                    return this.serveMetrics();

                case '/api/logs':
                    return this.serveRecentLogs(url.searchParams);

                case '/api/alerts':
                    return this.serveAlerts();

                case '/api/patterns':
                    return this.servePatterns();

                case '/api/search':
                    return this.handleSearch(request);

                case '/api/alerts/resolve':
                    if (request.method === 'POST') {
                        return this.handleResolveAlert(request);
                    }
                    break;

                default:
                    if (url.pathname.startsWith('/static/')) {
                        return this.serveStaticFile(url.pathname);
                    }
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            await logger.error('Dashboard request error', {
                url: url.pathname,
                error: error instanceof Error ? error.message : String(error)
            });
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    /**
     * Serve the main dashboard HTML
     */
    private async serveDashboardHTML(): Promise<Response> {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vault Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a; color: #fff; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px; border-radius: 10px; margin-bottom: 30px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .header h1 { font-size: 2em; font-weight: 300; }
        .status-indicator { 
            display: flex; align-items: center; gap: 10px;
            background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 20px;
        }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; }
        .grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .card { 
            background: #2a2a2a; border-radius: 10px; padding: 20px;
            border: 1px solid #3a3a3a; transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-2px); }
        .card h3 { margin-bottom: 15px; color: #a78bfa; }
        .metric { 
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 10px;
        }
        .metric-value { font-size: 1.5em; font-weight: bold; }
        .metric-label { color: #9ca3af; }
        .alert { 
            padding: 10px; border-radius: 5px; margin-bottom: 10px;
            border-left: 4px solid;
        }
        .alert.critical { border-color: #ef4444; background: rgba(239,68,68,0.1); }
        .alert.high { border-color: #f59e0b; background: rgba(245,158,11,0.1); }
        .alert.medium { border-color: #eab308; background: rgba(234,179,8,0.1); }
        .alert.low { border-color: #22c55e; background: rgba(34,197,94,0.1); }
        .log-entry { 
            padding: 8px; border-bottom: 1px solid #3a3a3a; font-family: monospace;
            font-size: 0.9em; display: flex; align-items: center; gap: 10px;
        }
        .log-level { 
            padding: 2px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold;
        }
        .log-level.DEBUG { background: #06b6d4; }
        .log-level.INFO { background: #10b981; }
        .log-level.WARN { background: #f59e0b; }
        .log-level.ERROR { background: #ef4444; }
        .log-level.CRITICAL { background: #a855f7; }
        .chart-container { position: relative; height: 300px; margin-top: 20px; }
        .refresh-btn {
            background: #667eea; color: white; border: none; padding: 10px 20px;
            border-radius: 5px; cursor: pointer; font-size: 14px;
            transition: background 0.2s;
        }
        .refresh-btn:hover { background: #5a67d8; }
        .search-box {
            width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #3a3a3a;
            background: #1a1a1a; color: white; margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Vault Monitoring Dashboard</h1>
            <div class="status-indicator">
                <div class="status-dot"></div>
                <span>Live Monitoring</span>
                <button class="refresh-btn" onclick="refreshData()">Refresh</button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 System Metrics</h3>
                <div class="metric">
                    <span class="metric-label">Total Logs</span>
                    <span class="metric-value" id="total-logs">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value" id="error-rate">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Response Time</span>
                    <span class="metric-value" id="response-time">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value" id="uptime">-</span>
                </div>
            </div>

            <div class="card">
                <h3>🚨 Active Alerts</h3>
                <div id="alerts-container">
                    <p style="color: #9ca3af;">Loading alerts...</p>
                </div>
            </div>

            <div class="card">
                <h3>🔍 Error Patterns</h3>
                <div id="patterns-container">
                    <p style="color: #9ca3af;">Analyzing patterns...</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📈 Error Trends</h3>
            <div class="chart-container">
                <canvas id="errorChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h3>📋 Recent Logs</h3>
            <input type="text" class="search-box" placeholder="Search logs..." onkeyup="searchLogs(this.value)">
            <div id="logs-container">
                <p style="color: #9ca3af;">Loading logs...</p>
            </div>
        </div>
    </div>

    <script>
        let errorChart = null;

        async function refreshData() {
            try {
                const [metrics, alerts, patterns, logs] = await Promise.all([
                    fetch('/api/metrics').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json()),
                    fetch('/api/patterns').then(r => r.json()),
                    fetch('/api/logs').then(r => r.json())
                ]);

                updateMetrics(metrics);
                updateAlerts(alerts);
                updatePatterns(patterns);
                updateLogs(logs);
                updateErrorChart();
            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        }

        function updateMetrics(metrics) {
            document.getElementById('total-logs').textContent = metrics.total.toLocaleString();
            document.getElementById('error-rate').textContent = metrics.errorRate.toFixed(2) + '%';
            document.getElementById('response-time').textContent = Math.round(metrics.averageResponseTime) + 'ms';
            document.getElementById('uptime').textContent = formatUptime(metrics.systemInfo.uptime);
        }

        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            if (alerts.length === 0) {
                container.innerHTML = '<p style="color: #9ca3af;">No active alerts</p>';
                return;
            }

            container.innerHTML = alerts.map(alert => \`
                <div class="alert \${alert.severity}">
                    <strong>\${alert.type.replace('_', ' ').toUpperCase()}</strong><br>
                    \${alert.message}<br>
                    <small>\${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
            \`).join('');
        }

        function updatePatterns(patterns) {
            const container = document.getElementById('patterns-container');
            if (patterns.length === 0) {
                container.innerHTML = '<p style="color: #9ca3af;">No patterns detected</p>';
                return;
            }

            container.innerHTML = patterns.slice(0, 5).map(pattern => \`
                <div style="margin-bottom: 10px; padding: 10px; background: #1a1a1a; border-radius: 5px;">
                    <strong>\${pattern.count} occurrences</strong><br>
                    <small style="color: #9ca3af;">\${pattern.pattern.substring(0, 100)}...</small>
                </div>
            \`).join('');
        }

        function updateLogs(logs) {
            const container = document.getElementById('logs-container');
            if (logs.length === 0) {
                container.innerHTML = '<p style="color: #9ca3af;">No logs found</p>';
                return;
            }

            container.innerHTML = logs.map(log => \`
                <div class="log-entry">
                    <span class="log-level \${log.level}">\${log.level}</span>
                    <span style="flex: 1;">\${log.message}</span>
                    <span style="color: #9ca3af; font-size: 0.8em;">
                        \${new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                </div>
            \`).join('');
        }

        async function updateErrorChart() {
            try {
                const response = await fetch('/api/trends');
                const data = await response.json();
                
                const ctx = document.getElementById('errorChart').getContext('2d');
                
                if (errorChart) {
                    errorChart.destroy();
                }

                errorChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.timestamps.map(t => new Date(t).toLocaleTimeString()),
                        datasets: [{
                            label: 'Errors',
                            data: data.errorCounts,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4
                        }, {
                            label: 'Warnings',
                            data: data.warningCounts,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { color: '#fff' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#9ca3af' },
                                grid: { color: '#3a3a3a' }
                            },
                            x: {
                                ticks: { color: '#9ca3af' },
                                grid: { color: '#3a3a3a' }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to update error chart:', error);
            }
        }

        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return \`\${hours}h \${minutes}m\`;
        }

        async function searchLogs(query) {
            try {
                const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                const logs = await response.json();
                updateLogs(logs);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }

        // Initialize dashboard
        refreshData();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
    </script>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    /**
     * Serve current metrics
     */
    private async serveMetrics(): Promise<Response> {
        try {
            const metrics = await analytics.getRealTimeMetrics();
            const systemInfo = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                logStats: logger.getStats()
            };

            const data = {
                ...metrics,
                systemInfo
            };

            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Serve recent logs
     */
    private async serveRecentLogs(params: URLSearchParams): Promise<Response> {
        try {
            const limit = parseInt(params.get('limit') || '100');
            const level = params.get('level') ? parseInt(params.get('level')!) : undefined;

            const logs = await analytics.search({
                level,
                limit
            });

            const formattedLogs = logs.map(log => ({
                timestamp: log.timestamp,
                level: LogLevel[log.level],
                message: log.message,
                category: log.category,
                duration: log.duration
            }));

            return new Response(JSON.stringify(formattedLogs), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch logs' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Serve active alerts
     */
    private async serveAlerts(): Promise<Response> {
        try {
            const alerts = analytics.getAlerts();
            return new Response(JSON.stringify(alerts), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Serve detected patterns
     */
    private async servePatterns(): Promise<Response> {
        try {
            const patterns = analytics.getPatterns();
            return new Response(JSON.stringify(patterns), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch patterns' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Handle search requests
     */
    private async handleSearch(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const query = url.searchParams.get('q') || '';

            const logs = await analytics.search({
                message: query,
                limit: 100
            });

            const formattedLogs = logs.map(log => ({
                timestamp: log.timestamp,
                level: LogLevel[log.level],
                message: log.message,
                category: log.category,
                duration: log.duration
            }));

            return new Response(JSON.stringify(formattedLogs), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Search failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Handle alert resolution
     */
    private async handleResolveAlert(request: Request): Promise<Response> {
        try {
            const body = await request.json();
            await analytics.resolveAlert(body.alertId);

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to resolve alert' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Serve static files
     */
    private async serveStaticFile(path: string): Promise<Response> {
        // For now, return 404 for static files
        // In production, you'd serve actual CSS/JS files
        return new Response('Not Found', { status: 404 });
    }

    /**
     * WebSocket handlers
     */
    private handleWebSocketMessage(ws: any, message: string | Buffer): void {
        // Handle WebSocket messages
    }

    private handleWebSocketOpen(ws: any): void {
        this.clients.add(ws);
    }

    private handleWebSocketClose(ws: any): void {
        this.clients.delete(ws);
    }

    /**
     * Start real-time updates
     */
    private startRealTimeUpdates(): void {
        this.updateTimer = setInterval(async () => {
            try {
                const metrics = await analytics.getRealTimeMetrics();
                const data = JSON.stringify(metrics);

                // Send updates to all connected WebSocket clients
                this.clients.forEach(client => {
                    try {
                        client.send(data);
                    } catch {
                        // Remove dead clients
                        this.clients.delete(client);
                    }
                });
            } catch (error) {
                await logger.error('Real-time update failed', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }, this.config.refreshInterval);
    }
}

// Export singleton instance
export const dashboard = new MonitoringDashboard();
