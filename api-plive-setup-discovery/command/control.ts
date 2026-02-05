// command/control.ts - CCS nerve center
// Central Command Station v3.1: Total Oversight via bun.yaml + WebSocket Hub

import { serve, file, YAML, CookieMap } from 'bun';
import { startETL } from '../etl/stream';
import { stageDeploy } from '../staging/manager';

// Load configuration from bun.yaml
const config = YAML.parse(await file('bun.yaml').text());
const { ccs, staging } = config.command;
const { auth } = config.api;

// Command types enum
const COMMAND_TYPES = ccs.schema.commandTypes;
const PRIORITY_LEVELS = ccs.schema.priority;
const NODE_ID_PATTERN = new RegExp(ccs.schema.nodeId.pattern);

// WebSocket connection tracking
interface WSConnectionData {
  nodeId: string;
  userId: string;
  commandType: string;
  lastHeartbeat: number;
  connectedAt: number;
}

// Simple JWT verification
async function verifyJWT(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Verify CSRF token
async function verifyCSRF(token: string, expectedSecret?: string): Promise<boolean> {
  // TODO: Use Bun.secrets.get() for actual secret verification
  // For now, validate token format
  return token && token.length >= 32;
}

// Validate command against schema
function validateCommand(cmd: any): { valid: boolean; error?: string } {
  if (!cmd || typeof cmd !== 'object') {
    return { valid: false, error: 'Invalid command format' };
  }

  if (!COMMAND_TYPES.includes(cmd.type)) {
    return { valid: false, error: `Invalid command type. Must be one of: ${COMMAND_TYPES.join(', ')}` };
  }

  if (cmd.nodeId && !NODE_ID_PATTERN.test(cmd.nodeId)) {
    return { valid: false, error: `Invalid node ID format. Must match: ${ccs.schema.nodeId.pattern}` };
  }

  if (cmd.priority && !PRIORITY_LEVELS.includes(cmd.priority)) {
    return { valid: false, error: `Invalid priority. Must be one of: ${PRIORITY_LEVELS.join(', ')}` };
  }

  return { valid: true };
}

// Dispatch command to appropriate handler
export async function dispatchCommand(cmd: any, user: any): Promise<Response> {
  const startTime = performance.now();

  try {
    const validation = validateCommand(cmd);
    if (!validation.valid) {
      return new Response(YAML.stringify({
        status: 'ERROR',
        error: validation.error,
        command: cmd.type
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/yaml',
          'X-CCS-Error': validation.error || 'Validation failed'
        }
      });
    }

    let result: any;

    switch (cmd.type) {
      case 'CONFIG':
        // Store config in registry
        result = await storeConfig(cmd.payload, cmd.nodeId);
        break;

      case 'TELEMETRY':
        // Forward to telemetry handler
        result = await handleTelemetry(cmd.payload, cmd.nodeId);
        break;

      case 'ETL':
        // Trigger ETL pipeline
        const stream = await startETL(null, cmd.payload, cmd.dataType || 'JSON');
        result = {
          status: 'ETL_STARTED',
          streamId: `etl_${Date.now()}`,
          dataType: cmd.dataType || 'JSON'
        };
        break;

      case 'ALERT':
        // Broadcast alert
        result = await broadcastAlert(cmd.payload, cmd.nodeId);
        break;

      case 'DEPLOY':
        // Stage deployment
        result = await stageDeploy(cmd.payload);
        break;

      default:
        return new Response(YAML.stringify({
          status: 'ERROR',
          error: `Unsupported command type: ${cmd.type}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/yaml' }
        });
    }

    const duration = performance.now() - startTime;

    return new Response(YAML.stringify({
      status: 'OK',
      command: cmd.type,
      nodeId: cmd.nodeId,
      result: result,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml',
        'X-CCS-Duration': `${duration.toFixed(2)}ms`,
        'Content-Encoding': 'zstd' // Indicate compression support
      }
    });

  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error(`❌ Command dispatch error:`, error);

    return new Response(YAML.stringify({
      status: 'ERROR',
      error: error.message || 'Command execution failed',
      command: cmd.type,
      duration: `${duration.toFixed(2)}ms`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/yaml',
        'X-CCS-Duration': `${duration.toFixed(2)}ms`
      }
    });
  }
}

// Store config in registry (mock implementation)
async function storeConfig(payload: any, nodeId?: string): Promise<any> {
  // TODO: Integrate with actual registry
  const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📦 Storing config ${configId} for node ${nodeId || 'GOV-0000'}`);
  
  return {
    id: configId,
    nodeId: nodeId || 'GOV-0000',
    stored: true,
    format: 'yaml'
  };
}

// Handle telemetry command
async function handleTelemetry(payload: any, nodeId?: string): Promise<any> {
  console.log(`📡 Processing telemetry for node ${nodeId || 'GOV-0000'}`);
  
  return {
    processed: true,
    nodeId: nodeId || 'GOV-0000',
    timestamp: new Date().toISOString()
  };
}

// Broadcast alert
async function broadcastAlert(payload: any, nodeId?: string): Promise<any> {
  // TODO: Integrate with WebSocket broadcast system
  console.log(`🚨 Broadcasting alert from node ${nodeId || 'GOV-0000'}`);
  
  return {
    broadcast: true,
    nodeId: nodeId || 'GOV-0000',
    alertId: `alert_${Date.now()}`
  };
}

// Log node disconnect
async function logNodeDisconnect(nodeId: string): Promise<void> {
  console.log(`🔌 Node ${nodeId} disconnected`);
  // TODO: Log to audit system
}

// Main server
const server = serve<WSConnectionData>({
  port: 3003,
  fetch: async (req, server) => {
    const url = new URL(req.url);

    // CCS REST endpoint
    if (url.pathname === ccs.endpoint) {
      // Extract cookies
      const cookies = new CookieMap(req.headers.get('Cookie') || '');
      const gsession = cookies.get('gsession');
      const csrfToken = cookies.get('csrfToken');

      // Verify JWT
      if (!gsession) {
        return new Response(YAML.stringify({
          status: 'ERROR',
          error: 'Missing authentication cookie'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/yaml' }
        });
      }

      const user = await verifyJWT(gsession);
      if (!user) {
        return new Response(YAML.stringify({
          status: 'ERROR',
          error: 'Invalid or expired token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/yaml' }
        });
      }

      // Verify CSRF for POST/PUT/DELETE
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const body = await req.json().catch(() => ({}));
        const bodyCsrf = body.csrf || csrfToken;

        if (!bodyCsrf || !(await verifyCSRF(bodyCsrf))) {
          return new Response(YAML.stringify({
            status: 'ERROR',
            error: 'Invalid CSRF token'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/yaml' }
          });
        }
      }

      // Handle command dispatch
      if (req.method === 'POST') {
        const body = await req.json();
        return await dispatchCommand(body, user);
      }

      return new Response(YAML.stringify({
        status: 'ERROR',
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/yaml' }
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws/command.all') {
      const cookies = new CookieMap(req.headers.get('Cookie') || '');
      const gsession = cookies.get('gsession');

      if (!gsession) {
        return new Response('Missing authentication', { status: 401 });
      }

      const user = await verifyJWT(gsession);
      if (!user) {
        return new Response('Invalid token', { status: 401 });
      }

      const upgraded = server.upgrade(req, {
        data: {
          nodeId: 'GOV-0000',
          userId: user.userId || user.id,
          commandType: '',
          lastHeartbeat: Date.now(),
          connectedAt: Date.now()
        },
        headers: {
          'Sec-WebSocket-Protocol': 'dashboard-v1.3+command'
        }
      });

      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    async open(ws) {
      ws.subscribe('command.all');
      
      ws.send(YAML.stringify({
        type: 'WELCOME',
        nodeId: ws.data.nodeId,
        message: 'Connected to Central Command Station',
        timestamp: new Date().toISOString()
      }));

      console.log(`🟢 CCS WebSocket connected: ${ws.data.nodeId} (user: ${ws.data.userId})`);
    },

    async message(ws, msg) {
      try {
        let data: any;

        // Parse message (JSON, YAML, or binary)
        if (typeof msg === 'string') {
          try {
            data = JSON.parse(msg);
          } catch {
            data = YAML.parse(msg);
          }
        } else {
          // Binary message - decode
          const decoder = new TextDecoder();
          const text = decoder.decode(msg);
          try {
            data = JSON.parse(text);
          } catch {
            data = YAML.parse(text);
          }
        }

        // Handle heartbeat
        if (data.type === 'PONG') {
          ws.data.lastHeartbeat = Date.now();
          return;
        }

        // Handle command
        if (COMMAND_TYPES.includes(data.type)) {
          const validation = validateCommand(data);
          if (!validation.valid) {
            ws.send(YAML.stringify({
              type: 'ERROR',
              error: validation.error,
              command: data.type
            }));
            return;
          }

          // Dispatch command
          const result = await dispatchCommand(data, { userId: ws.data.userId, nodeId: ws.data.nodeId });

          // Acknowledge via WebSocket
          ws.publish('command.all', YAML.stringify({
            type: 'ACK',
            command: data.type,
            nodeId: ws.data.nodeId,
            timestamp: new Date().toISOString()
          }));

          ws.send(YAML.stringify({
            type: 'COMMAND_RESPONSE',
            command: data.type,
            status: 'OK'
          }));
        }

      } catch (error: any) {
        ws.send(YAML.stringify({
          type: 'ERROR',
          error: error.message || 'Invalid message format'
        }));
      }
    },

    async close(ws) {
      ws.unsubscribe('command.all');
      await logNodeDisconnect(ws.data.nodeId);
      console.log(`🔌 CCS WebSocket disconnected: ${ws.data.nodeId}`);
    }
  }
});

console.log(`🚀 Central Command Station (CCS) listening on port ${server.port}`);
console.log(`   REST: ${ccs.endpoint}`);
console.log(`   WebSocket: ws://localhost:${server.port}/ws/command.all`);
console.log(`   Command Types: ${COMMAND_TYPES.join(', ')}`);
console.log(`   Node Pattern: ${ccs.schema.nodeId.pattern}`);

