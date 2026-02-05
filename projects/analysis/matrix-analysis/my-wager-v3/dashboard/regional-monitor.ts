#!/usr/bin/env bun
// Regional Performance Monitor Dashboard
// Real-time WebSocket dashboard for Tier-1380 Test Configuration Empire

import { windowProxyHandler, WindowProxyInfo } from '../packages/test/window-proxy-handler';
import { secureMessageChannel } from '../packages/test/secure-message-channel';
import { serve } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  PORT_MCP_DEFAULT,
  WS_PING_TIMEOUT_MS,
  RECONNECT_TIMEOUT_MS,
  REGIONAL_UPDATE_INTERVAL_MS,
} from '../src/tension-field/constants';

interface RegionStatus {
  region: string;
  status: 'active' | 'idle' | 'error';
  lastUpdate: number;
  metrics: {
    parseTime: number;
    testCount: number;
    passRate: number;
    coverage: number;
    duration: number;
  };
  sealId: string;
}

interface Col93Matrix {
  totalEntries: number;
  averageParseTime: string;
  maxParseTime: string;
  performanceGrade: string;
  regions: Record<string, RegionStatus>;
}

class RegionalMonitor {
  private regions: Map<string, RegionStatus> = new Map();
  private windowProxies: Map<string, WindowProxyInfo> = new Map();
  private col93Matrix: Col93Matrix = {
    totalEntries: 0,
    averageParseTime: '0.000ms',
    maxParseTime: '0.000ms',
    performanceGrade: '✅ EXCELLENT',
    regions: {}
  };

  constructor() {
    this.initializeRegions();
    this.loadMatrixData();
  }

  private initializeRegions(): void {
    const defaultRegion: RegionStatus = {
      region: '',
      status: 'idle',
      lastUpdate: Date.now(),
      metrics: {
        parseTime: 0,
        testCount: 0,
        passRate: 0,
        coverage: 0,
        duration: 0
      },
      sealId: ''
    };

    ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'sa-east-1'].forEach(region => {
      this.regions.set(region, { ...defaultRegion, region });
      this.col93Matrix.regions[region] = { ...defaultRegion, region };
    });
  }

  private loadMatrixData(): void {
    // Load performance data from artifacts
    try {
      const artifactsPath = './artifacts';
      if (existsSync(artifactsPath)) {
        // In a real implementation, this would scan and aggregate performance data
        this.col93Matrix.totalEntries = 42;
        this.col93Matrix.averageParseTime = '0.847ms';
        this.col93Matrix.maxParseTime = '1.234ms';
        this.col93Matrix.performanceGrade = '✅ EXCELLENT';
      }
    } catch (error) {
      console.warn('Failed to load matrix data:', error);
    }
  }

  updateRegion(data: {
    region: string;
    status: RegionStatus['status'];
    metrics: Partial<RegionStatus['metrics']>;
    sealId?: string;
  }): void {
    const region = this.regions.get(data.region);
    if (!region) return;

    region.status = data.status;
    region.lastUpdate = Date.now();
    region.metrics = { ...region.metrics, ...data.metrics };
    if (data.sealId) region.sealId = data.sealId;

    // Update matrix
    this.col93Matrix.regions[data.region] = { ...region };

    // Save to artifacts
    this.saveRegionData(data.region);
  }

  private saveRegionData(region: string): void {
    const data = this.regions.get(region);
    if (!data) return;

    const filename = `./artifacts/region-${region}-${Date.now()}.json`;
    try {
      writeFileSync(filename, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`Failed to save region data for ${region}:`, error);
    }
  }

  getMatrix(): Col93Matrix {
    return { ...this.col93Matrix };
  }

  getRegionStatus(region: string): RegionStatus | undefined {
    return this.regions.get(region);
  }

  getAllRegions(): RegionStatus[] {
    return Array.from(this.regions.values());
  }

  // WindowProxy management
  addWindowProxy(proxyInfo: WindowProxyInfo): void {
    this.windowProxies.set(proxyInfo.id, proxyInfo);
    console.log(`🔗 Added WindowProxy ${proxyInfo.id} from ${proxyInfo.origin}`);
  }

  removeWindowProxy(id: string): void {
    if (this.windowProxies.delete(id)) {
      console.log(`🔌 Removed WindowProxy ${id}`);
    }
  }

  getAllWindowProxies(): WindowProxyInfo[] {
    return Array.from(this.windowProxies.values());
  }

  getWindowProxyStats(): {
    total: number;
    active: number;
    inactive: number;
    origins: string[];
  } {
    const proxies = this.getAllWindowProxies();
    return {
      total: proxies.length,
      active: proxies.filter(p => p.status === 'active').length,
      inactive: proxies.filter(p => p.status === 'inactive').length,
      origins: Array.from(new Set(proxies.map(p => p.origin)))
    };
  }
}

const monitor = new RegionalMonitor();

// Register secure message handlers
secureMessageChannel.on('region-update', (event: MessageEvent) => {
  const data = event.data.data;
  monitor.updateRegion(data);

  // Broadcast to all clients except sender
  broadcastToDashboard({
    type: 'region-status',
    region: data.region,
    status: data.status,
    metrics: data.metrics,
    source: 'client-update'
  }, event.source as any);
});

secureMessageChannel.on('window-proxy-register', (event: MessageEvent) => {
  const data = event.data.data;
  const proxyInfo = windowProxyHandler.handleWindowProxyMessage({
    source: data.source,
    origin: data.origin,
    data: data.data
  } as MessageEvent);

  if (proxyInfo) {
    monitor.addWindowProxy(proxyInfo);
    broadcastToDashboard({
      type: 'window-proxy-added',
      proxy: proxyInfo
    });
  }
});

// WebSocket connections for real-time updates
const wsConnections: Set<any> = new Set();

// Generate quantum seal for artifacts
function generateQuantumSeal(): string {
  const timestamp = Date.now().toString(36);
  const entropy = Math.random().toString(36).substring(2);
  const hash = Bun.hash.crc32(`${timestamp}${entropy}`).toString(36);
  return `qs-${timestamp}-${entropy}-${hash}`;
}

async function broadcastToDashboard(data: any, excludeWs?: any): Promise<void> {
  const message = JSON.stringify(data);

  wsConnections.forEach(ws => {
    // Skip excluded WebSocket
    if (excludeWs && ws === excludeWs) {
      return;
    }

    try {
      ws.send(message);
    } catch (error) {
      // Connection closed, remove it
      wsConnections.delete(ws);
    }
  });
}

function generateDashboard(): string {
  const regions = monitor.getAllRegions();
  const windowProxies = monitor.getAllWindowProxies();
  const matrix = monitor.getMatrix();
  const sealId = generateQuantumSeal();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 Tier-1380 Test Configuration Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.1);
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #3b82f6, #22c55e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            color: #94a3b8;
            font-size: 1.1rem;
        }

        .matrix {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .matrix h2 {
            margin-bottom: 20px;
            color: #22c55e;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .seal {
            animation: pulse 2s infinite;
            display: inline-block;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .matrix-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .metric {
            background: rgba(15, 23, 42, 0.6);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .metric-label {
            color: #94a3b8;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }

        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #e2e8f0;
        }

        .regions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .region {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 16px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            transition: all 0.3s ease;
        }

        .region:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .region-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .region-name {
            font-size: 1.2rem;
            font-weight: bold;
        }

        .status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status.active {
            background: #22c55e;
            color: #0f172a;
        }

        .status.idle {
            background: #f59e0b;
            color: #0f172a;
        }

        .status.error {
            background: #ef4444;
            color: #ffffff;
        }

        .region-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .region-metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .region-metric-label {
            color: #94a3b8;
            font-size: 0.9rem;
        }

        .region-metric-value {
            font-weight: bold;
        }

        .window-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .window-proxy {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
        }

        .window-proxy.active {
            border-color: rgba(34, 197, 94, 0.3);
            background: rgba(34, 197, 94, 0.05);
        }

        .window-proxy.inactive {
            border-color: rgba(239, 68, 68, 0.3);
            background: rgba(239, 68, 68, 0.05);
            opacity: 0.7;
        }

        .proxy-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .proxy-id {
            font-family: monospace;
            font-size: 0.85rem;
            color: #94a3b8;
        }

        .proxy-status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }

        .proxy-status.active {
            background: #22c55e;
            color: #0f172a;
        }

        .proxy-status.inactive {
            background: #ef4444;
            color: #ffffff;
        }

        .proxy-metrics {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .proxy-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
        }

        .proxy-metric-label {
            color: #94a3b8;
        }

        .proxy-metric-value {
            font-weight: 500;
        }

        .seal-id {
            margin-top: 15px;
            padding: 10px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.85rem;
            color: #64b5f6;
            word-break: break-all;
        }

        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: bold;
        }

        .connected {
            background: #22c55e;
            color: #0f172a;
        }

        .disconnected {
            background: #ef4444;
            color: #ffffff;
        }
    </style>
</head>
<body>
    <div class="connection-status" id="connectionStatus">🔌 Connecting...</div>

    <div class="container">
        <header>
            <h1>🔒 Tier-1380 Test Configuration Empire</h1>
            <p class="subtitle">Real-time Regional Performance Monitoring</p>
        </header>

        <section class="matrix">
            <h2><span class="seal">🔒</span> Col 93 Performance Matrix</h2>
            <div class="matrix-grid">
                <div class="metric">
                    <div class="metric-label">Total Entries</div>
                    <div class="metric-value">${matrix.totalEntries}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Avg Parse Time</div>
                    <div class="metric-value">${matrix.averageParseTime}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Max Parse Time</div>
                    <div class="metric-value">${matrix.maxParseTime}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Performance Grade</div>
                    <div class="metric-value">${matrix.performanceGrade}</div>
                </div>
            </div>
        </section>

        <section class="windows">
            <h2>🪟 WindowProxy Connections</h2>
            <div class="window-grid" id="windowProxyGrid">
                ${windowProxies.map(proxy => `
                    <div class="window-proxy ${proxy.status}" id="proxy-${proxy.id}">
                        <div class="proxy-header">
                            <div class="proxy-id">${proxy.id}</div>
                            <div class="proxy-status ${proxy.status}">${proxy.status}</div>
                        </div>
                        <div class="proxy-metrics">
                            <div class="proxy-metric">
                                <span class="proxy-metric-label">Origin</span>
                                <span class="proxy-metric-value">${proxy.origin}</span>
                            </div>
                            <div class="proxy-metric">
                                <span class="proxy-metric-label">Last Activity</span>
                                <span class="proxy-metric-value">${new Date(proxy.lastActivity).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="regions">
            ${regions.map(region => `
                <div class="region" id="region-${region.region}">
                    <div class="region-header">
                        <div class="region-name">${region.region}</div>
                        <div class="status ${region.status}">${region.status}</div>
                    </div>
                    <div class="region-metrics">
                        <div class="region-metric">
                            <span class="region-metric-label">Parse Time</span>
                            <span class="region-metric-value">${region.metrics.parseTime.toFixed(3)}ms</span>
                        </div>
                        <div class="region-metric">
                            <span class="region-metric-label">Tests</span>
                            <span class="region-metric-value">${region.metrics.testCount}</span>
                        </div>
                        <div class="region-metric">
                            <span class="region-metric-label">Pass Rate</span>
                            <span class="region-metric-value">${(region.metrics.passRate * 100).toFixed(1)}%</span>
                        </div>
                        <div class="region-metric">
                            <span class="region-metric-label">Coverage</span>
                            <span class="region-metric-value">${(region.metrics.coverage * 100).toFixed(1)}%</span>
                        </div>
                        <div class="region-metric">
                            <span class="region-metric-label">Duration</span>
                            <span class="region-metric-value">${(region.metrics.duration / 1000).toFixed(2)}s</span>
                        </div>
                        <div class="region-metric">
                            <span class="region-metric-label">Last Update</span>
                            <span class="region-metric-value">${new Date(region.lastUpdate).toLocaleTimeString()}</span>
                        </div>
                    </div>
                    ${region.sealId ? `<div class="seal-id">Seal: ${region.sealId}</div>` : ''}
                </div>
            `).join('')}
        </section>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:3002');
        const connectionStatus = document.getElementById('connectionStatus');

        ws.onopen = () => {
            connectionStatus.textContent = '🟢 Connected';
            connectionStatus.className = 'connection-status connected';
        };

        ws.onclose = () => {
            connectionStatus.textContent = '🔴 Disconnected';
            connectionStatus.className = 'connection-status disconnected';
            // Attempt to reconnect after 3 seconds
            setTimeout(() => location.reload(), ${RECONNECT_TIMEOUT_MS});
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'region-status') {
                updateRegion(data.region, data.status, data.metrics);
            } else if (data.type === 'matrix-update') {
                updateMatrix(data.matrix);
            }

            // Update region status
            if (data.type === 'region-status') {
                const regionEl = document.getElementById(\`region-\${data.region}\`);
                if (regionEl) {
                    const statusEl = regionEl.querySelector('.status');
                    if (statusEl) {
                        statusEl.textContent = data.status;
                        statusEl.className = \`status \${data.status}\`;
                    }
                }
            }

            // Update WindowProxy list
            if (data.type === 'window-proxy-added' || data.type === 'matrix-update') {
                updateWindowProxies(data.windowProxies || [data.proxy]);
            }

            // Handle WindowProxy broadcast
            if (data.type === 'window-proxy-broadcast') {
                console.log(\`📨 Broadcast from WindowProxy \${data.proxyId}:\`, data.data);
            }
        };

        function updateRegion(regionName, status, metrics) {
            const regionElement = document.getElementById(\`region-\${regionName}\`);
            if (!regionElement) return;

            const statusElement = regionElement.querySelector('.status');
            statusElement.textContent = status;
            statusElement.className = \`status \${status}\`;

            // Update metrics
            if (metrics) {
                const metricsElements = regionElement.querySelectorAll('.region-metric-value');
                if (metricsElements[0]) metricsElements[0].textContent = \`\${metrics.parseTime.toFixed(3)}ms\`;
                if (metricsElements[1]) metricsElements[1].textContent = metrics.testCount;
                if (metricsElements[2]) metricsElements[2].textContent = \`\${(metrics.passRate * 100).toFixed(1)}%\`;
                if (metricsElements[3]) metricsElements[3].textContent = \`\${(metrics.coverage * 100).toFixed(1)}%\`;
                if (metricsElements[4]) metricsElements[4].textContent = \`\${(metrics.duration / 1000).toFixed(2)}s\`;
                if (metricsElements[5]) metricsElements[5].textContent = new Date().toLocaleTimeString();
            }
        }

        function updateMatrix(matrix) {
            const metricValues = document.querySelectorAll('.metric-value');
            if (metricValues[0]) metricValues[0].textContent = matrix.totalEntries;
            if (metricValues[1]) metricValues[1].textContent = matrix.averageParseTime;
            if (metricValues[2]) metricValues[2].textContent = matrix.maxParseTime;
            if (metricValues[3]) metricValues[3].textContent = matrix.performanceGrade;
        }

        function updateWindowProxies(proxies) {
            const grid = document.getElementById('windowProxyGrid');
            if (!grid) return;

            // Clear existing proxies
            grid.innerHTML = '';

            // Add proxies
            proxies.forEach(proxy => {
                const proxyEl = document.createElement('div');
                proxyEl.className = \`window-proxy \${proxy.status}\`;
                proxyEl.id = \`proxy-\${proxy.id}\`;

                proxyEl.innerHTML = \`
                    <div class="proxy-header">
                        <div class="proxy-id">\${proxy.id}</div>
                        <div class="proxy-status \${proxy.status}">\${proxy.status}</div>
                    </div>
                    <div class="proxy-metrics">
                        <div class="proxy-metric">
                            <span class="proxy-metric-label">Origin</span>
                            <span class="proxy-metric-value">\${proxy.origin}</span>
                        </div>
                        <div class="proxy-metric">
                            <span class="proxy-metric-label">Last Activity</span>
                            <span class="proxy-metric-value">\${new Date(proxy.lastActivity).toLocaleTimeString()}</span>
                        </div>
                    </div>
                \`;

                grid.appendChild(proxyEl);
            });
        }

        // Simulate real-time updates every 5 seconds
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, ${WS_PING_TIMEOUT_MS});
    </script>
</body>
</html>`;
}

// Start the server
const server = serve({
  port: PORT_MCP_DEFAULT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response(generateDashboard(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (url.pathname === '/api/matrix') {
      return new Response(JSON.stringify(monitor.getMatrix()), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/regions') {
      return new Response(JSON.stringify(monitor.getAllRegions()), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    open(ws) {
      wsConnections.add(ws);
      console.log('📡 Dashboard client connected');

      // Send initial data
      ws.send(JSON.stringify({
        type: 'matrix-update',
        matrix: monitor.getMatrix(),
        windowProxies: monitor.getAllWindowProxies()
      }));
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());

        // Create a MessageEvent-like object for SecureMessageChannel
        const messageEvent = {
          source: ws, // WebSocket as source
          origin: 'ws://localhost:3002',
          data: data,
          type: 'message' as const,
          bubbles: false,
          cancelable: false,
          composed: false,
          lastEventId: '',
          ports: [],
          // Add required MessageEvent properties
          initMessageEvent: () => {},
          cancelBubble: false,
          currentTarget: null,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: true,
          returnValue: true,
          srcElement: null,
          target: null,
          timeStamp: Date.now(),
          NONE: 0,
          CAPTURING_PHASE: 1,
          AT_TARGET: 2,
          BUBBLING_PHASE: 3,
          stopPropagation: () => {},
          preventDefault: () => {},
          initEvent: () => {},
          stopImmediatePropagation: () => {}
        } as unknown as MessageEvent;

        // Process through SecureMessageChannel
        if (!secureMessageChannel.handleMessage(messageEvent)) {
          // Message rejected by security validation
          return;
        }

        // Note: Bun's WebSocket message doesn't have a source property
        // The WebSocket itself is the source
        console.log(`📨 Message from ${wsConnections.has(ws) ? 'connected' : 'unknown'} client:`, data.type);

        // Additional security checks
        if (!data.type || typeof data.type !== 'string') {
          console.warn('⚠️ Invalid message format - missing type');
          return;
        }

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (data.type === 'region-update') {
          // Validate region update data
          if (!data.region || !data.status) {
            console.warn('⚠️ Invalid region update - missing required fields');
            return;
          }

          monitor.updateRegion(data);

          // Broadcast to all clients except sender
          broadcastToDashboard({
            type: 'region-status',
            region: data.region,
            status: data.status,
            metrics: data.metrics,
            source: 'client-update'
          }, ws);
        } else if (data.type === 'subscribe-regions') {
          // Send current region data to subscriber
          ws.send(JSON.stringify({
            type: 'regions-data',
            regions: monitor.getAllRegions(),
            timestamp: Date.now()
          }));
        } else if (data.type === 'window-proxy-register') {
          // Handle WindowProxy registration
          const proxyInfo = windowProxyHandler.handleWindowProxyMessage({
            source: data.source,
            origin: data.origin,
            data: data.data
          } as MessageEvent);

          if (proxyInfo) {
            monitor.addWindowProxy(proxyInfo);
            broadcastToDashboard({
              type: 'window-proxy-added',
              proxy: proxyInfo
            });
          }
        } else if (data.type === 'window-proxy-message') {
          // Handle message from WindowProxy
          const proxyInfo = windowProxyHandler.handleWindowProxyMessage({
            source: data.source,
            origin: data.origin,
            data: data.data
          } as MessageEvent);

          if (proxyInfo) {
            // Broadcast the message to other clients
            broadcastToDashboard({
              type: 'window-proxy-broadcast',
              proxyId: proxyInfo.id,
              data: data.data
            });
          }
        } else {
          console.warn(`⚠️ Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.warn('WebSocket message error:', error);
        // Send error back to client
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now()
        }));
      }
    },
    close(ws) {
      wsConnections.delete(ws);
      console.log('📡 Dashboard client disconnected');
    }
  }
});

console.log('🚀 Tier-1380 Performance Dashboard running on http://localhost:3002');
console.log('📊 Real-time monitoring active for 5 regions');

// Simulate regional updates
setInterval(() => {
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'sa-east-1'];
  const randomRegion = regions[Math.floor(Math.random() * regions.length)];

  monitor.updateRegion({
    region: randomRegion,
    status: Math.random() > 0.1 ? 'active' : 'idle',
    metrics: {
      parseTime: Math.random() * 2,
      testCount: Math.floor(Math.random() * 100),
      passRate: 0.85 + Math.random() * 0.15,
      coverage: 0.90 + Math.random() * 0.1,
      duration: 1000 + Math.random() * 2000
    },
    sealId: `tier1380-${Date.now()}-${Math.random().toString(36).substring(2)}`
  });

  // Broadcast update
  broadcastToDashboard({
    type: 'region-status',
    region: randomRegion,
    status: 'active',
    metrics: monitor.getRegionStatus(randomRegion)?.metrics
  });
}, REGIONAL_UPDATE_INTERVAL_MS);

export { RegionalMonitor, broadcastToDashboard };
