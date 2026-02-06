#!/usr/bin/env bun

// scripts/secrets-field-server.ts - 3D Secret Field API Server

import { SecretsFieldAPI } from '../lib/api/secrets-field-api';
import { WebSocketServer } from 'ws';

// Simple styled text function
function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class SecretsFieldServer {
  private port: number;
  private server: any;
  private wsServer: WebSocketServer;
  private wsConnections: Set<any> = new Set();
  
  constructor(port: number = 3001) {
    this.port = port;
    this.wsServer = new WebSocketServer({ port: port + 1 });
  }
  
  async start(): Promise<void> {
    console.log(styled('🏰 FactoryWager 3D Secret Field API Server', 'primary'));
    console.log(styled('========================================', 'muted'));
    console.log();
    
    // Setup WebSocket server
    this.setupWebSocket();
    
    // Start HTTP server
    this.server = Bun.serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      error: this.handleError.bind(this)
    });
    
    console.log(styled(`🚀 HTTP Server running on port ${this.port}`, 'success'));
    console.log(styled(`🔌 WebSocket Server running on port ${this.port + 1}`, 'success'));
    console.log();
    console.log(styled('📡 Available Endpoints:', 'info'));
    console.log(styled(`   GET  http://localhost:${this.port}/api/secrets/field`, 'muted'));
    console.log(styled(`   POST http://localhost:${this.port}/api/secrets/rotate`, 'muted'));
    console.log(styled(`   WS   ws://localhost:${this.port + 1}/ws/secrets-3d`, 'muted'));
    console.log();
    console.log(styled('💡 Usage Examples:', 'accent'));
    console.log(styled(`   # Get 3D field data`, 'muted'));
    console.log(styled(`   curl http://localhost:${this.port}/api/secrets/field`, 'info'));
    console.log();
    console.log(styled(`   # Rotate secrets`, 'muted'));
    console.log(styled(`   curl -X POST http://localhost:${this.port}/api/secrets/rotate \\`, 'info'));
    console.log(styled(`        -H "Content-Type: application/json" \\`, 'info'));
    console.log(styled(`        -d '{"reason": "security review"}'`, 'info'));
    console.log();
    console.log(styled(`   # WebSocket client`, 'muted'));
    console.log(styled(`   const ws = new WebSocket('ws://localhost:${this.port + 1}/ws/secrets-3d');`, 'info'));
    console.log();
  }
  
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    
    console.log(styled(`📡 ${method} ${path}`, 'muted'));
    
    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      };
      
      // Handle OPTIONS requests for CORS
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Route handling
      if (path === '/api/secrets/field' && method === 'GET') {
        const systemId = url.searchParams.get('systemId') || undefined;
        const fieldData = await SecretsFieldAPI.getField3D(systemId);
        
        return new Response(JSON.stringify(fieldData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (path === '/api/secrets/rotate' && method === 'POST') {
        const body = await request.json();
        const rotationResult = await SecretsFieldAPI.rotateSecrets(body);
        
        return new Response(JSON.stringify(rotationResult, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (path === '/api/health' && method === 'GET') {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '5.1',
          endpoints: {
            field: '/api/secrets/field',
            rotate: '/api/secrets/rotate',
            websocket: `/ws/secrets-3d`
          },
          connections: {
            http: 'active',
            websocket: this.wsConnections.size
          }
        };
        
        return new Response(JSON.stringify(health, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // API Documentation
      if (path === '/api' && method === 'GET') {
        const docs = {
          title: 'FactoryWager 3D Secret Field API',
          version: '5.1',
          endpoints: {
            'GET /api/secrets/field': {
              description: 'Get 3D secret field visualization data',
              parameters: {
                systemId: 'Optional system identifier'
              },
              response: 'Field3DData object with 3D points and metadata'
            },
            'POST /api/secrets/rotate': {
              description: 'Rotate secrets automatically',
              body: {
                secretKey: 'Optional specific secret to rotate',
                force: 'Force rotation even if secret not found',
                reason: 'Reason for rotation',
                requestedBy: 'User or system requesting rotation'
              },
              response: 'RotationResult with rotated secrets and errors'
            },
            'GET /api/health': {
              description: 'Health check endpoint',
              response: 'Health status with connection info'
            },
            'WS /ws/secrets-3d': {
              description: 'WebSocket for live 3D field updates',
              messages: {
                'field-update': 'Compressed 3D field data sent every 5 seconds'
              }
            }
          },
          examples: {
            getField: `curl http://localhost:${this.port}/api/secrets/field`,
            rotateSecrets: `curl -X POST http://localhost:${this.port}/api/secrets/rotate -H "Content-Type: application/json" -d '{"reason": "security review"}'`,
            websocket: `const ws = new WebSocket('ws://localhost:${this.port + 1}/ws/secrets-3d');`
          }
        };
        
        return new Response(JSON.stringify(docs, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // 404 for unknown routes
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${method} ${path} not found`,
        availableEndpoints: [
          'GET /api/secrets/field',
          'POST /api/secrets/rotate',
          'GET /api/health',
          'GET /api',
          'WS /ws/secrets-3d'
        ]
      }, null, 2), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      console.error(styled(`❌ Request error: ${error.message}`, 'error'));
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  private handleError(error: Error): Response {
    console.error(styled('💥 Server error:', 'error'), error.message);
    
    return new Response(JSON.stringify({
      error: 'Server Error',
      message: 'Internal server error occurred',
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  private setupWebSocket(): void {
    console.log(styled('🔌 Setting up WebSocket server...', 'info'));
    
    this.wsServer.on('connection', (ws, request) => {
      const url = new URL(request.url || '/', 'http://localhost');
      
      // Only handle secrets-3d endpoint
      if (url.pathname !== '/ws/secrets-3d') {
        ws.close(1000, 'Endpoint not found');
        return;
      }
      
      console.log(styled('🔗 WebSocket client connected', 'success'));
      this.wsConnections.add(ws);
      
      // Extract system ID from query params
      const systemId = url.searchParams.get('systemId') || 'default';
      
      // Create field WebSocket for this client
      const fieldWS = SecretsFieldAPI.createFieldWebSocket(systemId);
      
      // Send initial data
      fieldWS.sendUpdate();
      
      // Handle client messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscribe') {
            console.log(styled('📡 Client subscribed to updates', 'info'));
            fieldWS.onMessage((update) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(update));
              }
            });
          } else if (message.type === 'unsubscribe') {
            console.log(styled('📡 Client unsubscribed', 'info'));
            fieldWS.close();
          } else if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error(styled('❌ WebSocket message error:', 'error'), error.message);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(styled('🔌 WebSocket client disconnected', 'warning'));
        this.wsConnections.delete(ws);
        fieldWS.close();
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(styled('❌ WebSocket error:', 'error'), error.message);
        this.wsConnections.delete(ws);
        fieldWS.close();
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        systemId,
        message: 'Connected to FactoryWager 3D Secret Field API',
        timestamp: new Date().toISOString(),
        endpoints: {
          field: `http://localhost:${this.port}/api/secrets/field`,
          rotate: `http://localhost:${this.port}/api/secrets/rotate`
        }
      }));
    });
    
    this.wsServer.on('error', (error) => {
      console.error(styled('❌ WebSocket server error:', 'error'), error.message);
    });
  }
  
  async stop(): Promise<void> {
    console.log(styled('🛑 Shutting down servers...', 'warning'));
    
    // Close all WebSocket connections
    this.wsConnections.forEach(ws => {
      ws.close(1000, 'Server shutting down');
    });
    
    // Close WebSocket server
    this.wsServer.close();
    
    // Stop HTTP server
    if (this.server) {
      this.server.stop();
    }
    
    console.log(styled('✅ Servers stopped', 'success'));
  }
}

// Parse command line arguments
const args = Bun.argv.slice(2);
let port = 3001;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[++i]);
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(styled('🏰 FactoryWager 3D Secret Field API Server', 'primary'));
    console.log(styled('========================================', 'muted'));
    console.log();
    console.log(styled('Usage:', 'info'));
    console.log('  bun run scripts/secrets-field-server.ts [options]');
    console.log();
    console.log(styled('Options:', 'info'));
    console.log('  --port <number>  Port for HTTP server (default: 3001)');
    console.log('  --help, -h       Show this help');
    console.log();
    console.log(styled('API Endpoints:', 'accent'));
    console.log('  GET  /api/secrets/field    3D field JSON data');
    console.log('  POST /api/secrets/rotate   Auto-rotate secrets');
    console.log('  WS   /ws/secrets-3d        Live field updates');
    console.log('  GET  /api/health           Health check');
    console.log('  GET  /api                  API documentation');
    console.log();
    console.log(styled('📚 Documentation:', 'accent'));
    console.log('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
    console.log('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
    process.exit(0);
  }
}

// Start the server
const server = new SecretsFieldServer(port);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log();
  console.log(styled('🛑 Received SIGINT, shutting down gracefully...', 'warning'));
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log();
  console.log(styled('🛑 Received SIGTERM, shutting down gracefully...', 'warning'));
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch(error => {
  console.error(styled('❌ Failed to start server:', 'error'), error.message);
  process.exit(1);
});
