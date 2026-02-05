#!/usr/bin/env bun
// WebSocket Live Monitoring Dashboard
import { WebSocketServer } from 'ws';
import { TensionVisualizer } from './visualizer.js';
import { AdvancedAnomalyDetector } from './anomaly-detector.js';
import { TensionPredictionEngine } from './prediction-engine.js';
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";
import {
  METRICS_COLLECTION_INTERVAL_MS,
  BROADCAST_INTERVAL_MS,
  CLIENT_INACTIVE_TIMEOUT_MS,
  PORT_MCP_DEFAULT,
  PORT_VISUALIZER,
  RECENT_METRICS_SNAPSHOT_SIZE,
} from "./constants";

interface DashboardClient {
  ws: any;
  id: string;
  subscriptions: Set<string>;
  lastActivity: number;
}

interface MonitoringMetrics {
  timestamp: number;
  tensions: {
    volume: number;
    link: number;
    profile: number;
    security: number;
    compliance: number;
  };
  anomalies: any[];
  predictions: any[];
  systemHealth: {
    cpu: number;
    memory: number;
    latency: number;
  };
}

export class LiveMonitoringDashboard {
  private wss: WebSocketServer;
  private clients: Map<string, DashboardClient> = new Map();
  private visualizer: TensionVisualizer;
  private anomalyDetector: AdvancedAnomalyDetector;
  private predictionEngine: TensionPredictionEngine;
  private metrics: MonitoringMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  constructor(port: number = PORT_MCP_DEFAULT) {
    this.wss = new WebSocketServer({ port });
    this.visualizer = new TensionVisualizer(PORT_VISUALIZER);
    this.anomalyDetector = new AdvancedAnomalyDetector();
    this.predictionEngine = new TensionPredictionEngine();

    this.initializeWebSocketServer();
    this.startMetricsCollection();
    this.startBroadcastLoop();
  }

  private initializeWebSocketServer(): void {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client: DashboardClient = {
        ws,
        id: clientId,
        subscriptions: new Set(['metrics', 'anomalies', 'predictions']),
        lastActivity: Date.now()
      };

      this.clients.set(clientId, client);
      console.log(`🔌 Dashboard client connected: ${clientId}`);

      // Send initial data
      this.sendInitialData(client);

      ws.on('message', (data) => {
        this.handleClientMessage(client, data);
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 Dashboard client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for client ${clientId}:`, err);
        this.clients.delete(clientId);
      });
    });

    console.log(`📊 Live monitoring dashboard running on ws://localhost:${this.wss.options.port}`);
  }

  private generateClientId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private sendInitialData(client: DashboardClient): void {
    // Send recent metrics
    if (this.metrics.length > 0) {
      client.ws.send(JSON.stringify({
        type: 'initial-metrics',
        data: this.metrics.slice(-RECENT_METRICS_SNAPSHOT_SIZE)
      }));
    }

    // Send model status
    client.ws.send(JSON.stringify({
      type: 'model-status',
      data: this.predictionEngine.getModelStatus()
    }));

    // Send subscription confirmation
    client.ws.send(JSON.stringify({
      type: 'subscriptions-confirmed',
      data: Array.from(client.subscriptions)
    }));
  }

  private handleClientMessage(client: DashboardClient, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      client.lastActivity = Date.now();

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(client, message.channels);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(client, message.channels);
          break;
        case 'get-predictions':
          this.sendPredictions(client, message.currentTensions);
          break;
        case 'train-models':
          this.trainModels(client);
          break;
        case 'export-data':
          this.exportData(client, message.format);
          break;
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('Error handling client message:', err);
    }
  }

  private handleSubscription(client: DashboardClient, channels: string[]): void {
    channels.forEach(channel => {
      client.subscriptions.add(channel);
    });

    client.ws.send(JSON.stringify({
      type: 'subscriptions-updated',
      data: Array.from(client.subscriptions)
    }));
  }

  private handleUnsubscription(client: DashboardClient, channels: string[]): void {
    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    client.ws.send(JSON.stringify({
      type: 'subscriptions-updated',
      data: Array.from(client.subscriptions)
    }));
  }

  private async sendPredictions(client: DashboardClient, currentTensions: number[]): Promise<void> {
    try {
      const predictions = this.predictionEngine.predict(currentTensions);
      client.ws.send(JSON.stringify({
        type: 'predictions',
        data: predictions
      }));
    } catch (err) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to generate predictions'
      }));
    }
  }

  private async trainModels(client: DashboardClient): Promise<void> {
    try {
      client.ws.send(JSON.stringify({
        type: 'training-started'
      }));

      await this.predictionEngine.trainModels();

      client.ws.send(JSON.stringify({
        type: 'training-complete',
        data: this.predictionEngine.getModelStatus()
      }));
    } catch (err) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Training failed'
      }));
    }
  }

  private exportData(client: DashboardClient, format: string): void {
    const data = {
      metrics: this.metrics,
      modelStatus: this.predictionEngine.getModelStatus(),
      exportTime: new Date().toISOString()
    };

    if (format === 'json') {
      client.ws.send(JSON.stringify({
        type: 'export-data',
        format: 'json',
        data: JSON.stringify(data, null, 2)
      }));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(this.metrics);
      client.ws.send(JSON.stringify({
        type: 'export-data',
        format: 'csv',
        data: csv
      }));
    }
  }

  private convertToCSV(metrics: MonitoringMetrics[]): string {
    const headers = [
      'timestamp', 'volume', 'link', 'profile', 'security', 'compliance',
      'anomaly_count', 'prediction_confidence', 'cpu', 'memory', 'latency'
    ];

    const rows = metrics.map(m => [
      m.timestamp,
      m.tensions.volume,
      m.tensions.link,
      m.tensions.profile,
      m.tensions.security,
      m.tensions.compliance,
      m.anomalies.length,
      m.predictions.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, m.predictions.length),
      m.systemHealth.cpu,
      m.systemHealth.memory,
      m.systemHealth.latency
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private async startMetricsCollection(): Promise<void> {
    console.log('📊 Starting metrics collection...');

    while (true) {
      const tensions = {
        volume: 20 + Math.random() * 60,
        link: 15 + Math.random() * 70,
        profile: 30 + Math.random() * 50,
        security: 10 + Math.random() * 80,
        compliance: 25 + Math.random() * 65
      };

      // Detect anomalies
      const anomalyResult = this.anomalyDetector.detectAnomalies(
        'live-game',
        {
          ...tensions,
          timestamp: Date.now()
        }
      );

      // Generate predictions
      const predictions = this.predictionEngine.predict(Object.values(tensions));

      // Simulate system health
      const systemHealth = {
        cpu: 20 + Math.random() * 60,
        memory: 30 + Math.random() * 50,
        latency: 10 + Math.random() * 100
      };

      const metrics: MonitoringMetrics = {
        timestamp: Date.now(),
        tensions,
        anomalies: anomalyResult.anomalies,
        predictions,
        systemHealth
      };

      this.metrics.push(metrics);
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics.shift();
      }

      // Add training data to prediction engine
      this.predictionEngine.addTrainingData(
        Object.values(tensions),
        Object.values(tensions).map(v => v + (Math.random() - 0.5) * 10)
      );

      await Bun.sleep(METRICS_COLLECTION_INTERVAL_MS);
    }
  }

  private startBroadcastLoop(): void {
    setInterval(() => {
      if (this.metrics.length === 0) return;

      const latestMetrics = this.metrics[this.metrics.length - 1];

      this.clients.forEach(client => {
        if (client.subscriptions.has('metrics')) {
          client.ws.send(JSON.stringify({
            type: 'metrics-update',
            data: latestMetrics
          }));
        }

        if (client.subscriptions.has('anomalies') && latestMetrics.anomalies.length > 0) {
          client.ws.send(JSON.stringify({
            type: 'anomaly-alert',
            data: latestMetrics.anomalies
          }));
        }
      });

      // Cleanup inactive clients
      this.cleanupInactiveClients();

    }, BROADCAST_INTERVAL_MS);
  }

  private cleanupInactiveClients(): void {
    const now = Date.now();
    const timeout = CLIENT_INACTIVE_TIMEOUT_MS;

    this.clients.forEach((client, id) => {
      if (now - client.lastActivity > timeout) {
        client.ws.terminate();
        this.clients.delete(id);
        console.log(`🧹 Cleaned up inactive client: ${id}`);
      }
    });
  }

  generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tension Field Live Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
        }

        .header {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .status-bar {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 10px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .status-indicator.connected { background: #4ade80; }
        .status-indicator.disconnected { background: #f87171; }
        .status-indicator.warning { background: #fbbf24; }

        .dashboard {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            padding: 20px;
            max-width: 1600px;
            margin: 0 auto;
        }

        .main-panel {
            display: grid;
            gap: 20px;
        }

        .side-panel {
            display: grid;
            gap: 20px;
        }

        .panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .panel h2 {
            margin-bottom: 15px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }

        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .metric-label {
            font-size: 0.9em;
            opacity: 0.8;
        }

        .metric-change {
            font-size: 0.8em;
            margin-top: 5px;
        }

        .metric-change.up { color: #4ade80; }
        .metric-change.down { color: #f87171; }

        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 15px;
        }

        .anomaly-list {
            max-height: 200px;
            overflow-y: auto;
        }

        .anomaly-item {
            background: rgba(248, 113, 113, 0.2);
            border-left: 4px solid #f87171;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
        }

        .anomaly-item.high {
            border-left-color: #f87171;
        }

        .anomaly-item.medium {
            border-left-color: #fbbf24;
        }

        .anomaly-item.low {
            border-left-color: #60a5fa;
        }

        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .model-status {
            font-size: 0.9em;
        }

        .model-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .health-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }

        .health-fill {
            height: 100%;
            transition: width 0.3s ease;
        }

        .health-fill.good { background: #4ade80; }
        .health-fill.warning { background: #fbbf24; }
        .health-fill.critical { background: #f87171; }

        .predictions-grid {
            display: grid;
            gap: 10px;
        }

        .prediction-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 12px;
            border-radius: 8px;
        }

        .prediction-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .prediction-values {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            font-size: 0.8em;
        }

        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
        }

        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌠 Tension Field Live Monitoring</h1>
        <div class="status-bar">
            <div class="status-item">
                <div class="status-indicator" id="connectionStatus"></div>
                <span id="connectionText">Connecting...</span>
            </div>
            <div class="status-item">
                <span>Clients: <strong id="clientCount">0</strong></span>
            </div>
            <div class="status-item">
                <span>Last Update: <strong id="lastUpdate">--</strong></span>
            </div>
        </div>
    </div>

    <div class="dashboard">
        <div class="main-panel">
            <div class="panel">
                <h2>📊 Real-time Tension Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value" id="volumeValue">--</div>
                        <div class="metric-label">VOLUME</div>
                        <div class="metric-change" id="volumeChange"></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="linkValue">--</div>
                        <div class="metric-label">LINK</div>
                        <div class="metric-change" id="linkChange"></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="profileValue">--</div>
                        <div class="metric-label">PROFILE</div>
                        <div class="metric-change" id="profileChange"></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="securityValue">--</div>
                        <div class="metric-label">SECURITY</div>
                        <div class="metric-change" id="securityChange"></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="complianceValue">--</div>
                        <div class="metric-label">COMPLIANCE</div>
                        <div class="metric-change" id="complianceChange"></div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="tensionChart"></canvas>
                </div>
            </div>

            <div class="panel">
                <h2>⚠️ Anomaly Detection</h2>
                <div class="anomaly-list" id="anomalyList">
                    <p style="opacity: 0.6; text-align: center;">No anomalies detected</p>
                </div>
            </div>
        </div>

        <div class="side-panel">
            <div class="panel">
                <h2>🤖 Predictions</h2>
                <div class="controls">
                    <button class="btn" onclick="requestPredictions()">Get Predictions</button>
                    <button class="btn" onclick="trainModels()">Train Models</button>
                </div>
                <div class="predictions-grid" id="predictionsGrid">
                    <p style="opacity: 0.6; text-align: center;">Click "Get Predictions" to see forecasts</p>
                </div>
            </div>

            <div class="panel">
                <h2>🏥 System Health</h2>
                <div class="metric-card">
                    <div class="metric-value" id="cpuValue">--</div>
                    <div class="metric-label">CPU Usage</div>
                    <div class="health-bar">
                        <div class="health-fill" id="cpuBar"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" id="memoryValue">--</div>
                    <div class="metric-label">Memory Usage</div>
                    <div class="health-bar">
                        <div class="health-fill" id="memoryBar"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" id="latencyValue">--</div>
                    <div class="metric-label">Latency (ms)</div>
                    <div class="health-bar">
                        <div class="health-fill" id="latencyBar"></div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <h2>📈 Model Status</h2>
                <div class="model-status" id="modelStatus">
                    <p style="opacity: 0.6;">Loading model status...</p>
                </div>
            </div>

            <div class="panel">
                <h2>🔧 Controls</h2>
                <div class="controls">
                    <button class="btn" onclick="exportData('json')">Export JSON</button>
                    <button class="btn" onclick="exportData('csv')">Export CSV</button>
                    <button class="btn" onclick="toggleSubscription('anomalies')">Toggle Anomalies</button>
                    <button class="btn" onclick="clearData()">Clear Data</button>
                </div>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const ws = new WebSocket('ws://localhost:3002');
        let tensionChart = null;
        let previousMetrics = null;

        // Initialize chart
        const ctx = document.getElementById('tensionChart').getContext('2d');
        tensionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Volume', data: [], borderColor: '#ef4444', tension: 0.4 },
                    { label: 'Link', data: [], borderColor: '#3b82f6', tension: 0.4 },
                    { label: 'Profile', data: [], borderColor: '#10b981', tension: 0.4 },
                    { label: 'Security', data: [], borderColor: '#f59e0b', tension: 0.4 },
                    { label: 'Compliance', data: [], borderColor: '#8b5cf6', tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 },
                    x: { display: false }
                },
                plugins: {
                    legend: { labels: { color: 'white' } }
                }
            }
        });

        ws.onopen = () => {
            updateConnectionStatus(true);
            showToast('Connected to monitoring dashboard', 'success');
        };

        ws.onclose = () => {
            updateConnectionStatus(false);
            showToast('Disconnected from monitoring dashboard', 'error');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };

        function handleMessage(message) {
            switch (message.type) {
                case 'initial-metrics':
                    message.data.forEach(metrics => updateMetrics(metrics));
                    tensionChart.update();
                    break;
                case 'metrics-update':
                    updateMetrics(message.data);
                    tensionChart.update();
                    break;
                case 'anomaly-alert':
                    updateAnomalies(message.data);
                    break;
                case 'predictions':
                    updatePredictions(message.data);
                    break;
                case 'model-status':
                    updateModelStatus(message.data);
                    break;
                case 'training-started':
                    showToast('Model training started...', 'info');
                    break;
                case 'training-complete':
                    showToast('Model training completed!', 'success');
                    updateModelStatus(message.data);
                    break;
                case 'export-data':
                    downloadData(message.data, message.format);
                    break;
                case 'error':
                    showToast(message.message, 'error');
                    break;
            }
        }

        function updateMetrics(metrics) {
            // Update metric cards
            updateMetricCard('volume', metrics.tensions.volume);
            updateMetricCard('link', metrics.tensions.link);
            updateMetricCard('profile', metrics.tensions.profile);
            updateMetricCard('security', metrics.tensions.security);
            updateMetricCard('compliance', metrics.tensions.compliance);

            // Update system health
            updateHealthMetric('cpu', metrics.systemHealth.cpu);
            updateHealthMetric('memory', metrics.systemHealth.memory);
            updateHealthMetric('latency', metrics.systemHealth.latency, 100);

            // Update chart
            const time = new Date(metrics.timestamp).toLocaleTimeString();
            if (tensionChart.data.labels.length > 30) {
                tensionChart.data.labels.shift();
                tensionChart.data.datasets.forEach(dataset => dataset.data.shift());
            }

            tensionChart.data.labels.push(time);
            tensionChart.data.datasets[0].data.push(metrics.tensions.volume);
            tensionChart.data.datasets[1].data.push(metrics.tensions.link);
            tensionChart.data.datasets[2].data.push(metrics.tensions.profile);
            tensionChart.data.datasets[3].data.push(metrics.tensions.security);
            tensionChart.data.datasets[4].data.push(metrics.tensions.compliance);

            // Update last update time
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

            previousMetrics = metrics;
        }

        function updateMetricCard(name, value) {
            const valueEl = document.getElementById(name + 'Value');
            const changeEl = document.getElementById(name + 'Change');

            valueEl.textContent = value.toFixed(1);

            if (previousMetrics) {
                const prevValue = previousMetrics.tensions[name];
                const change = value - prevValue;
                const changePercent = (change / prevValue * 100).toFixed(1);

                changeEl.textContent = (change >= 0 ? '↑' : '↓') + ' ' + Math.abs(changePercent) + '%';
                changeEl.className = 'metric-change ' + (change >= 0 ? 'up' : 'down');
            }
        }

        function updateHealthMetric(name, value, max = 100) {
            const valueEl = document.getElementById(name + 'Value');
            const barEl = document.getElementById(name + 'Bar');

            valueEl.textContent = value.toFixed(1);
            barEl.style.width = value + '%';

            if (value < 50) {
                barEl.className = 'health-fill good';
            } else if (value < 80) {
                barEl.className = 'health-fill warning';
            } else {
                barEl.className = 'health-fill critical';
            }
        }

        function updateAnomalies(anomalies) {
            const listEl = document.getElementById('anomalyList');

            if (anomalies.length === 0) {
                listEl.innerHTML = '<p style="opacity: 0.6; text-align: center;">No anomalies detected</p>';
                return;
            }

            listEl.innerHTML = anomalies.map(anomaly =>
                \`<div class="anomaly-item \${anomaly.severity.toLowerCase()}">
                    <strong>\${anomaly.type}</strong> - \${anomaly.severity}
                    <br><small>\${anomaly.description}</small>
                </div>\`
            ).join('');

            showToast(\`\${anomalies.length} anomalies detected!\`, 'warning');
        }

        function updatePredictions(predictions) {
            const gridEl = document.getElementById('predictionsGrid');

            gridEl.innerHTML = predictions.map(pred =>
                \`<div class="prediction-card">
                    <div class="prediction-header">
                        <span>\${pred.model}</span>
                        <span>\${(pred.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div class="prediction-values">
                        <div>V: \${pred.predicted.volume.toFixed(1)}</div>
                        <div>L: \${pred.predicted.link.toFixed(1)}</div>
                        <div>P: \${pred.predicted.profile.toFixed(1)}</div>
                        <div>S: \${pred.predicted.security.toFixed(1)}</div>
                        <div>C: \${pred.predicted.compliance.toFixed(1)}</div>
                    </div>
                </div>\`
            ).join('');
        }

        function updateModelStatus(status) {
            const statusEl = document.getElementById('modelStatus');

            let html = '';
            for (const [name, model] of Object.entries(status.models)) {
                html += \`
                    <div class="model-item">
                        <span>\${model.name}</span>
                        <span>\${model.accuracy}</span>
                    </div>
                \`;
            }

            statusEl.innerHTML = html;
        }

        function updateConnectionStatus(connected) {
            const statusEl = document.getElementById('connectionStatus');
            const textEl = document.getElementById('connectionText');

            if (connected) {
                statusEl.className = 'status-indicator connected';
                textEl.textContent = 'Connected';
            } else {
                statusEl.className = 'status-indicator disconnected';
                textEl.textContent = 'Disconnected';
            }
        }

        function requestPredictions() {
            if (!previousMetrics) return;

            const tensions = [
                previousMetrics.tensions.volume,
                previousMetrics.tensions.link,
                previousMetrics.tensions.profile,
                previousMetrics.tensions.security,
                previousMetrics.tensions.compliance
            ];

            ws.send(JSON.stringify({
                type: 'get-predictions',
                currentTensions: tensions
            }));
        }

        function trainModels() {
            ws.send(JSON.stringify({ type: 'train-models' }));
        }

        function exportData(format) {
            ws.send(JSON.stringify({ type: 'export-data', format }));
        }

        function downloadData(data, format) {
            const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`tension-data.\${format}\`;
            a.click();
            URL.revokeObjectURL(url);

            showToast(\`Data exported as \${format.toUpperCase()}\`, 'success');
        }

        function toggleSubscription(channel) {
            ws.send(JSON.stringify({
                type: 'unsubscribe',
                channels: [channel]
            }));

            showToast(\`Unsubscribed from \${channel}\`, 'info');
        }

        function clearData() {
            tensionChart.data.labels = [];
            tensionChart.data.datasets.forEach(dataset => dataset.data = []);
            tensionChart.update();

            document.getElementById('anomalyList').innerHTML = '<p style="opacity: 0.6; text-align: center;">No anomalies detected</p>';
            document.getElementById('predictionsGrid').innerHTML = '<p style="opacity: 0.6; text-align: center;">Click "Get Predictions" to see forecasts</p>';

            showToast('Dashboard data cleared', 'info');
        }

        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast show';

            setTimeout(() => {
                toast.className = 'toast';
            }, 3000);
        }
    </script>
</body>
</html>`;
  }
}

// CLI interface
if (import.meta.main) {
  const dashboard = new LiveMonitoringDashboard(PORT_MCP_DEFAULT);

  // Generate HTML dashboard
  const html = dashboard.generateDashboardHTML();
  await Bun.write('./monitoring-dashboard.html', html);
  console.log('📄 Monitoring dashboard saved to monitoring-dashboard.html');
  console.log('🌐 Open monitoring-dashboard.html in your browser');
  console.log('🔌 WebSocket server running on ws://localhost:3002');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down monitoring dashboard...');
    process.exit(EXIT_CODES.SUCCESS);
  });
}
// [TENSION-VOLUME-001]
// [TENSION-LINK-002]
// [TENSION-PROFILE-003]
// [GOV-SECURITY-001]
// [GOV-COMPLIANCE-002]
