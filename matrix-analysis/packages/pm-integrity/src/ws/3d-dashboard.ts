import { WebSocketServer } from 'ws';
import { BUN_DOC_MAP } from '../src/col93-matrix.js';
import { MatrixEntry } from '../src/types.js';

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'matrix-query' | 'health-check';
  data?: any;
}

interface ServerMessage {
  type: 'matrix-update' | '3d-update' | 'violation-alert' | 'system-status' | 'query-response';
  data: any;
  timestamp: number;
}

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: number;
}

export class Integrity3DDashboard {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private port: number;
  private updateInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  constructor(port: number = 3000) {
    this.port = port;
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    this.startPeriodicUpdates();
    console.log(`🚀 3D Integrity Dashboard: http://localhost:${port}`);
  }
  
  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: ConnectedClient = {
        ws,
        id: clientId,
        subscriptions: new Set(),
        lastPing: Date.now()
      };
      
      this.clients.set(clientId, client);
      console.log(`📡 Client connected: ${clientId}`);
      
      // Send initial data
      this.sendInitialData(client);
      
      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleClientMessage(client, message);
        } catch (error) {
          console.error('Invalid message from client:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📡 Client disconnected: ${clientId}`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
      
      // Start ping interval for this client
      this.startPingInterval(client);
    });
    
    console.log(`🌐 WebSocket server started on port ${this.port}`);
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async sendInitialData(client: ConnectedClient) {
    try {
      // Send current matrix state
      const matrixStats = await BUN_DOC_MAP.getMatrixStats();
      const report = await BUN_DOC_MAP.generateReport();
      
      this.sendMessage(client, {
        type: 'system-status',
        data: {
          matrixStats,
          report,
          connectedClients: this.clients.size,
          serverTime: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
      // Send recent matrix entries for 3D visualization
      const recentEntries = await BUN_DOC_MAP.searchMatrix({});
      const transformedEntries = recentEntries.map(entry => this.transformTo3D(entry));
      
      this.sendMessage(client, {
        type: '3d-update',
        data: {
          entries: transformedEntries,
          dimensions: 12,
          totalEntries: recentEntries.length
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to send initial data:', error);
    }
  }
  
  private async handleClientMessage(client: ConnectedClient, message: ClientMessage) {
    switch (message.type) {
      case 'subscribe':
        if (message.data) {
          client.subscriptions.add(message.data);
          console.log(`📧 Client ${client.id} subscribed to: ${message.data}`);
        }
        break;
        
      case 'unsubscribe':
        if (message.data) {
          client.subscriptions.delete(message.data);
          console.log(`📧 Client ${client.id} unsubscribed from: ${message.data}`);
        }
        break;
        
      case 'matrix-query':
        await this.handleMatrixQuery(client, message.data);
        break;
        
      case 'health-check':
        this.sendMessage(client, {
          type: 'system-status',
          data: {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            connectedClients: this.clients.size
          },
          timestamp: Date.now()
        });
        break;
    }
  }
  
  private async handleMatrixQuery(client: ConnectedClient, query: any) {
    try {
      const results = await BUN_DOC_MAP.searchMatrix(query);
      
      this.sendMessage(client, {
        type: 'query-response',
        data: {
          query,
          results,
          total: results.length
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Matrix query failed:', error);
    }
  }
  
  private sendMessage(client: ConnectedClient, message: ServerMessage) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to client ${client.id}:`, error);
      }
    }
  }
  
  private broadcast(message: ServerMessage, subscription?: string) {
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!subscription || client.subscriptions.has(subscription)) {
          this.sendMessage(client, message);
        }
      }
    }
  }
  
  private transformTo3D(entry: MatrixEntry) {
    return {
      id: entry.term,
      position: this.calculate3DCoordinates(entry),
      color: this.getThreatColor(entry.integrityScore),
      size: this.calculateNodeSize(entry),
      metadata: {
        term: entry.term,
        version: entry.minVer,
        integrityScore: entry.integrityScore,
        securityProfile: entry.securityProfile,
        lastVerified: entry.lastVerified,
        lifecycleScripts: entry.lifecycleScripts,
        threatLevel: this.calculateThreatLevel(entry.integrityScore)
      }
    };
  }
  
  private calculate3DCoordinates(entry: MatrixEntry): [number, number, number] {
    const x = entry.integrityScore * 100;
    const y = parseFloat(entry.compressionRatio) || 0;
    const z = entry.lifecycleScripts.length * 10;
    
    return [x, y, z];
  }
  
  private getThreatColor(integrityScore: number): string {
    if (integrityScore >= 0.99) return '#22c55e';
    if (integrityScore >= 0.95) return '#f59e0b';
    if (integrityScore >= 0.9) return '#ef4444';
    return '#991b1b';
  }
  
  private calculateNodeSize(entry: MatrixEntry): number {
    const baseSize = 5;
    const scriptMultiplier = entry.lifecycleScripts.length * 0.5;
    const securityMultiplier = entry.securityProfile.includes('High') ? 2 : 1;
    
    return baseSize + scriptMultiplier * securityMultiplier;
  }
  
  private calculateThreatLevel(integrityScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (integrityScore >= 0.99) return 'LOW';
    if (integrityScore >= 0.95) return 'MEDIUM';
    if (integrityScore >= 0.9) return 'HIGH';
    return 'CRITICAL';
  }
  
  private startPeriodicUpdates() {
    // Send updates every 5 seconds
    this.updateInterval = setInterval(async () => {
      try {
        const stats = await BUN_DOC_MAP.getMatrixStats();
        
        this.broadcast({
          type: 'system-status',
          data: {
            matrixStats: stats,
            connectedClients: this.clients.size,
            serverTime: new Date().toISOString()
          },
          timestamp: Date.now()
        }, 'system-updates');
        
      } catch (error) {
        console.error('Failed to send periodic update:', error);
      }
    }, 5000);
    
    // Send metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        const report = await BUN_DOC_MAP.generateReport();
        
        this.broadcast({
          type: '3d-update',
          data: {
            metrics: {
              averageIntegrityScore: report.averageScore,
              totalViolations: report.violations.length,
              successRate: report.performanceMetrics.successRate,
              processingTime: report.performanceMetrics.avgProcessingTime
            }
          },
          timestamp: Date.now()
        }, 'metrics');
        
      } catch (error) {
        console.error('Failed to send metrics update:', error);
      }
    }, 30000);
  }
  
  private startPingInterval(client: ConnectedClient) {
    const pingInterval = setInterval(() => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
        client.lastPing = Date.now();
      } else {
        clearInterval(pingInterval);
        this.clients.delete(client.id);
      }
    }, 30000);
  }
  
  // Public methods for external updates
  async broadcastMatrixUpdate(entry: MatrixEntry) {
    const transformed = this.transformTo3D(entry);
    
    this.broadcast({
      type: 'matrix-update',
      data: {
        entry: transformed,
        updateType: 'add'
      },
      timestamp: Date.now()
    }, 'matrix-updates');
    
    // Also update 3D visualization
    this.broadcast({
      type: '3d-update',
      data: {
        entries: [transformed],
        updateType: 'add'
      },
      timestamp: Date.now()
    }, '3d-updates');
  }
  
  async broadcastViolationAlert(violation: any) {
    this.broadcast({
      type: 'violation-alert',
      data: {
        violation,
        severity: violation.severity,
        package: violation.package,
        message: violation.violation,
        timestamp: violation.timestamp
      },
      timestamp: Date.now()
    }, 'security-alerts');
  }
  
  getStats() {
    return {
      connectedClients: this.clients.size,
      port: this.port,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      clientIds: Array.from(this.clients.keys())
    };
  }
  
  async shutdown() {
    console.log('🛑 Shutting down 3D Dashboard...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Notify all clients
    this.broadcast({
      type: 'system-status',
      data: {
        status: 'shutting-down',
        message: 'Server is shutting down'
      },
      timestamp: Date.now()
    });
    
    // Close all connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    
    // Close server
    this.wss.close(() => {
      console.log('✅ 3D Dashboard shutdown complete');
    });
  }
}

// HTTP Server for serving the dashboard HTML
import { serve } from 'bun';

async function startHTTPServer(port: number = 3001) {
  const html = await generateDashboardHTML();
  
  serve({
    port,
    fetch(req) {
      if (req.url === '/' || req.url === '/dashboard') {
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      if (req.url === '/api/status') {
        return Response.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          websocketPort: port - 1
        });
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });
  
  console.log(`🌐 HTTP Dashboard: http://localhost:${port}`);
}

async function generateDashboardHTML(): Promise<string> {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BUN PM Integrity 3D Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        body { margin: 0; font-family: 'Inter', sans-serif; }
        .canvas-container { position: relative; }
        .stats-overlay { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 8px; }
        .alert-panel { position: absolute; top: 20px; right: 20px; background: rgba(239,68,68,0.9); color: white; padding: 15px; border-radius: 8px; max-width: 300px; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <div class="w-80 bg-gray-800 p-6 overflow-y-auto">
            <h1 class="text-2xl font-bold mb-6 text-blue-400">🛡️ Integrity Dashboard</h1>
            
            <!-- System Status -->
            <div class="mb-6">
                <h2 class="text-lg font-semibold mb-3 text-gray-300">System Status</h2>
                <div id="system-status" class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Connected:</span>
                        <span id="connection-status" class="text-yellow-400">Connecting...</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Matrix Entries:</span>
                        <span id="matrix-entries">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Avg Integrity:</span>
                        <span id="avg-integrity">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Violations:</span>
                        <span id="violations" class="text-red-400">-</span>
                    </div>
                </div>
            </div>
            
            <!-- Controls -->
            <div class="mb-6">
                <h2 class="text-lg font-semibold mb-3 text-gray-300">Controls</h2>
                <div class="space-y-3">
                    <button onclick="toggleRotation()" class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">
                        Toggle Rotation
                    </button>
                    <button onclick="resetView()" class="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition">
                        Reset View
                    </button>
                    <button onclick="toggleMetrics()" class="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition">
                        Toggle Metrics
                    </button>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="mb-6">
                <h2 class="text-lg font-semibold mb-3 text-gray-300">Filters</h2>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" id="filter-low" checked class="mr-2">
                        <span class="text-green-400">Low Risk</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" id="filter-medium" checked class="mr-2">
                        <span class="text-yellow-400">Medium Risk</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" id="filter-high" checked class="mr-2">
                        <span class="text-red-400">High Risk</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" id="filter-critical" checked class="mr-2">
                        <span class="text-red-600">Critical Risk</span>
                    </label>
                </div>
            </div>
            
            <!-- Alerts -->
            <div>
                <h2 class="text-lg font-semibold mb-3 text-gray-300">Security Alerts</h2>
                <div id="alerts" class="space-y-2 text-sm max-h-60 overflow-y-auto">
                    <div class="text-gray-500">No alerts</div>
                </div>
            </div>
        </div>
        
        <!-- 3D Visualization -->
        <div class="flex-1 relative canvas-container">
            <div id="three-canvas" class="w-full h-full"></div>
            
            <!-- Stats Overlay -->
            <div class="stats-overlay">
                <div class="text-xs space-y-1">
                    <div>FPS: <span id="fps">60</span></div>
                    <div>Objects: <span id="object-count">0</span></div>
                    <div>Rotation: <span id="rotation-status">ON</span></div>
                </div>
            </div>
            
            <!-- Alert Panel (hidden by default) -->
            <div id="alert-panel" class="alert-panel hidden">
                <h3 class="font-bold mb-2">🚨 Security Alert</h3>
                <div id="alert-content"></div>
            </div>
        </div>
    </div>
    
    <script>
        // WebSocket connection
        const ws = new WebSocket('ws://localhost:3000');
        let scene, camera, renderer, particles = [];
        let rotationEnabled = true;
        let metricsVisible = true;
        
        // Initialize Three.js
        function init3D() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111827);
            
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;
            
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(document.getElementById('three-canvas').clientWidth, document.getElementById('three-canvas').clientHeight);
            document.getElementById('three-canvas').appendChild(renderer.domElement);
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight.position.set(10, 10, 5);
            scene.add(directionalLight);
            
            // Add grid
            const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
            gridHelper.rotation.x = Math.PI / 2;
            scene.add(gridHelper);
            
            animate();
        }
        
        function animate() {
            requestAnimationFrame(animate);
            
            if (rotationEnabled) {
                scene.rotation.y += 0.001;
            }
            
            // Rotate particles
            particles.forEach(particle => {
                if (particle.userData.rotation) {
                    particle.rotation.x += 0.01;
                    particle.rotation.y += 0.01;
                }
            });
            
            renderer.render(scene, camera);
            updateStats();
        }
        
        function createParticle(data) {
            const geometry = new THREE.SphereGeometry(data.size, 16, 16);
            const material = new THREE.MeshPhongMaterial({ 
                color: data.color,
                emissive: data.color,
                emissiveIntensity: 0.2
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(...data.position);
            particle.userData = data;
            particle.userData.rotation = true;
            
            scene.add(particle);
            particles.push(particle);
            
            return particle;
        }
        
        function updateStats() {
            document.getElementById('fps').textContent = Math.round(1000 / (performance.now() - lastTime));
            document.getElementById('object-count').textContent = particles.length;
            lastTime = performance.now();
        }
        
        let lastTime = performance.now();
        
        // WebSocket handlers
        ws.onopen = () => {
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').className = 'text-green-400';
            ws.send(JSON.stringify({ type: 'subscribe', data: 'system-updates' }));
            ws.send(JSON.stringify({ type: 'subscribe', data: 'matrix-updates' }));
            ws.send(JSON.stringify({ type: 'subscribe', data: 'security-alerts' }));
        };
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'system-status':
                    updateSystemStatus(message.data);
                    break;
                case '3d-update':
                    if (message.data.entries) {
                        message.data.entries.forEach(entry => createParticle(entry));
                    }
                    break;
                case 'violation-alert':
                    showAlert(message.data);
                    break;
            }
        };
        
        function updateSystemStatus(data) {
            if (data.matrixStats) {
                document.getElementById('matrix-entries').textContent = data.matrixStats.totalEntries;
                document.getElementById('avg-integrity').textContent = (data.matrixStats.averageIntegrityScore * 100).toFixed(1) + '%';
            }
            
            if (data.report) {
                document.getElementById('violations').textContent = data.report.violations.length;
            }
        }
        
        function showAlert(alert) {
            const alertsContainer = document.getElementById('alerts');
            const alertDiv = document.createElement('div');
            alertDiv.className = 'bg-red-900 bg-opacity-50 p-2 rounded border-l-4 border-red-500';
            alertDiv.innerHTML = \`
                <div class="font-semibold">\${alert.package}</div>
                <div class="text-xs">\${alert.message}</div>
                <div class="text-xs opacity-75">\${new Date(alert.timestamp).toLocaleTimeString()}</div>
            \`;
            alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
            
            // Keep only last 10 alerts
            while (alertsContainer.children.length > 10) {
                alertsContainer.removeChild(alertsContainer.lastChild);
            }
        }
        
        // Control functions
        function toggleRotation() {
            rotationEnabled = !rotationEnabled;
            document.getElementById('rotation-status').textContent = rotationEnabled ? 'ON' : 'OFF';
        }
        
        function resetView() {
            camera.position.set(0, 0, 50);
            camera.rotation.set(0, 0, 0);
            scene.rotation.set(0, 0, 0);
        }
        
        function toggleMetrics() {
            metricsVisible = !metricsVisible;
            document.querySelector('.stats-overlay').style.display = metricsVisible ? 'block' : 'none';
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = document.getElementById('three-canvas').clientWidth / document.getElementById('three-canvas').clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(document.getElementById('three-canvas').clientWidth, document.getElementById('three-canvas').clientHeight);
        });
        
        // Initialize on load
        window.addEventListener('load', () => {
            init3D();
        });
    </script>
</body>
</html>
  `;
}

// Main execution
async function main() {
  const dashboard = new Integrity3DDashboard(3000);
  await startHTTPServer(3001);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await dashboard.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await dashboard.shutdown();
    process.exit(0);
  });
}

if (import.meta.main) {
  main();
}

export { Integrity3DDashboard, startHTTPServer };
