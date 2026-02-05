#!/usr/bin/env bun
// Real-time Tension Field Visualization Engine
import { setTimeout } from 'node:timers/promises';
import { WebSocketServer } from 'ws';

interface VisualizationPoint {
  timestamp: number;
  volume: number;
  link: number;
  profile: number;
  security: number;
  compliance: number;
  risk: number;
}

interface HeatmapData {
  grid: number[][];
  maxIntensity: number;
  timestamp: number;
}

export class TensionVisualizer {
  private wss?: WebSocketServer;
  private clients: Set<any> = new Set();
  private dataBuffer: VisualizationPoint[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  constructor(port: number = 3001) {
    this.initializeWebSocket(port);
  }

  private initializeWebSocket(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      console.log('🔌 Client connected to tension visualization');
      this.clients.add(ws);

      // Send current buffer to new client
      if (this.dataBuffer.length > 0) {
        ws.send(JSON.stringify({
          type: 'historical',
          data: this.dataBuffer.slice(-50) // Last 50 points
        }));
      }

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('🔌 Client disconnected');
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.clients.delete(ws);
      });
    });

    console.log(`📊 Tension visualization server running on ws://localhost:${port}`);
  }

  addDataPoint(point: VisualizationPoint): void {
    this.dataBuffer.push(point);
    if (this.dataBuffer.length > this.MAX_BUFFER_SIZE) {
      this.dataBuffer.shift();
    }

    // Broadcast to all connected clients
    this.broadcast({
      type: 'tension-update',
      data: point
    });
  }

  generateHeatmap(points: VisualizationPoint[]): HeatmapData {
    const gridSize = 20;
    const grid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    let maxIntensity = 0;

    points.forEach(point => {
      // Map tension values to grid coordinates
      const x = Math.floor((point.volume / 100) * (gridSize - 1));
      const y = Math.floor((point.link / 100) * (gridSize - 1));

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        const intensity = (point.volume + point.link + point.profile + point.security + point.compliance) / 5;
        grid[y][x] = intensity;
        maxIntensity = Math.max(maxIntensity, intensity);
      }
    });

    return {
      grid,
      maxIntensity,
      timestamp: Date.now()
    };
  }

  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  async startRealtimeVisualization(): Promise<void> {
    console.log('🎬 Starting real-time tension visualization...');

    while (true) {
      const point: VisualizationPoint = {
        timestamp: Date.now(),
        volume: 20 + Math.random() * 60,
        link: 15 + Math.random() * 70,
        profile: 30 + Math.random() * 50,
        security: 10 + Math.random() * 80,
        compliance: 25 + Math.random() * 65,
        risk: Math.random() * 100
      };

      this.addDataPoint(point);

      // Send heatmap every 5 seconds
      if (this.dataBuffer.length % 5 === 0) {
        const heatmap = this.generateHeatmap(this.dataBuffer.slice(-20));
        this.broadcast({
          type: 'heatmap',
          data: heatmap
        });
      }

      await setTimeout(1000); // 1 second intervals
    }
  }

  generateHTMLDashboard(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tension Field Visualization Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .panel h2 {
            margin-top: 0;
            font-size: 1.5em;
            text-align: center;
        }
        .status {
            text-align: center;
            font-size: 1.2em;
            margin: 10px 0;
        }
        .status.connected { color: #4ade80; }
        .status.disconnected { color: #f87171; }
        canvas {
            max-width: 100%;
            height: 300px !important;
        }
        .heatmap {
            display: grid;
            grid-template-columns: repeat(20, 1fr);
            gap: 2px;
            margin: 20px 0;
        }
        .heatmap-cell {
            aspect-ratio: 1;
            border-radius: 2px;
            transition: background-color 0.3s ease;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 20px;
        }
        .metric {
            text-align: center;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
        }
        .metric-label {
            font-size: 0.8em;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <h1>🌠 Tension Field Visualization Dashboard</h1>
    <div class="status" id="status">🔌 Connecting...</div>

    <div class="dashboard">
        <div class="panel">
            <h2>📈 Real-time Tension Metrics</h2>
            <canvas id="tensionChart"></canvas>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value" id="volumeMetric">--</div>
                    <div class="metric-label">VOLUME</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="linkMetric">--</div>
                    <div class="metric-label">LINK</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="profileMetric">--</div>
                    <div class="metric-label">PROFILE</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="securityMetric">--</div>
                    <div class="metric-label">SECURITY</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="complianceMetric">--</div>
                    <div class="metric-label">COMPLIANCE</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="riskMetric">--</div>
                    <div class="metric-label">RISK</div>
                </div>
            </div>
        </div>

        <div class="panel">
            <h2>🔥 Tension Heatmap</h2>
            <div class="heatmap" id="heatmap"></div>
            <canvas id="riskChart"></canvas>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:3001');
        const status = document.getElementById('status');

        // Chart setup
        const tensionCtx = document.getElementById('tensionChart').getContext('2d');
        const tensionChart = new Chart(tensionCtx, {
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

        const riskCtx = document.getElementById('riskChart').getContext('2d');
        const riskChart = new Chart(riskCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Risk Score',
                    data: [],
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
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
            status.textContent = '🟢 Connected';
            status.className = 'status connected';
        };

        ws.onclose = () => {
            status.textContent = '🔴 Disconnected';
            status.className = 'status disconnected';
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'tension-update') {
                updateCharts(message.data);
                updateMetrics(message.data);
            } else if (message.type === 'heatmap') {
                updateHeatmap(message.data);
            } else if (message.type === 'historical') {
                message.data.forEach(point => {
                    updateCharts(point, false);
                });
                tensionChart.update();
                riskChart.update();
            }
        };

        function updateCharts(data, update = true) {
            const time = new Date(data.timestamp).toLocaleTimeString();

            // Keep only last 20 points
            if (tensionChart.data.labels.length > 20) {
                tensionChart.data.labels.shift();
                tensionChart.data.datasets.forEach(dataset => dataset.data.shift());
                riskChart.data.labels.shift();
                riskChart.data.datasets[0].data.shift();
            }

            tensionChart.data.labels.push(time);
            tensionChart.data.datasets[0].data.push(data.volume);
            tensionChart.data.datasets[1].data.push(data.link);
            tensionChart.data.datasets[2].data.push(data.profile);
            tensionChart.data.datasets[3].data.push(data.security);
            tensionChart.data.datasets[4].data.push(data.compliance);

            riskChart.data.labels.push(time);
            riskChart.data.datasets[0].data.push(data.risk);

            if (update) {
                tensionChart.update();
                riskChart.update();
            }
        }

        function updateMetrics(data) {
            document.getElementById('volumeMetric').textContent = data.volume.toFixed(1);
            document.getElementById('linkMetric').textContent = data.link.toFixed(1);
            document.getElementById('profileMetric').textContent = data.profile.toFixed(1);
            document.getElementById('securityMetric').textContent = data.security.toFixed(1);
            document.getElementById('complianceMetric').textContent = data.compliance.toFixed(1);
            document.getElementById('riskMetric').textContent = data.risk.toFixed(1);
        }

        function updateHeatmap(data) {
            const heatmap = document.getElementById('heatmap');
            heatmap.innerHTML = '';

            data.grid.forEach(row => {
                row.forEach(cell => {
                    const div = document.createElement('div');
                    div.className = 'heatmap-cell';
                    const intensity = cell / data.maxIntensity;
                    const hue = (1 - intensity) * 240; // Blue to red
                    div.style.backgroundColor = \`hsl(\${hue}, 70%, 50%)\`;
                    heatmap.appendChild(div);
                });
            });
        }
    </script>
</body>
</html>`;
  }
}

// CLI interface
if (import.meta.main) {
  const visualizer = new TensionVisualizer(3001);

  // Generate HTML dashboard
  const html = visualizer.generateHTMLDashboard();
  await Bun.write('./tension-dashboard.html', html);
  console.log('📄 Dashboard saved to tension-dashboard.html');

  // Start real-time visualization
  await visualizer.startRealtimeVisualization();
}
// [TENSION-VOLUME-001]
// [TENSION-LINK-002]
// [TENSION-PROFILE-003]
// [GOV-SECURITY-001]
// [GOV-COMPLIANCE-002]
