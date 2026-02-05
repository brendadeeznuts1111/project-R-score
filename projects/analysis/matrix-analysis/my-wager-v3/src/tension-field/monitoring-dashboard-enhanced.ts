#!/usr/bin/env bun
// Enhanced Monitoring Dashboard with Real-time Visualization
// [TENSION-DASHBOARD-001] [TENSION-REALTIME-002] [TENSION-VISUAL-003]
// [TENSION-VOLUME-001] [TENSION-LINK-002] [TENSION-PROFILE-003]
// [GOV-SECURITY-001] [GOV-COMPLIANCE-002]

import { Database } from 'bun:sqlite';
import { EnhancedHistoricalAnalyzer } from './historical-analyzer-enhanced';
import { TensionGraphPropagator } from './propagate';
import { ServerWebSocket } from 'bun';
import { errorHandler, TensionErrorCode, BunErrorUtils } from './error-handler';

interface DashboardClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastActivity: number;
}

interface RealtimeMetrics {
  timestamp: number;
  activeNodes: number;
  totalTension: number;
  anomalyCount: number;
  riskScore: number;
  throughput: number;
  latency: number;
}

class EnhancedMonitoringDashboard {
  private server: any;
  private clients: Map<string, DashboardClient> = new Map();
  private analyzer: EnhancedHistoricalAnalyzer;
  private propagator: TensionGraphPropagator;
  private db: Database;
  private metrics: RealtimeMetrics[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private wsToClientMap: Map<ServerWebSocket<undefined>, DashboardClient> = new Map();

  constructor(port: number = 3001) {
    // Create WebSocket server using Bun's native WebSocket
    this.server = Bun.serve({
      port,
      development: process.env.NODE_ENV !== "production",
      fetch: this.handleHttpRequest.bind(this),
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: this.handleWebSocketOpen.bind(this),
        close: this.handleWebSocketClose.bind(this),
      },
      error(error) {
        console.error("[monitoring-dashboard] Unhandled error:", error);
        const msg = Bun.escapeHTML(error.message);
        const stack = Bun.escapeHTML(error.stack ?? "");
        return new Response(
          `<!DOCTYPE html><html><head><title>Monitoring Error</title></head><body style="font-family:monospace;background:#0d1117;color:#c9d1d9;padding:2rem"><h1 style="color:#f85149">Monitoring Dashboard Error</h1><pre style="background:#161b22;padding:1rem;border-radius:8px;overflow:auto">${msg}\n\n${stack}</pre></body></html>`,
          { status: 500, headers: { "Content-Type": "text/html" } }
        );
      },
    });

    this.analyzer = new EnhancedHistoricalAnalyzer();
    this.propagator = new TensionGraphPropagator();
    this.db = new Database('./monitoring-enhanced.db');
    this.initializeDatabase();
    this.startRealtimeUpdates();

    console.log(`🚀 Enhanced Monitoring Dashboard running on port ${port}`);
  }

  private initializeDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS realtime_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        active_nodes INTEGER,
        total_tension REAL,
        anomaly_count INTEGER,
        risk_score REAL,
        throughput REAL,
        latency REAL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        node_id TEXT,
        acknowledged BOOLEAN DEFAULT FALSE
      )
    `);
  }

  private async handleHttpRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Serve dashboard HTML
    if (url.pathname === '/') {
      return new Response(this.getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiRequest(url, req);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleApiRequest(url: URL, req: Request): Promise<Response> {
    const path = url.pathname.replace('/api/', '');

    switch (path) {
      case 'metrics':
        const metrics = this.getLatestMetrics();
        return Response.json(metrics);

      case 'predictions':
        const nodeId = url.searchParams.get('node') || 'node-0';
        const prediction = await this.analyzer.predictNextTension(nodeId);
        return Response.json(prediction);

      case 'risk':
        const riskNode = url.searchParams.get('node') || 'node-0';
        const risk = await this.analyzer.assessRisk(riskNode);
        return Response.json(risk);

      case 'alerts':
        const alerts = this.getAlerts();
        return Response.json(alerts);

      case 'correlations':
        const points = this.analyzer['getRecentPoints'](100);
        const correlations = this.analyzer.calculateCorrelations(points);
        return Response.json(correlations);

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
    }
  }

  private handleWebSocketMessage(ws: ServerWebSocket<undefined>, message: string | Buffer<ArrayBuffer>): void {
    try {
      const data = JSON.parse(message.toString());
      const client = this.getClientByWebSocket(ws);
      if (client) {
        this.handleClientMessage(client, data);
      }
    } catch (e) {
      console.error('Invalid message from client:', e);
    }
  }

  private handleWebSocketOpen(ws: ServerWebSocket<undefined>): void {
    const clientId = this.generateClientId();
    const client: DashboardClient = {
      id: clientId,
      ws: ws as any, // Type assertion for compatibility
      subscriptions: new Set(),
      lastActivity: Date.now()
    };

    this.clients.set(clientId, client);
    this.wsToClientMap.set(ws, client);

    console.log(`📡 Client connected: ${clientId}`);

    // Send initial data
    this.sendToClient(client, {
      type: 'connected',
      clientId,
      timestamp: Date.now()
    });
  }

  private handleWebSocketClose(ws: ServerWebSocket<undefined>, code: number, reason: string): void {
    const client = this.getClientByWebSocket(ws);
    if (client) {
      this.clients.delete(client.id);
      this.wsToClientMap.delete(ws);
      console.log(`📡 Client disconnected: ${client.id}`);
    }
  }

  private getClientByWebSocket(ws: ServerWebSocket<undefined>): DashboardClient | undefined {
    return this.wsToClientMap.get(ws);
  }

  private async handleClientMessage(client: DashboardClient, data: any): Promise<void> {
    client.lastActivity = Date.now();

    switch (data.type) {
      case 'subscribe':
        data.channels?.forEach((channel: string) => {
          client.subscriptions.add(channel);
        });
        break;

      case 'unsubscribe':
        data.channels?.forEach((channel: string) => {
          client.subscriptions.delete(channel);
        });
        break;

      case 'runPropagation':
        // Use the propagateFullGraph method with demo data
        await BunErrorUtils.createTimedError(
          TensionErrorCode.PROPAGATION_FAILED,
          async () => {
            // Add some demo nodes first
            for (let i = 0; i < 10; i++) {
              (this.propagator as any).addNode({
                id: `node-${i}`,
                tension: Math.random() * 100,
                velocity: 0,
                lastUpdate: Date.now(),
              });
            }

            const result = await this.propagator.propagateFullGraph('demo');

            this.broadcast({
              type: 'propagationResult',
              data: result,
              timestamp: Date.now()
            }, 'propagation');
          },
          {
            operation: 'dashboardPropagation',
            clientId: client.id
          }
        ).catch(async (error) => {
          await errorHandler.handleError(error, {
            component: 'monitoring-dashboard',
            clientId: client.id,
            action: 'runPropagation'
          });

          this.broadcast({
            type: 'propagationError',
            error: error.message,
            code: error.code,
            timestamp: Date.now()
          }, 'propagation');
        });
        break;

      case 'acknowledgeAlert':
        this.acknowledgeAlert(data.alertId);
        break;
    }
  }

  private startRealtimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.broadcastUpdates();
    }, 1000); // Update every second
  }

  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    // Simulate metrics collection
    const metrics: RealtimeMetrics = {
      timestamp,
      activeNodes: Math.floor(Math.random() * 50) + 10,
      totalTension: Math.random() * 100,
      anomalyCount: Math.floor(Math.random() * 5),
      riskScore: Math.random(),
      throughput: Math.random() * 1000,
      latency: Math.random() * 100
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Store in database
    this.db.run(`
      INSERT INTO realtime_metrics
      (timestamp, active_nodes, total_tension, anomaly_count, risk_score, throughput, latency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      metrics.timestamp,
      metrics.activeNodes,
      metrics.totalTension,
      metrics.anomalyCount,
      metrics.riskScore,
      metrics.throughput,
      metrics.latency
    ]);
  }

  private checkAlerts(): void {
    const latest = this.metrics[this.metrics.length - 1];

    if (!latest) return;

    // Check for alert conditions
    if (latest.riskScore > 0.8) {
      this.createAlert('HIGH', 'Risk score exceeded threshold', null);
    }

    if (latest.anomalyCount > 3) {
      this.createAlert('MEDIUM', 'Multiple anomalies detected', null);
    }

    if (latest.latency > 50) {
      this.createAlert('LOW', 'High latency detected', null);
    }
  }

  private createAlert(severity: 'LOW' | 'MEDIUM' | 'HIGH', message: string, nodeId: string | null): void {
    this.db.run(`
      INSERT INTO alerts (timestamp, severity, message, node_id)
      VALUES (?, ?, ?, ?)
    `, [Date.now(), severity, message, nodeId]);

    this.broadcast({
      type: 'alert',
      data: { severity, message, nodeId, timestamp: Date.now() },
      timestamp: Date.now()
    }, 'alerts');
  }

  private acknowledgeAlert(alertId: number): void {
    this.db.run(`
      UPDATE alerts SET acknowledged = TRUE WHERE id = ?
    `, [alertId]);
  }

  private broadcastUpdates(): void {
    const latest = this.metrics[this.metrics.length - 1];

    if (latest) {
      this.broadcast({
        type: 'metrics',
        data: latest,
        timestamp: Date.now()
      }, 'metrics');
    }
  }

  private broadcast(message: any, channel?: string): void {
    const payload = JSON.stringify(message);

    this.clients.forEach(client => {
      if (!channel || client.subscriptions.has(channel)) {
        try {
          client.ws.send(payload);
        } catch (e) {
          // Client disconnected, remove
          this.clients.delete(client.id);
        }
      }
    });
  }

  private sendToClient(client: DashboardClient, message: any): void {
    try {
      client.ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Failed to send to client:', e);
    }
  }

  private getLatestMetrics(): RealtimeMetrics[] {
    return this.metrics.slice(-60); // Last minute
  }

  private getAlerts(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM alerts
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    return stmt.all();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Tension Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a; color: #e2e8f0;
        }
        .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; }
        .card {
            background: #1e293b; border-radius: 0.5rem; padding: 1rem;
            border: 1px solid #334155;
        }
        .card h2 { margin-bottom: 1rem; color: #3b82f6; }
        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .metric { text-align: center; }
        .metric .value { font-size: 2rem; font-weight: bold; }
        .metric .label { font-size: 0.875rem; color: #94a3b8; }
        .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.25rem; }
        .status.high { background: #dc2626; }
        .status.medium { background: #f59e0b; }
        .status.low { background: #10b981; }
        .alert { padding: 0.5rem; margin: 0.5rem 0; border-radius: 0.25rem; }
        .alert.high { background: #dc262620; border-left: 4px solid #dc2626; }
        .alert.medium { background: #f59e0b20; border-left: 4px solid #f59e0b; }
        .alert.low { background: #10b98120; border-left: 4px solid #10b981; }
        canvas { max-height: 300px; }
        .connected { color: #10b981; }
        .disconnected { color: #dc2626; }
    </style>
</head>
<body>
    <h1>Enhanced Tension Monitoring Dashboard</h1>
    <p>Status: <span id="status" class="status disconnected">Disconnected</span></p>

    <div class="dashboard">
        <div class="card" style="grid-column: span 2;">
            <h2>Real-time Metrics</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="value" id="activeNodes">0</div>
                    <div class="label">Active Nodes</div>
                </div>
                <div class="metric">
                    <div class="value" id="totalTension">0</div>
                    <div class="label">Total Tension</div>
                </div>
                <div class="metric">
                    <div class="value" id="anomalyCount">0</div>
                    <div class="label">Anomalies</div>
                </div>
                <div class="metric">
                    <div class="value" id="riskScore">0%</div>
                    <div class="label">Risk Score</div>
                </div>
                <div class="metric">
                    <div class="value" id="throughput">0</div>
                    <div class="label">Throughput/s</div>
                </div>
                <div class="metric">
                    <div class="value" id="latency">0ms</div>
                    <div class="label">Latency</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Tension Chart</h2>
            <canvas id="tensionChart"></canvas>
        </div>

        <div class="card">
            <h2>Risk Assessment</h2>
            <canvas id="riskChart"></canvas>
        </div>

        <div class="card">
            <h2>Alerts</h2>
            <div id="alerts"></div>
        </div>

        <div class="card">
            <h2>Predictions</h2>
            <canvas id="predictionChart"></canvas>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:3001');
        const tensionChart = new Chart(document.getElementById('tensionChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Tension', data: [], borderColor: '#3b82f6' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        const riskChart = new Chart(document.getElementById('riskChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Risk', data: [], borderColor: '#ef4444' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        const predictionChart = new Chart(document.getElementById('predictionChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Predicted', data: [], borderColor: '#10b981' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        ws.onopen = () => {
            document.getElementById('status').textContent = 'Connected';
            document.getElementById('status').className = 'status connected';
            ws.send(JSON.stringify({ type: 'subscribe', channels: ['metrics', 'alerts', 'propagation'] }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'metrics':
                    updateMetrics(data.data);
                    updateCharts(data.data);
                    break;
                case 'alert':
                    addAlert(data.data);
                    break;
                case 'propagationResult':
                    console.log('Propagation result:', data.data);
                    break;
            }
        };

        function updateMetrics(metrics) {
            document.getElementById('activeNodes').textContent = metrics.activeNodes;
            document.getElementById('totalTension').textContent = metrics.totalTension.toFixed(2);
            document.getElementById('anomalyCount').textContent = metrics.anomalyCount;
            document.getElementById('riskScore').textContent = (metrics.riskScore * 100).toFixed(1) + '%';
            document.getElementById('throughput').textContent = metrics.throughput.toFixed(0);
            document.getElementById('latency').textContent = metrics.latency.toFixed(1) + 'ms';
        }

        function updateCharts(metrics) {
            const time = new Date(metrics.timestamp).toLocaleTimeString();

            // Update tension chart
            tensionChart.data.labels.push(time);
            tensionChart.data.datasets[0].data.push(metrics.totalTension);
            if (tensionChart.data.labels.length > 20) {
                tensionChart.data.labels.shift();
                tensionChart.data.datasets[0].data.shift();
            }
            tensionChart.update('none');

            // Update risk chart
            riskChart.data.labels.push(time);
            riskChart.data.datasets[0].data.push(metrics.riskScore);
            if (riskChart.data.labels.length > 20) {
                riskChart.data.labels.shift();
                riskChart.data.datasets[0].data.shift();
            }
            riskChart.update('none');
        }

        function addAlert(alert) {
            const alertsDiv = document.getElementById('alerts');
            const alertEl = document.createElement('div');
            alertEl.className = \`alert \${alert.severity.toLowerCase()}\`;
            alertEl.innerHTML = \`
                <strong>\${alert.severity}:</strong> \${alert.message}
                <small>\${new Date(alert.timestamp).toLocaleTimeString()}</small>
            \`;
            alertsDiv.insertBefore(alertEl, alertsDiv.firstChild);

            // Keep only last 10 alerts
            while (alertsDiv.children.length > 10) {
                alertsDiv.removeChild(alertDiv.lastChild);
            }
        }
    </script>
</body>
</html>`;
  }
}

// Start the enhanced dashboard
if (import.meta.main) {
  const dashboard = new EnhancedMonitoringDashboard(parseInt(process.env.PORT || '3001'));
}

export { EnhancedMonitoringDashboard };
